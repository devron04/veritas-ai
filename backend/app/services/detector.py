"""
Hybrid plagiarism detection engine.

Layer 1: TF-IDF + character n-gram cosine similarity  (fast lexical filter)
Layer 2: Sentence-transformer embeddings              (semantic / paraphrase)
Layer 3: Web search via Tavily API                    (optional, online)

The engine compares each chunk of the input document against all chunks in
the reference corpus, scores them, and returns structured findings.
"""
from __future__ import annotations

from typing import Callable, Awaitable, Optional

import hashlib
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

import nltk

import numpy as np
from datasketch import MinHash, MinHashLSH
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.core.config import settings
from app.services.chunker import Chunk
from app.services.common_phrases import should_filter_chunk
from app.services.embedding import get_embedding_model, get_embeddings

logger = logging.getLogger(__name__)

# Lazy-loaded singleton for the sentence-transformer model moved to embedding.py


# ---------------------------------------------------------------------------
# Data classes for results
# ---------------------------------------------------------------------------
@dataclass
class MatchResult:
    """A single match between an input chunk and a reference chunk."""
    chunk_index: int
    chunk_text: str
    source_text: str
    source_name: str
    tfidf_score: float
    semantic_score: float
    combined_score: float
    match_type: str          # "exact" | "paraphrase" | "web"
    flag_reason: str         # human-readable forensic explanation
    is_quoted: bool
    start_char: int
    end_char: int


@dataclass
class DetectionResult:
    """Full detection result for a document."""
    overall_score: float           # plagiarism percentage (0-100)
    originality_score: float       # 100 - overall_score
    total_chunks: int
    flagged_chunks: int
    matches: list[MatchResult] = field(default_factory=list)
    tiers_used: dict = field(default_factory=lambda: {
        "tier1_lexical": False,
        "tier2_semantic": False,
        "tier3_web": False,
        "reference_docs_count": 0,
        "web_search_note": "",
    })
    tier_stats: dict = field(default_factory=lambda: {
        "tier1_matches": 0,
        "tier2_matches": 0,
        "tier3_matches": 0,
    })


# ---------------------------------------------------------------------------
# Forensic explanation generator
# ---------------------------------------------------------------------------
def _generate_flag_reason(
    match_type: str,
    tfidf_score: float,
    semantic_score: float,
    combined_score: float,
    source_name: str,
) -> str:
    """Generate a human-readable forensic explanation for why a passage was flagged."""
    tfidf_pct = f"{tfidf_score * 100:.0f}%"
    sem_pct = f"{semantic_score * 100:.0f}%"
    combined_pct = f"{combined_score * 100:.0f}%"

    if match_type == "exact":
        return (
            f"Near-identical wording detected ({tfidf_pct} lexical, {sem_pct} semantic) "
            f"— consistent with direct copy from '{source_name}'."
        )
    elif match_type == "web":
        return (
            f"Content matched against web source ({sem_pct} semantic similarity) "
            f"at '{source_name}'."
        )
    else:  # paraphrase
        if tfidf_score >= 0.40 and semantic_score >= 0.60:
            return (
                f"Significant overlap detected ({tfidf_pct} lexical, {sem_pct} semantic) "
                f"— partial reuse with light rewording from '{source_name}'."
            )
        elif semantic_score >= 0.60:
            return (
                f"Semantic meaning overlap detected ({tfidf_pct} lexical, {sem_pct} semantic) "
                f"— consistent with rephrasing of content from '{source_name}'."
            )
        else:
            return (
                f"Moderate similarity detected ({combined_pct} combined score) against '{source_name}'. "
                f"Lexical: {tfidf_pct}, Semantic: {sem_pct}."
            )


# ---------------------------------------------------------------------------
# Reference corpus holder
# ---------------------------------------------------------------------------
@dataclass
class ReferenceEntry:
    """A chunk from a reference document."""
    text: str
    source_name: str


