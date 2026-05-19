from pydantic import BaseModel
from typing import List, Optional


class ProviderMonitorRequest(BaseModel):
    provider_id: str
    npi: str
    state_code: str
    license_expiry_date: Optional[str] = None  # YYYY-MM-DD
    dea_expiry_date: Optional[str] = None
    malpractice_expiry_date: Optional[str] = None
    last_leie_check: Optional[str] = None
    last_pecos_check: Optional[str] = None
    monthly_claim_count: int = 0
    monthly_claim_total: float = 0.0
    prior_month_claim_count: int = 0
    prior_month_claim_total: float = 0.0


class MonitorAlert(BaseModel):
    alert_type: str  # expiring_credential | exclusion_check_overdue | billing_spike | high_claim_volume
    severity: str  # info | warning | critical
    description: str
    days_until_expiry: Optional[int] = None
    recommended_action: str


class MonitorResult(BaseModel):
    provider_id: str
    npi: str
    overall_risk_level: str  # low | medium | high
    alerts: List[MonitorAlert]
    billing_anomaly_score: float  # 0-100
    explanation: str
    next_check_date: str  # ISO date for when to run monitor again
    requires_human_review: bool
