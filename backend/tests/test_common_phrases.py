import pytest
from app.services.common_phrases import is_common_phrase, should_filter_chunk

def test_common_phrases():
    assert is_common_phrase("in this paper we") is True
    assert is_common_phrase("hit the nail on the head") is True
    assert is_common_phrase("a piece of cake") is True
    assert is_common_phrase("Quantum entanglement exhibits non-local correlations across spatiotemporal manifolds") is False

def test_short_phrase_filter():
    # Fewer than 5 words should be filtered to prevent false positive short matches
    assert should_filter_chunk("in conclusion") is True
    assert should_filter_chunk("for example") is True
