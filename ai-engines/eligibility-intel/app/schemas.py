from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    """Used when real-time MMIS lookup fails or is slow — gives a confidence-scored guess."""
    state_code: str
    patient_age: int = Field(..., ge=0, le=130)
    household_income_annual_cents: Optional[int] = None
    pregnant: bool = False
    disabled: bool = False
    medicaid_id: Optional[str] = None       # if present, eligibility is highly likely
    coverage_type_requested: str = "medicaid"  # 'medicaid' | 'medicare' | 'chip' | 'commercial'


class BenefitDetail(BaseModel):
    name: str
    covered: bool
    notes: Optional[str] = None


class PredictResponse(BaseModel):
    engine_version: str
    state_code: str
    likely_eligible: bool
    probability: float
    suggested_program: str            # 'medicaid_chip', 'medicare_a_b', 'marketplace', 'uninsured'
    benefits: list[BenefitDetail]
    explanation: str
    requires_real_lookup: bool = True
