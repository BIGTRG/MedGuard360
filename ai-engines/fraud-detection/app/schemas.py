from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ClaimFeatures(BaseModel):
    """Feature vector extracted from a claim by fraud-engine-service."""
    claim_id: str
    provider_id: str
    patient_id: str
    state_code: str
    total_charge_cents: int = Field(..., ge=0)
    line_count: int = Field(..., ge=1)
    avg_line_charge_cents: float = Field(..., ge=0)
    service_codes: list[str] = Field(default_factory=list)
    diagnosis_codes: list[str] = Field(default_factory=list)

    # Behavioral features the engine pre-computes from history
    provider_claims_last_24h: int = 0
    provider_claims_last_7d: int = 0
    provider_avg_charge_30d_cents: int = 0
    patient_claims_last_30d: int = 0
    distance_provider_to_patient_miles: Optional[float] = None
    submitted_at_hour: int = Field(..., ge=0, le=23)
    submitted_at_weekday: int = Field(..., ge=0, le=6)


class FraudFlag(BaseModel):
    code: str       # 'UNUSUAL_VOLUME', 'CHARGE_OUTLIER', 'DISTANCE_ANOMALY', ...
    label: str      # human-readable
    severity: float = Field(..., ge=0.0, le=1.0)


class ScoreResponse(BaseModel):
    engine_version: str
    claim_id: str
    score: int = Field(..., ge=1, le=100, description="1=safe, 100=highly suspicious")
    recommendation: str = Field(..., description="auto_pay | route_to_review | auto_block")
    flags: list[FraudFlag]
    explanation: str
