from pydantic import BaseModel, Field
from typing import List, Optional


class ClaimFeatures(BaseModel):
    claim_id: str
    provider_id: str
    patient_id: str
    state_code: str
    service_date: str  # YYYY-MM-DD
    total_amount: float
    procedure_codes: List[str]
    diagnosis_codes: List[str]
    payer_id: str
    # Optional features for enhanced detection
    submission_hour: Optional[int] = None  # 0-23
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    provider_monthly_claims: Optional[int] = None
    patient_monthly_claims: Optional[int] = None


class FraudFlag(BaseModel):
    flag_type: str
    severity: str  # low | medium | high | critical
    description: str
    contributing_factor: float  # 0.0-1.0


class FraudPrediction(BaseModel):
    claim_id: str
    risk_score: int = Field(ge=1, le=100)
    risk_level: str  # low | medium | high | critical
    recommendation: str  # auto_pay | route_to_review | auto_block
    flags: List[FraudFlag]
    explanation: str  # plain-language summary
    model_version: str
    requires_human_review: bool


class OverrideLogRequest(BaseModel):
    claim_id: str
    predicted_risk_score: int
    human_risk_score: int
    investigator_id: str
    override_reason: str
