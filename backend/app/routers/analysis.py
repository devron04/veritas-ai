"""
Analysis router — plagiarism checking endpoints.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.database import Analysis, Document, Finding, ReferenceChunk, get_session, async_session
from app.schemas.schemas import (
    AnalysisListOut, AnalysisOut, AnalysisStatusOut, AnalysisSummaryOut, TextInput,
)
from app.services.chunker import chunk_text
from app.services.detector import DetectionResult, ReferenceEntry, run_detection
from app.services.embedding import get_embeddings
from app.services.parser import extract_text
from app.services.report import generate_pdf_report

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["analysis"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _load_reference_entries(session: AsyncSession) -> list[ReferenceEntry]:
    """Load all reference document chunks from the database."""
    # Query ReferenceChunk joined with Document
    result = await session.execute(
        select(ReferenceChunk, Document.filename)
        .join(Document, ReferenceChunk.document_id == Document.id)
    )
    rows = result.all()

    entries: list[ReferenceEntry] = []
    for ref_chunk, filename in rows:
        entries.append(ReferenceEntry(text=ref_chunk.text, source_name=filename))

    return entries


async def _run_analysis_background(
    analysis_id: uuid.UUID,
    text: str,
    filename: str,
    add_to_repository: bool = True,
) -> None:
    """
    Background task: runs the full detection pipeline and updates progress in DB.
    Creates its own database session (not tied to the HTTP request lifecycle).
    """
    async with async_session() as session:
        # Load the analysis record
        result_q = await session.execute(
            select(Analysis).where(Analysis.id == analysis_id)
        )
        analysis = result_q.scalar_one()

        async def _update_progress(pct: float, msg: str):
            """Write progress to DB so the polling endpoint can read it."""
            analysis.progress = round(min(pct, 100.0), 1)
            analysis.progress_message = msg[:256]
            await session.commit()

        try:
            await _update_progress(2.0, "Extracting text and splitting into chunks...")

            # Chunk the input text
            input_chunks = chunk_text(text)
            analysis.total_chunks = len(input_chunks)
            await session.commit()

            # Load reference corpus
            ref_entries = await _load_reference_entries(session)
            logger.info(
                "Analyzing '%s': %d chunks vs %d reference entries.",
                filename, len(input_chunks), len(ref_entries),
            )

            await _update_progress(4.0, f"Loaded {len(ref_entries)} reference entries. Starting detection...")

            # Run hybrid detection with progress callback
            result: DetectionResult = await run_detection(
                input_chunks=input_chunks,
                reference_entries=ref_entries,
                session=session,
                enable_web_search=bool(settings.TAVILY_API_KEY),
                progress_callback=_update_progress,
            )

            await _update_progress(96.0, "Saving findings to database...")

            # Save findings
            for match in result.matches:
                finding = Finding(
                    analysis_id=analysis.id,
                    chunk_index=match.chunk_index,
                    chunk_text=match.chunk_text,
                    source_text=match.source_text,
                    source_name=match.source_name,
                    similarity_score=match.combined_score,
                    tfidf_score=match.tfidf_score,
                    semantic_score=match.semantic_score,
                    match_type=match.match_type,
                    flag_reason=match.flag_reason,
                    is_quoted=match.is_quoted,
                    start_char=match.start_char,
                    end_char=match.end_char,
                )
                session.add(finding)

            # Update analysis
            analysis.overall_score = result.overall_score
            analysis.originality_score = result.originality_score
            analysis.flagged_chunks = result.flagged_chunks
            # Merge tier_stats into tiers_used for a single JSON column
            merged_tiers = {**result.tiers_used, **result.tier_stats}
            analysis.tiers_used = merged_tiers
            analysis.status = "completed"
            analysis.progress = 100.0
            analysis.progress_message = "Analysis complete."
            analysis.completed_at = datetime.now(timezone.utc)

            # Phase 4a: Index submitted paper into institutional repository
            if add_to_repository and text.strip():
                content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
                existing_doc = await session.execute(
                    select(Document).where(Document.content_hash == content_hash)
                )
                if not existing_doc.scalar_one_or_none():
                    repo_doc = Document(
                        filename=f"[Submission] {filename}",
                        content_hash=content_hash,
                        text_content=text,
                        word_count=len(text.split()),
                    )
                    session.add(repo_doc)
                    await session.flush()
                    if input_chunks:
                        chunk_texts = [c.text for c in input_chunks]
                        embeddings = get_embeddings(chunk_texts)
                        for i, (chunk, emb) in enumerate(zip(input_chunks, embeddings)):
                            session.add(ReferenceChunk(
                                document_id=repo_doc.id,
                                chunk_index=i,
                                text=chunk.text,
                                embedding=emb,
                            ))
                    logger.info(
                        "Auto-indexed submitted document '%s' into repository (%d chunks).",
                        filename, len(input_chunks),
                    )

            # Phase 4c: Promote high-confidence web matches into permanent reference corpus
            web_matches = [
                m for m in result.matches
                if m.match_type == "web" and m.combined_score >= 0.75 and m.source_text
            ]
            for wm in web_matches:
                w_text = wm.source_text.strip()
                if len(w_text) >= 50:
                    w_hash = hashlib.sha256(w_text.encode("utf-8")).hexdigest()
                    existing_web = await session.execute(
                        select(Document).where(Document.content_hash == w_hash)
                    )
                    if not existing_web.scalar_one_or_none():
                        w_name = wm.source_name or "Web Source"
                        w_doc = Document(
                            filename=f"[Web] {w_name[:120]}",
                            content_hash=w_hash,
                            text_content=w_text,
                            word_count=len(w_text.split()),
                        )
                        session.add(w_doc)
                        await session.flush()
                        w_chunks = chunk_text(w_text)
                        if w_chunks:
                            w_embs = get_embeddings([wc.text for wc in w_chunks])
                            for w_i, (wc, w_emb) in enumerate(zip(w_chunks, w_embs)):
                                session.add(ReferenceChunk(
                                    document_id=w_doc.id,
                                    chunk_index=w_i,
                                    text=wc.text,
                                    embedding=w_emb,
                                ))
                        logger.info("Promoted web search match '%s' to reference corpus.", w_name)

            await session.commit()
            logger.info("Analysis '%s' completed successfully. Score: %.1f%%", filename, result.overall_score)

        except Exception as e:
            logger.exception("Analysis failed for '%s': %s", filename, e)
            analysis.status = "failed"
            analysis.error_message = str(e)
            analysis.progress = 100.0
            analysis.progress_message = f"Failed: {str(e)[:200]}"
            await session.commit()


async def _start_analysis(
    text: str,
    filename: str,
    session: AsyncSession,
    background_tasks: BackgroundTasks,
    add_to_repository: bool = True,
) -> Analysis:
    """Create the analysis record and schedule the background task."""
    analysis = Analysis(
        filename=filename,
        original_text=text,
        status="processing",
        progress=0.0,
        progress_message="Queued for analysis...",
    )
    session.add(analysis)
    await session.commit()
    await session.refresh(analysis)

    # Schedule background processing
    background_tasks.add_task(
        _run_analysis_background,
        analysis.id,
        text,
        filename,
        add_to_repository,
    )

    return analysis


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/analyze/file", response_model=AnalysisStatusOut)
async def analyze_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    add_to_repository: bool = Form(True),
    session: AsyncSession = Depends(get_session),
):
    """Upload a file (.pdf, .docx, .txt) and run plagiarism analysis."""
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

    analysis = await _start_analysis(
        text, file.filename, session, background_tasks, add_to_repository=add_to_repository
    )
    return analysis


@router.post("/analyze/text", response_model=AnalysisStatusOut)
async def analyze_text(
    background_tasks: BackgroundTasks,
    payload: TextInput,
    session: AsyncSession = Depends(get_session),
):
    """Submit text directly and run plagiarism analysis."""
    analysis = await _start_analysis(
        payload.text, payload.filename, session, background_tasks, add_to_repository=payload.add_to_repository
    )
    return analysis


@router.get("/analysis/{analysis_id}/status", response_model=AnalysisStatusOut)
async def get_analysis_status(
    analysis_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    """Lightweight polling endpoint for real-time progress updates."""
    result = await session.execute(
        select(Analysis).where(Analysis.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return analysis


@router.get("/analyses", response_model=AnalysisListOut)
async def list_analyses(
    skip: int = 0,
    limit: int = 20,
    session: AsyncSession = Depends(get_session),
):
    """List all past analyses (newest first)."""
    # Count total
    count_result = await session.execute(select(func.count(Analysis.id)))
    total = count_result.scalar() or 0

    # Fetch page
    result = await session.execute(
        select(Analysis)
        .order_by(Analysis.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    analyses = result.scalars().all()

    return AnalysisListOut(
        analyses=[AnalysisSummaryOut.model_validate(a) for a in analyses],
        total=total,
    )


@router.get("/analysis/{analysis_id}", response_model=AnalysisOut)
async def get_analysis(
    analysis_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    """Get a single analysis with all its findings."""
    result = await session.execute(
        select(Analysis)
        .options(selectinload(Analysis.findings))
        .where(Analysis.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return analysis


@router.delete("/analysis/{analysis_id}")
async def delete_analysis(
    analysis_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    """Delete an analysis and its findings."""
    result = await session.execute(
        select(Analysis).where(Analysis.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    await session.delete(analysis)
    await session.commit()
    return {"detail": "Analysis deleted."}


@router.get("/analysis/{analysis_id}/report")
async def download_report(
    analysis_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    """Download a PDF report for an analysis."""
    result = await session.execute(
        select(Analysis)
        .options(selectinload(Analysis.findings))
        .where(Analysis.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    if analysis.status != "completed":
        raise HTTPException(status_code=400, detail="Analysis is not yet completed.")

    findings_data = [
        {
            "chunk_text": f.chunk_text,
            "source_name": f.source_name,
            "similarity_score": f.similarity_score,
            "match_type": f.match_type,
            "flag_reason": f.flag_reason or "",
            "is_quoted": f.is_quoted,
        }
        for f in analysis.findings
    ]

    # Extract tier_stats from the merged tiers_used JSON
    tiers = analysis.tiers_used or {}
    tier_stats = {
        "tier1_matches": tiers.get("tier1_matches", 0),
        "tier2_matches": tiers.get("tier2_matches", 0),
        "tier3_matches": tiers.get("tier3_matches", 0),
    }

    pdf_bytes = generate_pdf_report(
        filename=analysis.filename,
        overall_score=analysis.overall_score or 0.0,
        originality_score=analysis.originality_score or 0.0,
        total_chunks=analysis.total_chunks,
        flagged_chunks=analysis.flagged_chunks,
        findings=findings_data,
        tier_stats=tier_stats,
    )

    safe_name = Path(analysis.filename).stem
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_plagiarism_report.pdf"'
        },
    )
