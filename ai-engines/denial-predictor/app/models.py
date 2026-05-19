"""
Spec-defined data models for denial-predictor.

These mirror the canonical interface described in the MedGuard360 build spec.
The richer runtime schemas used internally live in schemas.py.
Consumers (denial-service, tests) should import from schemas.py for full
field coverage; this module exists as a stable spec contract.
"""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel


class DenialPredictRequest(BaseModel):
    """Pre-submission claim risk assessment input."""
    claim_id: str
    procedure_codes: List[str]
    diagnosis_codes: List[str]
    payer_id: str
    state_code: str
    total_amount: float
    provider_specialty: Optional[str] = None
    has_prior_auth: bool = False


class DenialPrediction(BaseModel):
    """Denial risk assessment output."""
    claim_id: str
    denial_probability: float           # 0.0–1.0
    predicted_denial_reason: Optional[str] = None
    carc_code: Optional[str] = None     # Claim Adjustment Reason Code
    confidence: float
    explanation: str
    recommendations: List[str]          # actions to reduce denial risk
    requires_human_review: bool = True


class AppealDraftRequest(BaseModel):
    """Post-denial appeal letter generation input."""
    denial_id: str
    claim_id: str
    denial_reason: str
    carc_code: Optional[str] = None
    procedure_codes: List[str]
    diagnosis_codes: List[str]
    clinical_notes_summary: Optional[str] = None
    provider_name: str
    patient_id: str
    payer_name: str


class AppealDraft(BaseModel):
    """AI-generated appeal letter with supporting guidance."""
    denial_id: str
    appeal_letter: str                  # full draft appeal letter text
    key_arguments: List[str]
    supporting_docs_needed: List[str]
    recommended_deadline: str           # e.g. "90 days from denial date"
    requires_human_review: bool = True  # always True
    draft_version: str = "ai-draft-v1"
