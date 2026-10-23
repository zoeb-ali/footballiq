"""Retrievers (rag-design §2): semantic by default, keyword as a safety net.

``SemanticRetriever`` embeds the question and searches pgvector. The model
loads lazily inside the embedder, so constructing it is cheap (safe to wire at
API startup).

``KeywordRetriever`` ranks the same ai.document_chunk rows with Postgres
full-text search. It needs no model and no extra memory, so it is the mode to
run on a host that cannot afford an embedding model (FIQ_ANALYST_RETRIEVAL=
keyword), and the automatic fallback if the embedder fails to load.

Retrieval only supplies definitional context; every number in an answer still
comes from executed SQL, so the fallback changes wording, never facts.
"""

from __future__ import annotations

import logging

from sqlalchemy import Engine, text

from footballiq.application.rag.ports import ChunkStore, Embedder, RetrievedChunk

log = logging.getLogger(__name__)


class KeywordRetriever:
    """Retriever port over ai.document_chunk using Postgres full-text search."""

    def __init__(self, engine: Engine, *, schema: str = "ai") -> None:
        self._engine = engine
        self._schema = schema

    def retrieve(self, question: str, *, k: int) -> list[RetrievedChunk]:
        sql = text(
            f"""
            SELECT chunk_id, content, source_path, section,
                   ts_rank_cd(to_tsvector('english', content), q) AS score
            FROM {self._schema}.document_chunk,
                 websearch_to_tsquery('english', :question) AS q
            WHERE to_tsvector('english', content) @@ q
            ORDER BY score DESC
            LIMIT :k
            """
        )
        with self._engine.connect() as conn:
            rows = conn.execute(sql, {"question": question, "k": k}).all()
        return [
            RetrievedChunk(
                chunk_id=str(r[0]),
                content=str(r[1]),
                source_path=str(r[2]),
                section=str(r[3]),
                score=float(r[4]),
            )
            for r in rows
        ]


class SemanticRetriever:
    """Retriever port backed by a local embedder + pgvector store.

    If the embedder cannot load (missing dependency, memory pressure), the
    question falls through to ``fallback`` instead of failing the request.
    """

    def __init__(
        self,
        embedder: Embedder,
        store: ChunkStore,
        *,
        fallback: KeywordRetriever | None = None,
    ) -> None:
        self._embedder = embedder
        self._store = store
        self._fallback = fallback

    def retrieve(self, question: str, *, k: int) -> list[RetrievedChunk]:
        try:
            vector = self._embedder.embed([question])[0]
        except (ImportError, MemoryError, OSError, RuntimeError) as exc:
            if self._fallback is None:
                raise
            log.warning("embedder unavailable (%s); using keyword retrieval", exc)
            return self._fallback.retrieve(question, k=k)
        return self._store.search(vector, k=k)
