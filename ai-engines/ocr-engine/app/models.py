from pydantic import BaseModel
from typing import List, Optional, Dict
from enum import Enum


class DocumentClass(str, Enum):
    medical_license = "medical_license"
    dea_certificate = "dea_certificate"
    npi_letter = "npi_letter"
    board_certification = "board_certification"
    malpractice_insurance = "malpractice_insurance"
    w9_form = "w9_form"
    caqh_attestation = "caqh_attestation"
    government_id = "government_id"
    pecos_enrollment = "pecos_enrollment"
    other = "other"


class OcrRequest(BaseModel):
    file_path: str  # local path or MinIO path
    file_type: str = "image"  # image | pdf
    provider_id: Optional[str] = None


class ExtractedField(BaseModel):
    field_name: str
    value: str
    confidence: float


class OcrResponse(BaseModel):
    raw_text: str
    document_class: DocumentClass
    classification_confidence: float
    extracted_fields: List[ExtractedField]
    page_count: int
    model_used: str
    requires_human_review: bool = True  # AI governance
