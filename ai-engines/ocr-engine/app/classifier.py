from .models import DocumentClass
from typing import Tuple
import re

# Classification rules: if text contains these keywords → class
CLASSIFICATION_RULES = [
    (DocumentClass.medical_license, ['medical license', 'license to practice', 'physician license', 'medical board'], ['license number', 'expiration', 'state board']),
    (DocumentClass.dea_certificate, ['drug enforcement', 'DEA', 'controlled substances', 'schedules'], ['registration number', 'DEA number']),
    (DocumentClass.npi_letter, ['national provider identifier', 'NPI', 'NPPES'], ['NPI number', 'provider type']),
    (DocumentClass.board_certification, ['board certified', 'american board', 'diplomate', 'certification'], ['specialty', 'certification date']),
    (DocumentClass.malpractice_insurance, ['professional liability', 'malpractice', 'occurrence limit', 'aggregate limit'], ['policy number', 'insurer']),
    (DocumentClass.w9_form, ['W-9', 'Request for Taxpayer', 'taxpayer identification', 'TIN'], ['EIN', 'SSN']),
    (DocumentClass.caqh_attestation, ['CAQH', 'Universal Provider Datasource', 'attestation'], ['CAQH ID']),
    (DocumentClass.pecos_enrollment, ['PECOS', 'Medicare enrollment', 'CMS', 'Centers for Medicare'], ['enrollment ID', 'NPI']),
    (DocumentClass.government_id, ['driver license', "driver's license", 'state id', 'passport'], ['date of birth', 'expiration date']),
]

# Field extractors per document class
FIELD_EXTRACTORS = {
    DocumentClass.medical_license: [
        ('license_number', r'(?:license\s+(?:number|no\.?|#)\s*:?\s*)([A-Z0-9\-]+)', 0.90),
        ('expiration_date', r'(?:expir(?:ation|es?)\s*:?\s*)(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})', 0.85),
        ('issuing_state', r'(?:state\s+of\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)', 0.80),
    ],
    DocumentClass.dea_certificate: [
        ('dea_number', r'(?:DEA\s+(?:number|no\.?|registration\s+number)\s*:?\s*)([A-Z]{2}\d{7})', 0.92),
        ('expiration_date', r'(?:expir(?:ation|es?)\s*:?\s*)(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})', 0.85),
    ],
    DocumentClass.npi_letter: [
        ('npi_number', r'\b(\d{10})\b', 0.88),
    ],
    DocumentClass.malpractice_insurance: [
        ('policy_number', r'(?:policy\s+(?:number|no\.?)\s*:?\s*)([A-Z0-9\-]+)', 0.87),
        ('per_occurrence_limit', r'\$\s*([\d,]+)\s*(?:per\s+occurrence)', 0.82),
        ('aggregate_limit', r'\$\s*([\d,]+)\s*(?:aggregate)', 0.82),
    ],
    DocumentClass.w9_form: [
        ('tin', r'(?:EIN|SSN|TIN)\s*:?\s*(\d{2,3}[-\s]?\d{2}[-\s]?\d{4,})', 0.85),
        ('business_name', r'(?:name\s+of\s+(?:business|entity)\s*:?\s*)(.+?)(?:\n|$)', 0.75),
    ],
}


def classify_document(text: str) -> Tuple[DocumentClass, float]:
    """Classify document by keyword matching. Returns (class, confidence)."""
    text_lower = text.lower()
    scores = {}

    for doc_class, primary_kw, secondary_kw in CLASSIFICATION_RULES:
        score = 0.0
        # Primary keywords (stronger signal)
        for kw in primary_kw:
            if kw.lower() in text_lower:
                score += 0.25
        # Secondary keywords
        for kw in secondary_kw:
            if kw.lower() in text_lower:
                score += 0.10
        if score > 0:
            scores[doc_class] = min(score, 0.98)

    if not scores:
        return DocumentClass.other, 0.50

    best_class = max(scores, key=scores.get)
    return best_class, scores[best_class]


def extract_fields(text: str, doc_class: DocumentClass) -> list:
    """Extract structured fields from text based on document class."""
    from .models import ExtractedField
    fields = []
    extractors = FIELD_EXTRACTORS.get(doc_class, [])

    for field_name, pattern, confidence in extractors:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            fields.append(ExtractedField(
                field_name=field_name,
                value=match.group(1).strip(),
                confidence=confidence,
            ))

    return fields
