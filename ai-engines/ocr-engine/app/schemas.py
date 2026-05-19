from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


DocClass = Literal[
    "medical_license",
    "dea_certificate",
    "board_certification",
    "malpractice_insurance",
    "w9",
    "voided_check",
    "drivers_license",
    "diploma",
    "cv_resume",
    "other",
]


class OcrRequest(BaseModel):
    document_url: str = Field(..., description="MinIO/HTTP URL to image or PDF.")
    correlation_id: Optional[str] = None
    expected_class: Optional[DocClass] = None  # if known by caller, used to bias extraction


class ExtractedField(BaseModel):
    name: str
    value: str
    confidence: float


class OcrResponse(BaseModel):
    engine_version: str
    correlation_id: Optional[str]
    text: str
    classified_as: DocClass
    classification_confidence: float
    extracted_fields: list[ExtractedField]
    page_count: int
