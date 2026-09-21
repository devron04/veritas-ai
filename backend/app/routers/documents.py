"""
Documents router — manage reference documents in the corpus.
"""
from __future__ import annotations

import hashlib
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import Document, ReferenceChunk, User, get_session
from app.routers.auth import get_current_user
from app.schemas.schemas import DocumentListOut, DocumentOut
from app.services.parser import extract_text
from app.services.chunker import chunk_text
from app.services.embedding import get_embeddings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/documents", tags=["documents"])


def _sanitize_text(value: str | None) -> str | None:
    """Strip null bytes that PostgreSQL rejects in text/varchar columns."""
    if value is None:
        return None
    return value.replace("\x00", "")


@router.post("", response_model=DocumentOut, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_current_user),
):
    """Upload a reference document to the corpus."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    allowed = {".pdf", ".docx", ".txt"}
    suffix = Path(file.filename).suffix.lower()
    if suffix not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: '{suffix}'. Allowed: {', '.join(allowed)}",
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Extract text
    try:
        text = extract_text(file_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Compute content hash for deduplication
    content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()

    # Check if already exists
    existing = await session.execute(
        select(Document).where(Document.content_hash == content_hash)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="This document already exists in the reference corpus.",
        )

    doc = Document(
        filename=file.filename,
        content_hash=content_hash,
        text_content=_sanitize_text(text),
        word_count=len(text.split()),
        owner_id=current_user.id if current_user else None,
    )
    session.add(doc)
    await session.flush()  # To get doc.id

    # Generate chunks and embeddings
    chunks = chunk_text(text)
    if chunks:
        chunk_texts = [c.text for c in chunks]
        embeddings = get_embeddings(chunk_texts)

        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            ref_chunk = ReferenceChunk(
                document_id=doc.id,
                chunk_index=i,
                text=_sanitize_text(chunk.text),
                embedding=emb
            )
            session.add(ref_chunk)

    await session.commit()
    await session.refresh(doc)

    logger.info("Added reference document: '%s' (%d words, %d chunks).", doc.filename, doc.word_count, len(chunks))
    return doc


@router.get("", response_model=DocumentListOut)
async def list_documents(
    skip: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
):
    """List all reference documents."""
    count_result = await session.execute(select(func.count(Document.id)))
    total = count_result.scalar() or 0

    result = await session.execute(
        select(Document)
        .order_by(Document.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    documents = result.scalars().all()

    return DocumentListOut(
        documents=[DocumentOut.model_validate(d) for d in documents],
        total=total,
    )


@router.delete("/{document_id}")
async def delete_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_current_user),
):
    """Remove a reference document from the corpus."""
    result = await session.execute(
        select(Document).where(Document.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Only owner or admin can delete; anonymous users can delete any anonymous doc
    if current_user and doc.owner_id and doc.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="You can only delete your own documents.")

    doc_name = doc.filename

    # Use SQL DELETE to avoid lazy-loading the 'chunks' backref in async context.
    await session.execute(
        delete(ReferenceChunk).where(ReferenceChunk.document_id == document_id)
    )
    await session.execute(
        delete(Document).where(Document.id == document_id)
    )
    await session.commit()
    logger.info("Deleted reference document: '%s'.", doc_name)
    return {"detail": f"Document '{doc_name}' deleted."}
