from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    encounter_id: Optional[str] = None
    note_text: str = Field(..., min_length=1)


class ClinicalEntity(BaseModel):
    text: str
    type: Literal["disease", "medication", "procedure", "symptom", "anatomy", "other"]
    start: int
    end: int
    confidence: float


class SuggestedCode(BaseModel):
    code: str
    code_system: Literal["ICD-10", "CPT", "HCPCS"]
    description: str
    confidence: float
    rationale: str         # plain-language explanation per AI governance


class AnalyzeResponse(BaseModel):
    engine_version: str
    encounter_id: Optional[str]
    entities: list[ClinicalEntity]
    suggested_diagnosis_codes: list[SuggestedCode]
    suggested_procedure_codes: list[SuggestedCode]
    summary: str
