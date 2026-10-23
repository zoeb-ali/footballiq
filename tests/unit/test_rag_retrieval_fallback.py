"""Retrieval resilience: the analyst must never take the API down with it.

Covers the semantic -> keyword fallback, the one-question-at-a-time guard on
the endpoint, and the FIQ_ANALYST_RETRIEVAL switch.
"""

# ruff: noqa: ARG002  (fakes implement port signatures they do not use)

import hashlib
import threading
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from footballiq.api.main import create_app
from footballiq.application.rag.ports import AnalystAnswer, RetrievedChunk
from footballiq.infrastructure.ai.retriever import KeywordRetriever, SemanticRetriever
from footballiq.infrastructure.config import Settings, load_settings

_HIT = RetrievedChunk("c1", "Elo is a rating", "docs/glossary.md", "Elo", 0.5)


class _BrokenEmbedder:
    model_version = "x"
    dim = 384

    def embed(self, texts: list[str]) -> list[list[float]]:
        raise MemoryError("model does not fit")


class _OkEmbedder:
    model_version = "x"
    dim = 384

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [[0.0] * 384 for _ in texts]


class _Store:
    def __init__(self) -> None:
        self.searched = False

    def search(self, embedding: list[float], *, k: int) -> list[RetrievedChunk]:
        self.searched = True
        return [_HIT]


class _Keyword(KeywordRetriever):
    def __init__(self) -> None:  # no engine needed for the fake
        self.calls = 0

    def retrieve(self, question: str, *, k: int) -> list[RetrievedChunk]:
        self.calls += 1
        return [_HIT]


def test_semantic_uses_store_when_embedder_works() -> None:
    store, kw = _Store(), _Keyword()
    hits = SemanticRetriever(_OkEmbedder(), store, fallback=kw).retrieve("q", k=3)  # type: ignore[arg-type]
    assert hits == [_HIT] and store.searched and kw.calls == 0


def test_semantic_falls_back_to_keyword_when_model_fails() -> None:
    store, kw = _Store(), _Keyword()
    hits = SemanticRetriever(_BrokenEmbedder(), store, fallback=kw).retrieve("q", k=3)  # type: ignore[arg-type]
    assert hits == [_HIT] and not store.searched and kw.calls == 1


def test_semantic_without_fallback_still_raises() -> None:
    with pytest.raises(MemoryError):
        SemanticRetriever(_BrokenEmbedder(), _Store()).retrieve("q", k=3)  # type: ignore[arg-type]


def test_retrieval_mode_switch(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FIQ_ANALYST_RETRIEVAL", "Keyword")
    assert load_settings(tmp_path / "none.env").analyst_retrieval == "keyword"
    monkeypatch.delenv("FIQ_ANALYST_RETRIEVAL")
    assert load_settings(tmp_path / "none.env").analyst_retrieval == "semantic"
    monkeypatch.setenv("FIQ_ANALYST_RETRIEVAL", "gpu")
    with pytest.raises(ValueError):
        load_settings(tmp_path / "none.env")


def test_keyword_mode_wires_keyword_retriever() -> None:
    app = create_app(
        Settings(database_url="sqlite://", data_dir=Path("x"), analyst_retrieval="keyword")
    )
    assert isinstance(app.state.analyst_service._retriever, KeywordRetriever)


def test_second_concurrent_question_gets_503_with_retry_after() -> None:
    key = "k"
    started, release = threading.Event(), threading.Event()

    class _SlowAnalyst:
        def ask(self, question: str) -> AnalystAnswer:
            started.set()
            release.wait(5)
            return AnalystAnswer(question=question, route="kpi", answer="ok", grounded=True)

    app = create_app(
        Settings(
            database_url="sqlite://",
            data_dir=Path("x"),
            api_key_hashes=(hashlib.sha256(key.encode()).hexdigest(),),
        )
    )
    app.state.analyst_service = _SlowAnalyst()
    client = TestClient(app)
    auth = {"X-API-Key": key}
    first: dict[str, int] = {}

    def _ask() -> None:
        first["status"] = client.post(
            "/v1/analyst/ask", json={"question": "a"}, headers=auth
        ).status_code

    t = threading.Thread(target=_ask)
    t.start()
    assert started.wait(5)
    second = client.post("/v1/analyst/ask", json={"question": "b"}, headers=auth)
    release.set()
    t.join(5)
    assert second.status_code == 503
    assert second.headers["retry-after"] == "5"
    assert first["status"] == 200
