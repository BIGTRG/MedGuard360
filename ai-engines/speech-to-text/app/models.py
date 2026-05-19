from pydantic import BaseModel, Field
from typing import List, Optional


class TranscribeRequest(BaseModel):
    audio_file_path: str
    language: str = "en"
    task: str = "transcribe"
    provider_id: Optional[str] = None
    patient_id: Optional[str] = None


class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float
    confidence: float = Field(ge=0.0, le=1.0)


class Segment(BaseModel):
    id: int
    start: float
    end: float
    text: str
    confidence: float


class TranscribeResponse(BaseModel):
    text: str
    segments: List[Segment]
    word_timestamps: List[WordTimestamp]
    language: str
    duration_seconds: float
    model_used: str
    requires_human_review: bool = True
