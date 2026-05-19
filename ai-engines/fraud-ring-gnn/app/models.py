from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class ProviderNode(BaseModel):
    provider_id: str
    npi: str
    specialty: Optional[str] = None
    state_code: str
    monthly_claim_count: int = 0
    avg_claim_amount: float = 0.0


class PatientNode(BaseModel):
    patient_id: str
    state_code: str
    monthly_visit_count: int = 0


class ClaimEdge(BaseModel):
    provider_id: str
    patient_id: str
    claim_count: int
    total_amount: float
    date_range_days: int


class RingAnalysisRequest(BaseModel):
    providers: List[ProviderNode]
    patients: List[PatientNode]
    edges: List[ClaimEdge]
    analysis_period_days: int = 90


class RingMember(BaseModel):
    node_id: str
    node_type: str  # provider | patient
    anomaly_score: float
    connections: int


class DetectedRing(BaseModel):
    ring_id: str
    members: List[RingMember]
    ring_score: float  # 0-100
    pattern_type: str  # star | chain | hub_spoke | circular
    explanation: str


class RingAnalysisResponse(BaseModel):
    detected_rings: List[DetectedRing]
    total_nodes_analyzed: int
    suspicious_node_count: int
    overall_risk_score: float
    explanation: str
    requires_human_review: bool = True
    model_version: str
