from enum import Enum
from pydantic import BaseModel
from typing import List, Optional


class CodeType(str, Enum):
    icd10 = "ICD-10"
    cpt = "CPT"
    hcpcs = "HCPCS"
    snomed = "SNOMED"


class SuggestedCode(BaseModel):
    code: str
    description: str
    code_type: CodeType
    confidence: float
    rationale: str


class ClinicalEntity(BaseModel):
    text: str
    label: str
    start: int
    end: int
    confidence: float


class AnalyzeRequest(BaseModel):
    text: str
    provider_id: Optional[str] = None
    encounter_id: Optional[str] = None
    context: Optional[str] = None


class AnalyzeResponse(BaseModel):
    entities: List[ClinicalEntity]
    suggested_diagnosis_codes: List[SuggestedCode]
    suggested_procedure_codes: List[SuggestedCode]
    summary: str
    requires_human_review: bool = True
    model_used: str
