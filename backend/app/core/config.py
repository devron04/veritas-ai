"""
Application configuration loaded from environment variables.
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with defaults and env-var overrides."""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/plagiarism_checker"

    # Tavily web search (optional)
    TAVILY_API_KEY: str = ""

    # Sentence-transformer model
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # Similarity thresholds
    PLAGIARISM_THRESHOLD: float = 0.80   # >= 80% → plagiarized
    SUSPICIOUS_THRESHOLD: float = 0.50   # >= 50% → suspicious
    COMMON_PHRASE_FREQ: float = 0.70     # phrase in >70% docs → common
    SHORT_PHRASE_THRESHOLD: float = 0.90  # short phrases need >90%
    SHORT_PHRASE_WORDS: int = 5           # "short" = fewer than 5 words

    # Chunking
    CHUNK_SENTENCE_WINDOW: int = 3       # sentences per chunk
    CHUNK_OVERLAP: int = 1               # overlap between chunks
    BATCH_SIZE: int = 100                # chunks per processing batch

    # Detection weights
    TFIDF_WEIGHT: float = 0.60
    SEMANTIC_WEIGHT: float = 0.40
    TFIDF_CANDIDATE_THRESHOLD: float = 0.40  # min TF-IDF score to be a candidate

    # Web search settings (Phase 2a)
    WEB_SEARCH_MAX_RESULTS: int = 5
    WEB_SEARCH_TIMEOUT: float = 30.0
    WEB_SEARCH_CHUNK_CAP: int = 50  # max web page chunks to compare

    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "data" / "uploads"
    REFERENCE_DIR: Path = BASE_DIR / "data" / "references"
    REPORT_DIR: Path = BASE_DIR / "data" / "reports"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def ensure_dirs(self) -> None:
        """Create data directories if they don't exist."""
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        self.REFERENCE_DIR.mkdir(parents=True, exist_ok=True)
        self.REPORT_DIR.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_dirs()
