from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


class DetectRequest(BaseModel):
    text: str = Field(..., min_length=1)
    context: Optional[str] = Field(default=None, description="Origin: 'clinical_note' | 'hub_chat' | 'sms' | 'survey'")
    patient_id: Optional[str] = None


class CrisisSignal(BaseModel):
    category: Literal[
        "suicidal_ideation","self_harm","homicidal_ideation","substance_overdose",
        "domestic_violence","child_abuse","severe_psychosis","none",
    ]
    confidence: float = Field(..., ge=0.0, le=1.0)
    excerpts: list[str]


class DetectResponse(BaseModel):
    engine_version: str
    is_crisis: bool
    severity: Literal["none","low","moderate","high","critical"]
    signals: list[CrisisSignal]
    recommended_action: str
    explanation: str