# ---------------------------------------------------------------------------
# Layer 1: TF-IDF
# ---------------------------------------------------------------------------
def _tfidf_compare(
    input_texts: list[str],
    ref_texts: list[str],
) -> np.ndarray:
    """
    Compute TF-IDF cosine similarity between input chunks and reference chunks.

    Returns an (n_input, n_ref) similarity matrix.
    """
    if not ref_texts:
        return np.zeros((len(input_texts), 0))

    vectorizer = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 5),
        max_features=50000,
        sublinear_tf=True,
    )

    all_texts = input_texts + ref_texts
    tfidf_matrix = vectorizer.fit_transform(all_texts)

    input_vectors = tfidf_matrix[: len(input_texts)]
    ref_vectors = tfidf_matrix[len(input_texts) :]

    sim_matrix = cosine_similarity(input_vectors, ref_vectors)
    return sim_matrix


def _text_to_minhash(text: str, num_perm: int = 128) -> MinHash:
    """Convert text to a MinHash signature using character 4-grams."""
    m = MinHash(num_perm=num_perm)
    # Use the same character n-gram approach as TF-IDF for consistency
    text_lower = text.lower()
    for i in range(len(text_lower) - 3):
        ngram = text_lower[i:i + 4]
        m.update(ngram.encode('utf-8'))
    return m


def _lsh_filter_candidates(
    input_texts: list[str],
    ref_texts: list[str],
    threshold: float = 0.3,
    num_perm: int = 128,
) -> dict[int, list[int]]:
    """
    Use MinHash LSH to quickly find candidate reference chunks for each input chunk.
    Returns a dict mapping input_index -> list of candidate ref_indices.
    """
    if not ref_texts:
        return {}

    # Build LSH index from reference texts
    lsh = MinHashLSH(threshold=threshold, num_perm=num_perm)
    ref_minhashes = []
    for i, text in enumerate(ref_texts):
        mh = _text_to_minhash(text, num_perm=num_perm)
        ref_minhashes.append(mh)
        try:
            lsh.insert(f"ref_{i}", mh)
        except ValueError:
            pass  # duplicate minhash, skip

    # Query each input chunk
    candidates: dict[int, list[int]] = {}
    for i, text in enumerate(input_texts):
        mh = _text_to_minhash(text, num_perm=num_perm)
        hits = lsh.query(mh)
        if hits:
            indices = [int(h.split("_")[1]) for h in hits]
            candidates[i] = indices

    return candidates


# ---------------------------------------------------------------------------
# Layer 2: Semantic embeddings
# ---------------------------------------------------------------------------
def _semantic_compare(
    input_texts: list[str],
    ref_texts: list[str],
    batch_size: int = 64,
) -> np.ndarray:
    """
    Compute semantic cosine similarity using sentence-transformer embeddings.

    Returns an (n_input, n_ref) similarity matrix.
    """
    if not ref_texts:
        return np.zeros((len(input_texts), 0))

    input_embeddings = get_embeddings(input_texts, batch_size=batch_size)
    ref_embeddings = get_embeddings(ref_texts, batch_size=batch_size)

    sim_matrix = cosine_similarity(input_embeddings, ref_embeddings)
    return sim_matrix


# ---------------------------------------------------------------------------
# Layer 3: Web search (optional)
# ---------------------------------------------------------------------------
def _chunk_raw_content(raw_content: str, max_chunks: int | None = None) -> list[str]:
    """Split raw web page content into sentence-level chunks for comparison."""
    if max_chunks is None:
        max_chunks = settings.WEB_SEARCH_CHUNK_CAP
    if not raw_content or len(raw_content.strip()) < 20:
        return []

    try:
        sentences = nltk.sent_tokenize(raw_content)
    except Exception:
        # Fallback: split on periods
        sentences = [s.strip() for s in raw_content.split('.') if s.strip()]

    # Group into windows of 3 sentences (matching input chunking)
    window = settings.CHUNK_SENTENCE_WINDOW
    chunks = []
    for i in range(0, len(sentences), max(1, window - 1)):
        group = sentences[i:i + window]
        text = ' '.join(group).strip()
        if len(text) > 20:  # skip trivially short chunks
            chunks.append(text)
        if len(chunks) >= max_chunks:
            break

    return chunks


