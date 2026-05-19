from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class TranscribeUrlRequest(BaseModel):
    audio_url: str = Field(..., description="MinIO/HTTP URL to audio file.")
    language: Optional[str] = Field(default=None, description="ISO 639-1 (en, es, ...). None = autodetect.")
    encounter_id: Optional[str] = Field(default=None, description="Echoed back for correlation.")


class WordTimestamp(BaseModel):
    word: str
    start: float          # seconds
    end: float
    probability: float


class Segment(BaseModel):
    id: int
    text: str
    start: float
    end: float
    avg_logprob: float
    words: list[WordTimestamp] = Field(default_factory=list)


class TranscriptionResponse(BaseModel):
    engine_version: str
    encounter_id: Optional[str]
    language: str
    duration_seconds: float
    text: str
    segments: list[Segment]
    overall_confidence: float
