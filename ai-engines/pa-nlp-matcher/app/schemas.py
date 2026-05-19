"""Pydantic request/response models."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class MatchRequest(BaseModel):
    """Input to /v1/match — called by prior-auth-service."""
    criteria_text: str = Field(..., min_length=1, description="Full coverage criteria document text.")
    clinical_context: str = Field(default="", description="Patient clinical notes / extracted summary.")
    diagnosis_codes: list[str] = Field(default_factory=list, description="ICD-10 codes attached to the encounter.")
    service_code: str = Field(..., description="CPT/HCPCS/NDC being requested.")


class CriterionResult(BaseModel):
    criterion_text: str
    status: Literal["met", "not_met", "indeterminate"]
    confidence: float = Field(..., ge=0.0, le=1.0)
    evidence_excerpt: Optional[str] = None
    evidence_doc_id: Optional[str] = None


class MatchResponse(BaseModel):
    engine_version: str
    overall_score: float = Field(..., ge=0.0, le=1.0)
    criteria: list[CriterionResult]
    explanation: str = Field(..., description="Plain-language explanation for humans (CLAUDE.md AI governance).")


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    engine_version: str