def _score_web_content(
    chunk_text: str,
    web_chunks: list[str],
) -> tuple[str, float]:
    """
    Score a single input chunk against web page chunks using TF-IDF pre-filter
    + semantic embeddings (same engines as Layers 1 & 2).

    Returns (best_matching_passage, best_score).
    """
    if not web_chunks:
        return "", 0.0

    # --- TF-IDF fast pre-filter ---
    try:
        tfidf_matrix = _tfidf_compare([chunk_text], web_chunks)
        tfidf_scores = tfidf_matrix[0]

        # Take top-10 candidates above a low threshold
        candidate_indices = []
        for idx in range(len(web_chunks)):
            if tfidf_scores[idx] >= 0.20:  # lower threshold to catch more candidates
                candidate_indices.append((idx, float(tfidf_scores[idx])))

        candidate_indices.sort(key=lambda x: x[1], reverse=True)
        candidate_indices = candidate_indices[:10]

        if not candidate_indices:
            # No TF-IDF candidates; take top 5 by raw score as fallback
            top_indices = np.argsort(tfidf_scores)[-5:]
            candidate_indices = [(int(i), float(tfidf_scores[i])) for i in top_indices]
    except Exception as e:
        logger.warning("TF-IDF pre-filter failed on web content: %s", e)
        # Fallback: use first 10 chunks
        candidate_indices = [(i, 0.0) for i in range(min(10, len(web_chunks)))]

    if not candidate_indices:
        return "", 0.0

    # --- Semantic embedding comparison on candidates ---
    try:
        candidate_texts = [web_chunks[i] for i, _ in candidate_indices]
        sem_matrix = _semantic_compare([chunk_text], candidate_texts)
        sem_scores = sem_matrix[0]

        best_local_idx = int(np.argmax(sem_scores))
        best_sem_score = float(sem_scores[best_local_idx])
        best_tfidf_score = candidate_indices[best_local_idx][1]

        # Combine TF-IDF + semantic, same weighting as main pipeline
        if best_tfidf_score > 0 and best_sem_score > 0:
            combined = (settings.TFIDF_WEIGHT * best_tfidf_score +
                        settings.SEMANTIC_WEIGHT * best_sem_score)
        elif best_sem_score > 0:
            combined = best_sem_score * 0.85
        else:
            combined = best_tfidf_score * 0.80

        best_passage = candidate_texts[best_local_idx]
        return best_passage, combined

    except Exception as e:
        logger.warning("Semantic comparison failed on web content: %s", e)
        # Fallback to best TF-IDF score
        best_idx, best_score = candidate_indices[0]
        return web_chunks[best_idx], best_score * 0.80


def _compute_query_hash(text: str) -> str:
    """Compute a normalized hash for caching web search queries."""
    import re
    normalized = re.sub(r"\s+", " ", text.lower().strip())[:400]
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _process_web_results(
    chunk_text: str,
    data: dict,
) -> list[tuple[str, str, float]]:
    """
    Process Tavily API response data and score results using TF-IDF + semantic engines.
    Shared by both cached and live code paths.
    """
    results = []
    seen_urls = set()
    seen_content_hashes = set()  # Phase 2c: de-duplicate near-identical content

    for result in data.get("results", []):
        url = result.get("url", "unknown")

        # De-duplicate near-identical URLs (syndicated content)
        url_base = url.split("?")[0].rstrip("/")
        if url_base in seen_urls:
            continue
        seen_urls.add(url_base)

        # Phase 2c: De-duplicate near-identical content across different URLs
        snippet = result.get("content", "")
        content_for_hash = snippet[:200].lower().strip() if snippet else ""
        content_hash = hashlib.sha256(content_for_hash.encode("utf-8")).hexdigest()
        if content_hash in seen_content_hashes:
            continue
        seen_content_hashes.add(content_hash)

        # Prefer raw_content (full page), fall back to snippet
        raw_content = result.get("raw_content", "")

        if raw_content and len(raw_content) > 50:
            # Chunk the full page and run through real engines
            web_chunks = _chunk_raw_content(raw_content)
            if web_chunks:
                best_passage, score = _score_web_content(chunk_text, web_chunks)
                if score >= settings.SUSPICIOUS_THRESHOLD:
                    results.append((url, best_passage, score))
                    continue

        # Fallback: use snippet with semantic comparison
        if snippet and len(snippet) > 20:
            try:
                sem_matrix = _semantic_compare([chunk_text], [snippet])
                sim = float(sem_matrix[0][0])
            except Exception:
                # Last resort: word overlap
                words_a = set(chunk_text.lower().split())
                words_b = set(snippet.lower().split())
                intersection = words_a & words_b
                smaller = min(len(words_a), len(words_b))
                sim = len(intersection) / smaller if smaller > 0 else 0.0

            if sim >= settings.SUSPICIOUS_THRESHOLD:
                results.append((url, snippet, sim))

    return results


