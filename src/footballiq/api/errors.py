"""RFC 7807 problem+json error handling (backend design §5)."""

from __future__ import annotations

import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

_MEDIA_TYPE = "application/problem+json"
log = logging.getLogger("footballiq.api")


def _problem(
    status: int, title: str, detail: str, *, correlation_id: str | None = None
) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        media_type=_MEDIA_TYPE,
        content={
            "type": "about:blank",
            "title": title,
            "status": status,
            "detail": detail,
            "correlation_id": correlation_id or str(uuid.uuid4()),
        },
    )


def register_error_handlers(app: FastAPI) -> None:
    """Install problem+json handlers for HTTP, validation, and unexpected errors."""

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        resp = _problem(exc.status_code, exc.detail or "HTTP error", str(exc.detail))
        if exc.headers:
            resp.headers.update(exc.headers)
        return resp

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        return _problem(422, "Validation failed", str(exc.errors()[:3]))

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        # Opaque by design: detail stays server-side, correlation id goes out
        # and is logged with the traceback so a reported id can be traced.
        cid = str(uuid.uuid4())
        log.exception("unhandled error %s on %s %s", cid, request.method, request.url.path,
                      exc_info=exc)
        return _problem(
            500, "Internal server error", "unexpected error (see logs)", correlation_id=cid
        )
