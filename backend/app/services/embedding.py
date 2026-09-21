import logging
import time
import httpx
import numpy as np
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

def _get_embeddings_hf_api(texts: list[str]) -> np.ndarray:
    """Fetch embeddings from Hugging Face Inference API."""
    model_id = settings.EMBEDDING_MODEL
    url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/{model_id}"
    headers = {"Authorization": f"Bearer {settings.HF_API_TOKEN}"}
    
    # Retry mechanism for cold starts
    max_retries = 3
    for attempt in range(max_retries):
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(url, headers=headers, json={"inputs": texts})
            
            if response.status_code == 200:
                return np.array(response.json())
            elif response.status_code == 503:
                # Model is loading (cold start)
                logger.info("HF API Model is loading (cold start). Waiting 10 seconds...")
                time.sleep(10)
                continue
            else:
                logger.error(f"HF API Error {response.status_code}: {response.text}")
                break
        except Exception as e:
            logger.error(f"HF API Network Error: {e}")
            break
            
    logger.warning("HF API failed, falling back to local model loading.")
    return _get_embeddings_local(texts)

def _get_embeddings_local(texts: list[str], batch_size: int = 64) -> np.ndarray:
    model = get_embedding_model()
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True,
    )
    return embeddings

def get_embeddings(texts: list[str], batch_size: int = 64):
    if not texts:
        return []
    
    if settings.HF_API_TOKEN:
        return _get_embeddings_hf_api(texts)
    else:
        return _get_embeddings_local(texts, batch_size)
