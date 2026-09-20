import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

_model = None

def get_embedding_model():
    """Load the sentence-transformer model on first call (lazy init)."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        logger.info("Loading sentence-transformer model: %s ...", settings.EMBEDDING_MODEL)
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
        logger.info("Model loaded successfully.")
    return _model

def get_embeddings(texts: list[str], batch_size: int = 64):
    if not texts:
        return []
    model = get_embedding_model()
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True,
    )
    return embeddings
