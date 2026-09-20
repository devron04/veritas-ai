"""
Text chunker — splits text into overlapping sentence-based chunks,
detects quoted/cited passages, and records character positions.
"""
from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field

import nltk

from app.core.config import settings

logger = logging.getLogger(__name__)

# Ensure NLTK sentence tokenizer data is available
try:
    nltk.data.find("tokenizers/punkt_tab")
except LookupError:
    nltk.download("punkt_tab", quiet=True)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------
@dataclass
class Chunk:
    """A text chunk with metadata."""
    index: int
    text: str
    start_char: int
    end_char: int
    sentences: list[str] = field(default_factory=list)
    is_quoted: bool = False


# ---------------------------------------------------------------------------
# Citation / quote detection patterns
# ---------------------------------------------------------------------------
# Matches text inside quotation marks (straight & curly)
_QUOTE_PATTERN = re.compile(
    r'["\u201c\u201d\u201e\u201f\u2033]'   # opening/closing quotes
    r'(.+?)'
    r'["\u201c\u201d\u201e\u201f\u2033]',
    re.DOTALL,
)

# Common citation markers: (Author, Year), [1], [Author2024], etc.
_CITATION_PATTERNS = [
    re.compile(r'\([\w\s&.,]+\d{4}[a-z]?\)'),          # (Author, 2024)
    re.compile(r'\[[\d,;\s\-]+\]'),                       # [1], [1,2], [1-3]
    re.compile(r'\((?:ibid|op\.\s*cit\.?|loc\.\s*cit\.?)\)', re.IGNORECASE),
    re.compile(r'(?:According to|As stated by|As noted by)\s+[\w\s]+', re.IGNORECASE),
]


def _is_quoted_or_cited(text: str) -> bool:
    """
    Determine whether a chunk is predominantly quoted or cited text.
    A chunk is considered quoted if >60% of its characters fall within
    quotation marks, or if it contains explicit citation markers.
    """
    # Check for citation markers
    for pattern in _CITATION_PATTERNS:
        if pattern.search(text):
            return True

    # Check for quoted content proportion
    quoted_chars = sum(len(m.group(0)) for m in _QUOTE_PATTERN.finditer(text))
    if len(text) > 0 and quoted_chars / len(text) > 0.60:
        return True

    return False


# ---------------------------------------------------------------------------
# Main chunker
# ---------------------------------------------------------------------------
def chunk_text(
    text: str,
    window: int | None = None,
    overlap: int | None = None,
) -> list[Chunk]:
    """
    Split text into overlapping sentence-based chunks.

    Args:
        text: The full document text.
        window: Number of sentences per chunk. Defaults to settings value.
        overlap: Number of overlapping sentences between chunks. Defaults to settings value.

    Returns:
        A list of Chunk objects with character positions and quote flags.
    """
    window = window or settings.CHUNK_SENTENCE_WINDOW
    overlap = overlap or settings.CHUNK_OVERLAP

    # Tokenize into sentences
    sentences = nltk.sent_tokenize(text)
    if not sentences:
        return []

    # Build sentence position index for character offsets
    sentence_positions: list[tuple[int, int]] = []
    search_start = 0
    for sent in sentences:
        idx = text.find(sent, search_start)
        if idx == -1:
            # Fallback: approximate position
            idx = search_start
        end_idx = idx + len(sent)
        sentence_positions.append((idx, end_idx))
        search_start = end_idx

    # Create overlapping chunks
    chunks: list[Chunk] = []
    step = max(1, window - overlap)

    for i in range(0, len(sentences), step):
        chunk_sentences = sentences[i : i + window]
        if not chunk_sentences:
            break

        start_char = sentence_positions[i][0]
        end_sent_idx = min(i + window - 1, len(sentences) - 1)
        end_char = sentence_positions[end_sent_idx][1]
        chunk_text_str = text[start_char:end_char]

        chunk = Chunk(
            index=len(chunks),
            text=chunk_text_str,
            start_char=start_char,
            end_char=end_char,
            sentences=chunk_sentences,
            is_quoted=_is_quoted_or_cited(chunk_text_str),
        )
        chunks.append(chunk)

        # Stop if we've covered all sentences
        if i + window >= len(sentences):
            break

    logger.info(
        "Chunked %d characters into %d chunks (%d sentences, window=%d, overlap=%d).",
        len(text), len(chunks), len(sentences), window, overlap,
    )
    return chunks