async def _web_search_check(
    chunk_text: str,
) -> list[tuple[str, str, float]]:
    """
    Search for a text chunk on the web using the Tavily API.
    Uses advanced search with full page content, then routes results
    through TF-IDF + semantic engines for accurate scoring.

    Results are cached in the database for 7 days to save API quota
    and ensure reproducibility.

    Returns a list of (source_url, best_matching_passage, similarity_score) tuples.
    """
    if not settings.TAVILY_API_KEY:
        return []

    import httpx

    query_hash = _compute_query_hash(chunk_text)

    # --- Check cache first ---
    try:
        from app.models.database import WebSearchCache, async_session
        from sqlalchemy import select

        async with async_session() as session:
            result = await session.execute(
                select(WebSearchCache).where(
                    WebSearchCache.query_hash == query_hash,
                    WebSearchCache.expires_at > datetime.now(timezone.utc),
                )
            )
            cached = result.scalar_one_or_none()

            if cached:
                logger.debug("Web search cache HIT for hash %s", query_hash[:12])
                return _process_web_results(chunk_text, cached.response_data)
    except Exception as e:
        logger.debug("Cache lookup failed (non-fatal): %s", e)

    # --- Live API call ---
    try:
        async with httpx.AsyncClient(timeout=settings.WEB_SEARCH_TIMEOUT) as client:
            response = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": settings.TAVILY_API_KEY,
                    "query": chunk_text[:400],
                    "search_depth": "advanced",
                    "include_raw_content": True,
                    "max_results": settings.WEB_SEARCH_MAX_RESULTS,
                },
            )
            response.raise_for_status()
            data = response.json()

        # --- Store in cache ---
        try:
            from app.models.database import WebSearchCache, async_session

            async with async_session() as session:
                cache_entry = WebSearchCache(
                    query_hash=query_hash,
                    query_text=chunk_text[:500],
                    response_data=data,
                    expires_at=datetime.now(timezone.utc) + timedelta(days=7),
                )
                session.add(cache_entry)
                await session.commit()
                logger.debug("Cached web search result for hash %s", query_hash[:12])
        except Exception as e:
            logger.debug("Cache store failed (non-fatal): %s", e)

        return _process_web_results(chunk_text, data)

    except Exception as e:
        logger.warning("Web search failed for chunk: %s", e)
        return []


# ---------------------------------------------------------------------------
# Main detection pipeline
# ---------------------------------------------------------------------------
# Type alias for the progress callback
ProgressCallback = Optional[Callable[[float, str], Awaitable[None]]]


