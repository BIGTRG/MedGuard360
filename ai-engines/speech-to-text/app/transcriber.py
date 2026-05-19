import os
import logging

from .models import TranscribeRequest, TranscribeResponse, Segment, WordTimestamp

WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL", "small")
SKIP_WARMUP = os.getenv("SKIP_WARMUP", "")

_model = None

logger = logging.getLogger("speech-to-text")


def load_model():
    global _model
    try:
        import whisper
        _model = whisper.load_model(WHISPER_MODEL_SIZE)
        logger.info("Loaded Whisper model: %s", WHISPER_MODEL_SIZE)
    except ImportError:
        logger.warning("openai-whisper not installed, using stub transcriber")
        _model = "stub"
    return _model


def transcribe_audio(file_path: str, language: str = "en") -> TranscribeResponse:
    global _model
    if _model is None and not SKIP_WARMUP:
        load_model()

    if _model == "stub" or SKIP_WARMUP:
        return TranscribeResponse(
            text=(
                "Patient presents with chest pain and shortness of breath. "
                "Onset three days ago. No fever. History of hypertension and "
                "type 2 diabetes. Currently on metformin 500mg twice daily "
                "and lisinopril 10mg daily."
            ),
            segments=[
                Segment(id=0, start=0.0, end=8.5,
                        text="Patient presents with chest pain and shortness of breath.",
                        confidence=0.94),
                Segment(id=1, start=8.5, end=15.0,
                        text="Onset three days ago. No fever.", confidence=0.96),
                Segment(id=2, start=15.0, end=28.0,
                        text=(
                            "History of hypertension and type 2 diabetes. "
                            "Currently on metformin 500mg twice daily and lisinopril 10mg daily."
                        ),
                        confidence=0.92),
            ],
            word_timestamps=[],
            language="en",
            duration_seconds=28.0,
            model_used=f"whisper-{WHISPER_MODEL_SIZE}-stub",
            requires_human_review=True,
        )

    import whisper  # noqa: F811
    result = _model.transcribe(file_path, language=language, word_timestamps=True)

    segments = [
        Segment(
            id=i,
            start=seg["start"],
            end=seg["end"],
            text=seg["text"].strip(),
            confidence=max(0.0, min(1.0, seg.get("avg_logprob", -0.5) + 1.0)),
        )
        for i, seg in enumerate(result.get("segments", []))
    ]

    word_timestamps = []
    for seg in result.get("segments", []):
        for word in seg.get("words", []):
            word_timestamps.append(
                WordTimestamp(
                    word=word["word"].strip(),
                    start=word["start"],
                    end=word["end"],
                    confidence=max(0.0, min(1.0, word.get("probability", 0.9))),
                )
            )

    duration = segments[-1].end if segments else 0.0

    return TranscribeResponse(
        text=result["text"].strip(),
        segments=segments,
        word_timestamps=word_timestamps,
        language=result.get("language", language),
        duration_seconds=duration,
        model_used=f"whisper-{WHISPER_MODEL_SIZE}",
        requires_human_review=True,
    )
