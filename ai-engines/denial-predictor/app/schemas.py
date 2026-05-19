from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    """Called pre-submission by claims-service to flag risky claims."""
    claim_id: str
    payer_id: str
    state_code: str
    service_codes: list[str]
    diagnosis_codes: list[str]
    total_charge_cents: int = Field(..., ge=0)
    place_of_service: Optional[str] = None
    modifier_count: int = 0
    pa_present: bool = False
    pa_status: Optional[str] = None              # 'approved' | 'denied' | 'needs_more_info' | None


class DenialRisk(BaseModel):
    code: str           # CARC: '197' = no PA, '11' = diag/procedure mismatch, '50' = not medically necessary, etc.
    description: str
    probability: float  # 0..1


class PredictResponse(BaseModel):
    engine_version: str
    claim_id: str
    overall_denial_probability: float
    likely_reasons: list[DenialRisk]
    recommendation: str        # 'submit_as_is' | 'address_risks_first' | 'do_not_submit'
    explanation: str


class DraftAppealRequest(BaseModel):
    """Called post-denial by denial-service to draft an appeal letter."""
    claim_id: str
    denial_code: str           # CARC
    denial_description: str
    clinical_summary: str      # extracted from clinical-doc-service
    payer_id: str
    patient_first_name: Optional[str] = None
    patient_last_name: Optional[str] = None
    provider_name: Optional[str] = None
    service_codes: list[str] = []
    diagnosis_codes: list[str] = []


class DraftAppealResponse(BaseModel):
    engine_version: str
    appeal_subject: str
    appeal_body: str
    suggested_attachments: list[str]    # e.g. "Clinical notes for service date", "PA approval letter"
    confidence: float
    requires_human_review: bool = True