async def run_detection(
    input_chunks: list[Chunk],
    reference_entries: list[ReferenceEntry],
    session=None,
    enable_web_search: bool = True,
    progress_callback: ProgressCallback = None,
) -> DetectionResult:
    """
    Run the full hybrid plagiarism detection pipeline.

    1. TF-IDF fast filter across all chunks
    2. Semantic analysis on TF-IDF candidates
    3. Optional web search for remaining unmatched chunks

    Args:
        input_chunks: Chunks from the document being checked.
        reference_entries: Chunks from all reference documents.
        enable_web_search: Whether to use Tavily web search.
        progress_callback: Optional async callback(progress_pct, message) for real-time updates.

    Returns:
        DetectionResult with overall scores and per-chunk matches.
    """
    async def _report(pct: float, msg: str):
        """Helper to call progress_callback if provided."""
        if progress_callback:
            try:
                await progress_callback(pct, msg)
            except Exception:
                pass  # never let progress reporting break the pipeline

    if not input_chunks:
        await _report(100.0, "No chunks to analyze.")
        return DetectionResult(
            overall_score=0.0,
            originality_score=100.0,
            total_chunks=0,
            flagged_chunks=0,
        )

    input_texts = [c.text for c in input_chunks]
    ref_texts = [r.text for r in reference_entries]
    ref_names = [r.source_name for r in reference_entries]

    # Collect all reference texts for corpus frequency filtering
    corpus_sample = ref_texts[:500]  # cap for performance

    matches: list[MatchResult] = []
    chunk_scores: list[float] = []

    # Track which tiers contributed
    tiers_used = {
        "tier1_lexical": False,
        "tier2_semantic": False,
        "tier3_web": False,
        "reference_docs_count": len(set(ref_names)),
        "web_search_note": "",
    }

    # ---- Layer 1: TF-IDF with LSH pre-filter (Phase 3) ----
    await _report(5.0, f"Starting lexical analysis on {len(input_texts)} chunks...")
    logger.info("Running LSH + TF-IDF analysis on %d input chunks vs %d references...",
                len(input_texts), len(ref_texts))

    tfidf_matrix = np.zeros((len(input_texts), len(ref_texts)))
    if ref_texts:
        tiers_used["tier1_lexical"] = True

        # For small corpora, direct TF-IDF is already fast -- skip LSH overhead
        LSH_CORPUS_THRESHOLD = 100
        if len(ref_texts) <= LSH_CORPUS_THRESHOLD:
            tfidf_matrix = _tfidf_compare(input_texts, ref_texts)
        else:
            # Phase 3: Use MinHash/LSH to bucket candidates first
            lsh_candidates = _lsh_filter_candidates(
                input_texts, ref_texts, threshold=0.3
            )
            logger.info(
                "LSH found candidates for %d/%d input chunks (skipping full-corpus TF-IDF for the rest).",
                len(lsh_candidates), len(input_texts),
            )

            # Only run TF-IDF on chunks that have LSH candidates
            for input_idx, ref_indices in lsh_candidates.items():
                candidate_refs = [ref_texts[j] for j in ref_indices]
                if candidate_refs:
                    local_matrix = _tfidf_compare([input_texts[input_idx]], candidate_refs)
                    # Map local scores back to global ref positions
                    for local_j, global_j in enumerate(ref_indices):
                        tfidf_matrix[input_idx, global_j] = local_matrix[0, local_j]
    else:
        tiers_used["web_search_note"] = (
            "No reference documents uploaded. "
            "Tiers 1 (lexical) and 2 (semantic) were skipped. "
            "Only Tier 3 (web search) was used."
        )

    # ---- Layer 2: Semantic (on candidates only) ----
    # Find chunks that pass the TF-IDF threshold, have moderate similarity, or if corpus is small
    candidate_indices = set()
    tfidf_best: dict[int, tuple[int, float]] = {}  # chunk_idx -> (ref_idx, score)

    if tfidf_matrix.shape[1] > 0:
        for i in range(len(input_texts)):
            best_ref_idx = int(np.argmax(tfidf_matrix[i]))
            best_score = float(tfidf_matrix[i, best_ref_idx])
            tfidf_best[i] = (best_ref_idx, best_score)
            if (best_score >= settings.TFIDF_CANDIDATE_THRESHOLD
                    or len(ref_texts) <= 100
                    or best_score >= 0.20):
                candidate_indices.add(i)

    await _report(25.0, f"Lexical scan complete. {len(candidate_indices)} candidates found.")
    logger.info("TF-IDF found %d candidate chunks (threshold=%.2f).",
                len(candidate_indices), settings.TFIDF_CANDIDATE_THRESHOLD)

    # Run semantic comparison on candidates
    semantic_scores: dict[int, tuple[str, str, float]] = {}  # chunk_idx -> (text, name, score)

    if candidate_indices and ref_texts:
        tiers_used["tier2_semantic"] = True
        await _report(28.0, "Running semantic AI analysis on candidates...")
        candidate_list = sorted(candidate_indices)
        candidate_texts = [input_texts[i] for i in candidate_list]

        from app.services.embedding import get_embeddings
        cand_embeddings = get_embeddings(candidate_texts)

        if session is not None:
            from sqlalchemy import text
            query = text("""
                SELECT c.text, d.filename, 1 - (c.embedding <=> CAST(:query_emb AS vector)) AS score
                FROM reference_chunks c
                JOIN documents d ON c.document_id = d.id
                ORDER BY c.embedding <=> CAST(:query_emb AS vector)
                LIMIT 1
            """)

            for local_i, global_i in enumerate(candidate_list):
                emb_str = str(cand_embeddings[local_i].tolist())
                result = await session.execute(query, {"query_emb": emb_str})
                row = result.first()
                if row:
                    best_text, best_name, best_score = row
                    if best_score >= settings.SUSPICIOUS_THRESHOLD:
                        semantic_scores[global_i] = (best_text, best_name, best_score)
        else:
            # In-memory comparison against ref_texts (e.g. test harness / offline)
            ref_embeddings = get_embeddings(ref_texts)
            sim_matrix = cosine_similarity(cand_embeddings, ref_embeddings)
            for local_i, global_i in enumerate(candidate_list):
                best_ref_idx = int(np.argmax(sim_matrix[local_i]))
                best_score = float(sim_matrix[local_i, best_ref_idx])
                if best_score >= settings.SUSPICIOUS_THRESHOLD:
                    best_name = ref_names[best_ref_idx] if best_ref_idx < len(ref_names) else "unknown"
                    semantic_scores[global_i] = (ref_texts[best_ref_idx], best_name, best_score)

    await _report(60.0, f"Semantic analysis complete. {len(semantic_scores)} matches found.")
    logger.info("Semantic analysis found %d matches.", len(semantic_scores))

    # ---- Combine scores and build matches ----
    web_search_chunks: list[int] = []

    for i, chunk in enumerate(input_chunks):
        # Skip common phrases
        if should_filter_chunk(chunk.text, corpus_sample):
            chunk_scores.append(0.0)
            continue

        tfidf_score = 0.0
        sem_score = 0.0
        best_ref_idx = -1
        best_ref_name = ""
        best_ref_text = ""

        if i in tfidf_best:
            ref_idx, tfidf_score = tfidf_best[i]
            best_ref_idx = ref_idx
            best_ref_name = ref_names[ref_idx] if ref_idx < len(ref_names) else "unknown"
            best_ref_text = ref_texts[ref_idx] if ref_idx < len(ref_texts) else ""

        if i in semantic_scores:
            sem_text, sem_name, sem_score = semantic_scores[i]
            # Prefer the source with the higher combined score
            if sem_score > tfidf_score:
                best_ref_name = sem_name
                best_ref_text = sem_text

        # Combined score
        if tfidf_score > 0 and sem_score > 0:
            weighted = (settings.TFIDF_WEIGHT * tfidf_score +
                        settings.SEMANTIC_WEIGHT * sem_score)
            # For paraphrases, don't penalize high semantic similarity with low lexical overlap
            combined = max(weighted, sem_score * 0.85) if sem_score > tfidf_score else weighted
        elif tfidf_score > 0:
            combined = tfidf_score * 0.85  # confidence penalty
        elif sem_score > 0:
            combined = sem_score * 0.85     # confidence penalty for semantic-only
        else:
            combined = 0.0

        # Determine match type
        if combined >= settings.PLAGIARISM_THRESHOLD:
            if tfidf_score >= 0.90:
                match_type = "exact"
            else:
                match_type = "paraphrase"
        elif combined >= settings.SUSPICIOUS_THRESHOLD:
            match_type = "paraphrase"
        else:
            match_type = ""
            # Queue for web search if not locally matched
            if combined < settings.SUSPICIOUS_THRESHOLD:
                web_search_chunks.append(i)

        score_to_record = 0.0 if chunk.is_quoted else combined
        chunk_scores.append(score_to_record)

        if match_type and combined >= settings.SUSPICIOUS_THRESHOLD:
            reason = _generate_flag_reason(
                match_type, tfidf_score, sem_score, combined, best_ref_name
            )
            matches.append(MatchResult(
                chunk_index=chunk.index,
                chunk_text=chunk.text,
                source_text=best_ref_text,
                source_name=best_ref_name,
                tfidf_score=tfidf_score,
                semantic_score=sem_score,
                combined_score=combined,
                match_type=match_type,
                flag_reason=reason,
                is_quoted=chunk.is_quoted,
                start_char=chunk.start_char,
                end_char=chunk.end_char,
            ))

    # ---- Layer 3: Web search (optional, with graceful failure) ----
    web_search_attempted = False
    web_search_succeeded = False

    if enable_web_search and settings.TAVILY_API_KEY and web_search_chunks:
        web_search_attempted = True
        await _report(65.0, f"Searching the web for {len(web_search_chunks)} unmatched passages...")
        logger.info("Running web search on %d unmatched chunks...", len(web_search_chunks))
        # Limit web searches to manage API quota
        search_limit = min(len(web_search_chunks), 50)
        web_match_count = 0

        for idx in web_search_chunks[:search_limit]:
            chunk = input_chunks[idx]
            if should_filter_chunk(chunk.text, corpus_sample):
                continue

            try:
                web_results = await _web_search_check(chunk.text)
                if web_results:
                    web_search_succeeded = True
                for url, snippet, sim in web_results:
                    if sim >= settings.SUSPICIOUS_THRESHOLD:
                        web_reason = _generate_flag_reason(
                            "web", 0.0, sim, sim, url
                        )
                        matches.append(MatchResult(
                            chunk_index=chunk.index,
                            chunk_text=chunk.text,
                            source_text=snippet,
                            source_name=url,
                            tfidf_score=0.0,
                            semantic_score=sim,
                            combined_score=sim,
                            match_type="web",
                            flag_reason=web_reason,
                            is_quoted=chunk.is_quoted,
                            start_char=chunk.start_char,
                            end_char=chunk.end_char,
                        ))
                        # Update chunk score
                        chunk_scores[idx] = max(chunk_scores[idx], sim)
                        web_match_count += 1
                        break  # one web match per chunk is enough
                # Report web search progress per chunk
                web_progress_pct = 65.0 + (25.0 * (web_search_chunks[:search_limit].index(idx) + 1) / search_limit)
                await _report(web_progress_pct, f"Web search: checked {web_search_chunks[:search_limit].index(idx) + 1}/{search_limit} chunks...")
            except Exception as e:
                logger.warning("Web search failed for chunk %d: %s", idx, e)
                continue  # Don't let one failure kill the whole analysis

        tiers_used["tier3_web"] = web_search_succeeded
        if web_search_attempted and not web_search_succeeded:
            note = tiers_used.get("web_search_note", "")
            tiers_used["web_search_note"] = (
                (note + " " if note else "") +
                "Web search was attempted but returned no usable results."
            )
    elif not settings.TAVILY_API_KEY:
        note = tiers_used.get("web_search_note", "")
        tiers_used["web_search_note"] = (
            (note + " " if note else "") +
            "Web search unavailable: no TAVILY_API_KEY configured."
        )

    # ---- Calculate overall scores ----
    if chunk_scores:
        # Weighted by chunk length for fair scoring
        chunk_lengths = [len(c.text) for c in input_chunks]
        total_length = sum(chunk_lengths)
        if total_length > 0:
            weighted_score = sum(
                score * length for score, length in zip(chunk_scores, chunk_lengths)
            ) / total_length
        else:
            weighted_score = 0.0
        overall_score = round(min(weighted_score * 100, 100.0), 1)
    else:
        overall_score = 0.0

    originality_score = round(100.0 - overall_score, 1)
    flagged = len([m for m in matches if not m.is_quoted])

    # Compute tier contribution stats
    tier_stats = {"tier1_matches": 0, "tier2_matches": 0, "tier3_matches": 0}
    for m in matches:
        if m.match_type == "web":
            tier_stats["tier3_matches"] += 1
        elif m.match_type == "exact":
            tier_stats["tier1_matches"] += 1
        else:  # paraphrase — driven by semantic tier
            tier_stats["tier2_matches"] += 1

    await _report(95.0, "Finalizing similarity report...")
    logger.info(
        "Detection complete: overall=%.1f%%, originality=%.1f%%, flagged=%d/%d chunks. "
        "Tiers used: T1=%s, T2=%s, T3=%s",
        overall_score, originality_score, flagged, len(input_chunks),
        tiers_used["tier1_lexical"], tiers_used["tier2_semantic"], tiers_used["tier3_web"],
    )

    return DetectionResult(
        overall_score=overall_score,
        originality_score=originality_score,
        total_chunks=len(input_chunks),
        flagged_chunks=flagged,
        matches=matches,
        tiers_used=tiers_used,
        tier_stats=tier_stats,
    )
