from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


class NodeInput(BaseModel):
    id: str
    type: Literal["provider","patient","facility","address","phone","bank_account","npi","ein"]
    label: Optional[str] = None


class EdgeInput(BaseModel):
    source: str
    target: str
    relation: str        # 'bills', 'lives_at', 'phone_for', 'shares_address', 'shared_bank', etc.
    weight: float = 1.0


class DetectRequest(BaseModel):
    nodes: list[NodeInput]
    edges: list[EdgeInput]
    min_ring_size: int = Field(default=3, ge=2, le=50)


class DetectedRing(BaseModel):
    members: list[str]                  # node ids
    size: int
    suspicion_score: float
    shared_attributes: list[str]        # ['address','phone','bank']
    explanation: str


class DetectResponse(BaseModel):
    engine_version: str
    rings: list[DetectedRing]
    total_nodes: int
    total_edges: int
