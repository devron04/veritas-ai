import pytest
from app.services.chunker import chunk_text, _is_quoted_or_cited

def test_chunking_basic():
    text = (
        "Artificial intelligence is rapidly transforming contemporary software development. "
        "Natural language processing allows computers to comprehend human syntax. "
        "Deep neural networks discover intricate representations in high-dimensional vector spaces. "
        "Plagiarism detection systems protect intellectual property in scholarly communications."
    )
    chunks = chunk_text(text, window=2, overlap=1)
    assert len(chunks) > 0
    assert all(c.text for c in chunks)
    assert chunks[0].start_char >= 0
    assert chunks[0].end_char > chunks[0].start_char

def test_quote_detection():
    cited_text = 'According to Vaswani et al. (2017), "attention is all you need for sequence modeling".'
    assert _is_quoted_or_cited(cited_text) is True

    bracket_citation = "Deep learning methods have shown remarkable success [1, 2]."
    assert _is_quoted_or_cited(bracket_citation) is True

    regular_text = "The quick brown fox jumps over the lazy dog."
    assert _is_quoted_or_cited(regular_text) is False
