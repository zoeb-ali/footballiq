"""Analyst (RAG) endpoint: POST /v1/analyst/ask (rag-design §1).

Single-turn, grounded, cited. Numbers come from executed SQL; retrieval adds
definitional context. Same API-key auth as the rest of the platform.
"""

from __future__ import annotations

import threading
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request

from footballiq.api.schemas import AnalystResponse, AskRequest
from footballiq.application.rag.pipeline import AnalystService

router = APIRouter(prefix="/v1/analyst", tags=["analyst"])

# One question at a time per process. The first question loads the embedding
# model; parallel first questions would each try to, which is exactly how a
# small instance runs out of memory. Extra callers get a fast 503 + Retry-After
# instead of queueing behind (or crashing) the one in flight.
_IN_FLIGHT = threading.BoundedSemaphore(1)


def get_analyst(request: Request) -> AnalystService:
    service: AnalystService = request.app.state.analyst_service
    return service


@router.post("/ask", response_model=AnalystResponse)
def ask(
    body: AskRequest,
    service: Annotated[AnalystService, Depends(get_analyst)],
) -> AnalystResponse:
    """Answer one question from stored data + indexed docs, grounded and cited."""
    if not _IN_FLIGHT.acquire(blocking=False):
        raise HTTPException(
            status_code=503,
            detail="the analyst is answering another question; retry in a few seconds",
            headers={"Retry-After": "5"},
        )
    try:
        return AnalystResponse.from_answer(service.ask(body.question))
    finally:
        _IN_FLIGHT.release()
