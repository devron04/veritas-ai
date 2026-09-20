import pytest
from app.services.parser import extract_text_from_txt, extract_text

def test_extract_text_txt():
    sample_bytes = "Hello World! This is a test document for plagiarism analysis.".encode("utf-8")
    result = extract_text_from_txt(sample_bytes)
    assert "Hello World!" in result

def test_extract_text_invalid_extension():
    with pytest.raises(ValueError, match="Unsupported file format"):
        extract_text(b"some data", "sample.xyz")
