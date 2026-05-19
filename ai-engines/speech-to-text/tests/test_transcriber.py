import os
os.environ["SKIP_WARMUP"] = "1"

from app.transcriber import transcribe_audio
from app.models import TranscribeResponse


def test_stub_transcription():
    result = transcribe_audio("/nonexistent/path.wav")
    assert isinstance(result, TranscribeResponse)
    assert len(result.text) > 0
    assert result.requires_human_review is True
    assert result.duration_seconds > 0


def test_stub_has_segments():
    result = transcribe_audio("/fake.mp3")
    assert len(result.segments) > 0
    for seg in result.segments:
        assert 0.0 <= seg.confidence <= 1.0


def test_stub_language():
    result = transcribe_audio("/fake.wav", language="es")
    assert result.language == "en"  # stub always returns en
