"""
Spec-defined data models for eligibility-intel.

These mirror the canonical interface described in the MedGuard360 build spec.
The richer runtime schemas used internally live in schemas.py.
Consumers (eligibility-service, tests) should import from schemas.py for full
field coverage; this module exists as a stable spec contract.
"""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel


class EligibilityRequest(BaseModel):
    """Input payload sent by eligibility-service when MMIS is unreachable."""
    state_code: str
    patient_id: str
    medicaid_id: Optional[str] = None
    dob: Optional[str] = None           # YYYY-MM-DD
    household_size: Optional[int] = None
    annual_income: Optional[float] = None
    payer_type: str = "medicaid"        # medicaid | medicare | commercial


class BenefitDetail(BaseModel):
    benefit_name: str
    covered: bool
    prior_auth_required: bool
    copay_amount: Optional[float] = None
    description: str


class EligibilityPrediction(BaseModel):
    """Output produced by the eligibility prediction engine."""
    patient_id: str
    predicted_eligible: bool
    suggested_program: str              # medicaid_chip | medicare_a_b | marketplace | uninsured
    confidence: float
    annual_income_estimate: Optional[float] = None
    fpl_percentage: Optional[float] = None      # % of federal poverty level
    benefits: List[BenefitDetail]
    explanation: str                    # plain-language explanation
    requires_human_review: bool = True
    model_version: str = "rules-2026-fpl-v1"
