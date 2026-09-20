import pytest
from app.services.chunker import chunk_text
from app.services.detector import ReferenceEntry, run_detection

@pytest.mark.asyncio
async def test_detector_plagiarism_detection():
    # 1. Reference document text
    ref_text = (
        "The goal of reducing sequential computation forms the foundation of modern deep neural models. "
        "In convolutional neural networks, hidden representations are computed in parallel for all input positions. "
        "This makes it significantly more effective to scale gradient updates across distributed GPUs."
    )
    ref_chunks = chunk_text(ref_text, window=2, overlap=1)
    ref_entries = [ReferenceEntry(text=c.text, source_name="deep_learning_survey.pdf") for c in ref_chunks]

    # 2. Plagiarized document (verbatim copy of the second sentence)
    input_text = (
        "In convolutional neural networks, hidden representations are computed in parallel for all input positions. "
        "This makes it significantly more effective to scale gradient updates across distributed GPUs."
    )
    input_chunks = chunk_text(input_text, window=2, overlap=1)

    result = await run_detection(input_chunks, ref_entries, enable_web_search=False)
    assert result.overall_score > 70.0
    assert result.originality_score < 30.0
    assert len(result.matches) > 0
    assert any(m.source_name == "deep_learning_survey.pdf" for m in result.matches)

@pytest.mark.asyncio
async def test_detector_original_document():
    # Reference document
    ref_text = "Photosynthesis in green plants converts solar radiant energy into chemical glucose bonds."
    ref_entries = [ReferenceEntry(text=ref_text, source_name="botany.txt")]

    # Completely different text
    input_text = "The Federal Reserve adjusted monetary interest rates to maintain macroeconomic stability."
    input_chunks = chunk_text(input_text, window=1, overlap=0)

    result = await run_detection(input_chunks, ref_entries, enable_web_search=False)
    assert result.overall_score < 25.0
    assert result.originality_score > 75.0
