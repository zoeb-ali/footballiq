"""Local ONNX embedder (rag-design §5).

Same model as before (BAAI/bge-small-en-v1.5, 384-dim, normalized), served
through fastembed's ONNX runtime instead of sentence-transformers + PyTorch.
PyTorch alone needed more RAM than Render's 512 MB free instance, which made
the first analyst question OOM-kill the API; the ONNX runtime runs the same
weights in a fraction of that. The model loads lazily on first embed so
importing this module (and running the test suite) never pulls the dependency.
Unit tests use a fake Embedder.
"""

from __future__ import annotations

from typing import Any

_MODEL_NAME = "BAAI/bge-small-en-v1.5"
_MODEL_VERSION = "bge-small-en-v1.5"
_DIM = 384


class OnnxEmbedder:
    """Embedder port backed by fastembed (ONNX runtime, loaded on first use).

    ``threads=1`` keeps the inference arena small; one short question per call
    gains nothing from parallelism on a shared free-tier CPU.
    """

    def __init__(self, model_name: str = _MODEL_NAME, *, threads: int = 1) -> None:
        self._model_name = model_name
        self._threads = threads
        self._model: Any = None

    @property
    def model_version(self) -> str:
        return _MODEL_VERSION

    @property
    def dim(self) -> int:
        return _DIM

    def _load(self) -> Any:
        if self._model is None:
            from fastembed import TextEmbedding

            self._model = TextEmbedding(model_name=self._model_name, threads=self._threads)
        return self._model

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        model = self._load()
        # fastembed returns L2-normalized vectors for bge models, so cosine ==
        # dot product, matching how the pgvector store searches.
        return [[float(x) for x in row] for row in model.embed(texts, batch_size=16)]
