from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class CriterionOutcome(str, Enum):
    met = "met"
    not_met = "not_met"
    indeterminate = "indeterminate"


class MatchRequest(BaseModel):
    clinical_text: str  # combined clinical note + diagnosis codes
    criteria: List[str]  # list of criterion texts to evaluate against
    threshold_met: float = 0.70  # score >= this → met
    threshold_not_met: float = 0.30  # score <= this → not_met
    model_name: Optional[str] = None  # override model if needed


class CriterionMatch(BaseModel):
    criterion_text: str
    similarity_score: float = Field(ge=0.0, le=1.0)
    outcome: CriterionOutcome
    explanation: str  # plain-language explanation


class MatchResponse(BaseModel):
    overall_recommendation: str  # approve | deny | needs_more_info
    overall_confidence: float
    explanation: str  # plain-language summary
    criterion_matches: List[CriterionMatch]
    model_used: str
    requires_human_review: bool  # always True (AI governance)


class OverrideLogRequest(BaseModel):
    pa_request_id: str
    predicted_recommendation: str
    human_decision: str
    specialist_id: str
    override_reason: str
