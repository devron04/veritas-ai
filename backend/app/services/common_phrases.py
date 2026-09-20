"""
Common phrases and idiom filter to reduce false positives.
"""
from __future__ import annotations

import re
from collections import Counter

from app.core.config import settings

# ---------------------------------------------------------------------------
# Curated common phrases & idioms that should NOT trigger plagiarism flags
# ---------------------------------------------------------------------------
COMMON_PHRASES: set[str] = {
    # Academic boilerplate
    "in this paper we", "the results show that", "it can be concluded that",
    "the purpose of this study", "the aim of this research", "as shown in figure",
    "as mentioned above", "in the following section", "for example",
    "in other words", "on the other hand", "in addition to",
    "as a result", "in conclusion", "to summarize", "in summary",
    "it is important to note", "it should be noted that",
    "further research is needed", "the findings suggest that",
    "according to the results", "based on the analysis",
    "the data indicates that", "the study found that",
    "literature review", "research methodology", "data collection",
    "statistical analysis", "the following table shows",

    # Common English idioms
    "at the end of the day", "on the same page", "think outside the box",
    "best of both worlds", "a piece of cake", "break the ice",
    "hit the nail on the head", "once in a blue moon", "under the weather",
    "the bottom line", "back to square one", "barking up the wrong tree",
    "bite the bullet", "break a leg", "burning the midnight oil",
    "cost an arm and a leg", "cutting corners", "easy as pie",
    "get out of hand", "give the benefit of the doubt",
    "go back to the drawing board", "hang in there", "it takes two to tango",
    "jump on the bandwagon", "keep your chin up", "let the cat out of the bag",
    "miss the boat", "no pain no gain", "pull someone's leg",
    "speak of the devil", "spill the beans", "take it with a grain of salt",
    "the ball is in your court", "time flies", "wrap your head around",

    # Legal / formal boilerplate
    "terms and conditions", "privacy policy", "all rights reserved",
    "subject to change without notice", "to the best of our knowledge",
    "for the purposes of", "with respect to", "in accordance with",
    "pursuant to", "notwithstanding the foregoing", "herein referred to as",

    # Common transitional phrases
    "first and foremost", "last but not least", "more importantly",
    "as a matter of fact", "by and large", "for the most part",
    "in the long run", "all things considered", "needless to say",
    "it goes without saying", "to put it simply", "that being said",
}

# Normalize: lowercase, strip extra whitespace
COMMON_PHRASES_NORMALIZED: set[str] = {
    re.sub(r"\s+", " ", phrase.lower().strip())
    for phrase in COMMON_PHRASES
}


def is_common_phrase(text: str) -> bool:
    """
    Check whether a text chunk is a common phrase or idiom.

    Rules:
    - Exact match against the curated list (normalized).
    - Short phrases (< SHORT_PHRASE_WORDS words) are treated more leniently.
    """
    normalized = re.sub(r"\s+", " ", text.lower().strip())

    # Direct match
    if normalized in COMMON_PHRASES_NORMALIZED:
        return True

    # Check if the chunk is almost entirely composed of a common phrase
    for phrase in COMMON_PHRASES_NORMALIZED:
        if phrase in normalized:
            # If the common phrase makes up >70% of the chunk text, flag it
            if len(phrase) / max(len(normalized), 1) > 0.70:
                return True

    return False


def compute_corpus_frequency(
    chunk_text: str,
    corpus_chunks: list[str],
) -> float:
    """
    Compute how frequently similar text appears across the reference corpus.
    Returns a ratio [0, 1] — if > COMMON_PHRASE_FREQ, consider it common.
    """
    if not corpus_chunks or len(corpus_chunks) < 5:
        return 0.0

    normalized = re.sub(r"\s+", " ", chunk_text.lower().strip())
    words = set(normalized.split())

    if len(words) < 3:
        return 0.0

    match_count = 0
    for ref_chunk in corpus_chunks:
        ref_normalized = re.sub(r"\s+", " ", ref_chunk.lower().strip())
        ref_words = set(ref_normalized.split())
        # Jaccard similarity on word sets
        intersection = words & ref_words
        union = words | ref_words
        if union and len(intersection) / len(union) > 0.50:
            match_count += 1

    frequency = match_count / len(corpus_chunks)
    return frequency


def should_filter_chunk(
    chunk_text: str,
    corpus_chunks: list[str] | None = None,
) -> bool:
    """
    Determine whether a chunk should be filtered out as a common phrase.

    A chunk is filtered if:
    1. It matches the curated common phrases list, OR
    2. It's a short phrase (< SHORT_PHRASE_WORDS) without strong similarity, OR
    3. It appears in > COMMON_PHRASE_FREQ of the reference corpus (requires >= 5 corpus chunks).
    """
    # Rule 1: curated list
    if is_common_phrase(chunk_text):
        return True

    # Rule 2: short phrase leniency
    word_count = len(chunk_text.split())
    if word_count < settings.SHORT_PHRASE_WORDS:
        return True

    # Rule 3: corpus frequency
    if corpus_chunks and len(corpus_chunks) >= 5:
        freq = compute_corpus_frequency(chunk_text, corpus_chunks)
        if freq > settings.COMMON_PHRASE_FREQ:
            return True

    return False
