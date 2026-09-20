"""
Pydantic schemas for API request/response validation.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared / Base
# ---------------------------------------------------------------------------
class TextInput(BaseModel):
    """Direct text input for analysis."""
    text: str = Field(..., min_length=10, description="The text to check for plagiarism")
    filename: str = Field(default="pasted_text.txt", description="Display name")
    add_to_repository: bool = Field(default=True, description="Whether to index this submission into the reference repository")


# ---------------------------------------------------------------------------
# Document schemas
# ---------------------------------------------------------------------------
class DocumentOut(BaseModel):
    id: uuid.UUID
    filename: str
    word_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentListOut(BaseModel):
    documents: list[DocumentOut]
    total: int


# ---------------------------------------------------------------------------
# Finding schemas
# ---------------------------------------------------------------------------
class FindingOut(BaseModel):
    id: uuid.UUID
    chunk_index: int
    chunk_text: str
    source_text: Optional[str] = None
    source_name: Optional[str] = None
    similarity_score: float
    tfidf_score: Optional[float] = 0.0
    semantic_score: Optional[float] = 0.0
    match_type: str
    flag_reason: Optional[str] = None
    is_quoted: bool
    start_char: Optional[int] = None
    end_char: Optional[int] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Analysis schemas
# ---------------------------------------------------------------------------
class AnalysisOut(BaseModel):
    id: uuid.UUID
    filename: str
    original_text: Optional[str] = None
    overall_score: Optional[float] = None
    originality_score: Optional[float] = None
    total_chunks: int
    flagged_chunks: int
    status: str
    error_message: Optional[str] = None
    progress: Optional[float] = 0.0
    progress_message: Optional[str] = None
    tiers_used: Optional[dict] = None
    tier_stats: Optional[dict] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    findings: list[FindingOut] = []

    class Config:
        from_attributes = True


class AnalysisSummaryOut(BaseModel):
    """Lightweight version for list views (no findings)."""
    id: uuid.UUID
    filename: str
    overall_score: Optional[float] = None
    originality_score: Optional[float] = None
    total_chunks: int
    flagged_chunks: int
    status: str
    progress: Optional[float] = 0.0
    progress_message: Optional[str] = None
    tiers_used: Optional[dict] = None
    tier_stats: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AnalysisStatusOut(BaseModel):
    """Lightweight schema for the progress-polling endpoint."""
    id: uuid.UUID
    status: str
    progress: float
    progress_message: Optional[str] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class AnalysisListOut(BaseModel):
    analyses: list[AnalysisSummaryOut]
    total: int


# ---------------------------------------------------------------------------
# Source aggregation (for the "Sources" tab)
# ---------------------------------------------------------------------------
class SourceSummary(BaseModel):
    source_name: str
    match_count: int
    avg_similarity: float
    max_similarity: float
    match_types: list[str]


class SourcesOut(BaseModel):
    sources: list[SourceSummary]
