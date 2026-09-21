"""
SQLAlchemy async models and database session management.
Supports PostgreSQL (via asyncpg) with graceful SQLite fallback if PostgreSQL is offline.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Float, Text, DateTime, Boolean, ForeignKey, Integer, Uuid, JSON, Index
)
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base, relationship
from pgvector.sqlalchemy import Vector

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Engine & session factory
# ---------------------------------------------------------------------------
Base = declarative_base()

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class User(Base):
    """An authenticated user of Veritas AI."""
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(32), default="user")  # user | admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    def __repr__(self) -> str:
        return f"<User {self.email}>"


class Document(Base):
    """A reference document stored in the corpus."""
    __tablename__ = "documents"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    filename = Column(String(512), nullable=False)
    content_hash = Column(String(64), nullable=False, index=True, unique=True)
    text_content = Column(Text, nullable=False)
    word_count = Column(Integer, nullable=False, default=0)
    owner_id = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    def __repr__(self) -> str:
        return f"<Document {self.filename}>"


class ReferenceChunk(Base):
    """A pre-chunked passage from a reference document with its semantic embedding."""
    __tablename__ = "reference_chunks"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    document_id = Column(Uuid, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    embedding = Column(Vector(384))  # matches all-MiniLM-L6-v2 dimension

    document = relationship("Document", backref="chunks")

    __table_args__ = (
        Index('hnsw_index_for_innerproduct', embedding,
              postgresql_using='hnsw',
              postgresql_with={'m': 16, 'ef_construction': 64},
              postgresql_ops={'embedding': 'vector_cosine_ops'}),
    )

    def __repr__(self) -> str:
        return f"<ReferenceChunk {self.document_id} #{self.chunk_index}>"


class Analysis(Base):
    """A plagiarism analysis run on an uploaded document."""
    __tablename__ = "analyses"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    filename = Column(String(512), nullable=False)
    original_text = Column(Text, nullable=False)
    overall_score = Column(Float, nullable=True)
    originality_score = Column(Float, nullable=True)
    total_chunks = Column(Integer, default=0)
    flagged_chunks = Column(Integer, default=0)
    status = Column(String(32), default="pending")  # pending | processing | completed | failed
    error_message = Column(Text, nullable=True)
    progress = Column(Float, default=0.0)  # 0-100 real-time progress percentage
    progress_message = Column(String(256), nullable=True)
    tiers_used = Column(JSON, nullable=True)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    findings = relationship("Finding", back_populates="analysis", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Analysis {self.filename} score={self.overall_score}>"


class Finding(Base):
    """A single flagged passage within an analysis."""
    __tablename__ = "findings"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    analysis_id = Column(Uuid, ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    source_text = Column(Text, nullable=True)
    source_name = Column(String(1024), nullable=True)
    similarity_score = Column(Float, nullable=False)
    tfidf_score = Column(Float, nullable=True, default=0.0)       # raw Tier 1 lexical score
    semantic_score = Column(Float, nullable=True, default=0.0)     # raw Tier 2 semantic score
    match_type = Column(String(32), nullable=False)  # exact | paraphrase | web
    flag_reason = Column(Text, nullable=True)                      # human-readable forensic explanation
    is_quoted = Column(Boolean, default=False)
    start_char = Column(Integer, nullable=True)
    end_char = Column(Integer, nullable=True)

    analysis = relationship("Analysis", back_populates="findings")

    def __repr__(self) -> str:
        return f"<Finding {self.match_type} score={self.similarity_score:.2f}>"


class WebSearchCache(Base):
    """Cache for Tavily web search results to save API quota and ensure reproducibility."""
    __tablename__ = "web_search_cache"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    query_hash = Column(String(64), nullable=False, index=True, unique=True)  # SHA-256 of normalized query
    query_text = Column(Text, nullable=False)
    response_data = Column(JSON, nullable=False)  # Full Tavily response
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    def __repr__(self) -> str:
        return f"<WebSearchCache {self.query_hash[:12]}...>"


# ---------------------------------------------------------------------------
# Database initialization with dynamic engine fallback
# ---------------------------------------------------------------------------
engine = None
async_session = None

def _create_engine_for_url(db_url: str):
    if db_url.startswith("sqlite"):
        return create_async_engine(db_url, echo=False)
    return create_async_engine(db_url, echo=False, pool_size=10, max_overflow=20)

engine = _create_engine_for_url(settings.DATABASE_URL)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def init_db() -> None:
    """Initialize DB tables, with automatic fallback if PostgreSQL is unavailable."""
    global engine, async_session

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Successfully connected to primary database (%s).", settings.DATABASE_URL.split("@")[-1])
    except Exception as e:
        logger.warning(
            "Primary database connection failed: %s. "
            "Falling back to local SQLite async database at data/plagiarism_checker.db",
            e,
        )
        sqlite_path = settings.BASE_DIR / "data" / "plagiarism_checker.db"
        sqlite_url = f"sqlite+aiosqlite:///{sqlite_path}"
        engine = create_async_engine(sqlite_url, echo=False)
        async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Local SQLite database initialized at %s.", sqlite_path)


async def get_session() -> AsyncSession:
    """FastAPI dependency that yields an active database session."""
    async with async_session() as session:
        yield session
