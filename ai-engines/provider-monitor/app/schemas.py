from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


class ProviderSnapshot(BaseModel):
    provider_id: str
    npi: str
    state_code: str
    last_credentialed_at: str
    license_expires_at: Optional[str] = None
    dea_expires_at: Optional[str] = None
    malpractice_expires_at: Optional[str] = None
    last_psv_checked_at: Optional[str] = None

    # Billing pattern features for anomaly detection
    avg_monthly_claims: float = 0
    monthly_claims_30d: int = 0
    avg_claim_charge_cents: float = 0
    avg_claim_charge_30d_cents: float = 0
    distinct_patients_30d: int = 0
    avg_distinct_patients_per_month: float = 0


class MonitorRequest(BaseModel):
    snapshots: list[ProviderSnapshot] = Field(default_factory=list)


class MonitorFinding(BaseModel):
    provider_id: str
    severity: Literal["info","warn","critical"]
    code: str       # 'LICENSE_EXPIRING_SOON', 'BILLING_VOLUME_SPIKE', ...
    label: str
    detail: str


class MonitorResponse(BaseModel):
    engine_version: str
    findings: list[MonitorFinding]
