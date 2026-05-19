from pydantic import BaseModel
from typing import List, Optional


class CrisisDetectRequest(BaseModel):
    text: str  # clinical note or transcript segment
    context: Optional[str] = None  # encounter type, patient history
    patient_id: Optional[str] = None
    encounter_id: Optional[str] = None


class CrisisIndicator(BaseModel):
    phrase: str
    indicator_type: str  # suicidal_ideation | self_harm | homicidal | substance_crisis | psychiatric_emergency
    severity: str  # mild | moderate | severe
    confidence: float


class CrisisDetectResponse(BaseModel):
    crisis_detected: bool
    crisis_level: str  # none | low | medium | high | critical
    confidence: float
    indicators: List[CrisisIndicator]
    explanation: str
    recommended_action: str
    requires_human_review: bool = True  # always True for crisis
    model_version: str
