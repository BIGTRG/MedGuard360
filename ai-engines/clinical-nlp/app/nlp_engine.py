import os
import re
import logging
from typing import List

from .models import AnalyzeRequest, AnalyzeResponse, ClinicalEntity, SuggestedCode, CodeType

USE_SCISPACY = os.getenv("USE_SCISPACY", "0") == "1"
SKIP_WARMUP = os.getenv("SKIP_WARMUP", "")

DIAGNOSIS_PATTERNS = [
    (r"\bchest\s+pain\b", "R07.9", "Chest pain, unspecified", 0.85),
    (r"\bshortness\s+of\s+breath\b|dyspnea", "R06.00", "Dyspnea, unspecified", 0.88),
    (r"\bhypertension\b|\bhigh\s+blood\s+pressure\b", "I10", "Essential (primary) hypertension", 0.92),
    (r"\btype\s+2\s+diabetes\b|\bT2DM\b|\bdiabetes\s+mellitus\b", "E11.9", "Type 2 diabetes mellitus without complications", 0.90),
    (r"\bdepression\b|\bmajor\s+depressive\b", "F32.9", "Major depressive disorder, single episode, unspecified", 0.82),
    (r"\banxiety\b|\bgeneralized\s+anxiety\b", "F41.1", "Generalized anxiety disorder", 0.80),
    (r"\bUTI\b|\burinary\s+tract\s+infection\b", "N39.0", "Urinary tract infection, site not specified", 0.87),
    (r"\bback\s+pain\b|\blumbar\s+pain\b", "M54.5", "Low back pain", 0.83),
]

PROCEDURE_PATTERNS = [
    (r"\bECG\b|\bEKG\b|\belectrocardiogram\b", "93000", "Electrocardiogram, routine ECG with at least 12 leads", 0.90),
    (r"\bblood\s+pressure\b.*?check|vitals\b", "99213", "Office outpatient visit, established patient, low complexity", 0.75),
    (r"\bchest\s+x.ray\b|CXR\b", "71046", "Radiologic examination, chest; 2 views", 0.88),
    (r"\bcomplete\s+blood\s+count\b|CBC\b", "85025", "Blood count; complete (CBC), automated", 0.92),
    (r"\bA1C\b|\bhemoglobin\s+A1C\b", "83036", "Hemoglobin; glycosylated (A1C)", 0.94),
]

ENTITY_PATTERNS = [
    (r"\b(?:metformin|lisinopril|amlodipine|atorvastatin|omeprazole|sertraline|alprazolam|gabapentin)\b", "MEDICATION"),
    (r"\b(?:hypertension|diabetes|depression|anxiety|COPD|asthma|CHF|pneumonia|UTI)\b", "DISEASE"),
    (r"\b(?:chest pain|shortness of breath|fatigue|dizziness|nausea|headache|fever)\b", "SYMPTOM"),
    (r"\b(?:ECG|CBC|CXR|MRI|CT scan|ultrasound|biopsy|colonoscopy)\b", "PROCEDURE"),
    (r"\b(?:heart|lung|kidney|liver|brain|spine|abdomen|chest|pelvis)\b", "ANATOMY"),
]


def analyze_text(request: AnalyzeRequest, nlp_model=None) -> AnalyzeResponse:
    text = request.text

    entities: List[ClinicalEntity] = []
    for pattern, label in ENTITY_PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            entities.append(ClinicalEntity(
                text=match.group(), label=label,
                start=match.start(), end=match.end(), confidence=0.82,
            ))

    if USE_SCISPACY and nlp_model and nlp_model != "stub":
        try:
            doc = nlp_model(text)
            for ent in doc.ents:
                entities.append(ClinicalEntity(
                    text=ent.text, label=ent.label_,
                    start=ent.start_char, end=ent.end_char, confidence=0.88,
                ))
        except Exception:
            pass

    seen: set = set()
    unique_entities: List[ClinicalEntity] = []
    for e in entities:
        key = (e.text.lower(), e.label)
        if key not in seen:
            seen.add(key)
            unique_entities.append(e)

    dx_codes: List[SuggestedCode] = []
    for pattern, code, desc, conf in DIAGNOSIS_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            dx_codes.append(SuggestedCode(
                code=code, description=desc, code_type=CodeType.icd10,
                confidence=conf,
                rationale=f"Clinical text contains '{m.group()}' which matches ICD-10 {code}",
            ))

    proc_codes: List[SuggestedCode] = []
    for pattern, code, desc, conf in PROCEDURE_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            proc_codes.append(SuggestedCode(
                code=code, description=desc, code_type=CodeType.cpt,
                confidence=conf,
                rationale=f"Clinical text indicates '{m.group()}' which maps to CPT {code}",
            ))

    dx_list = ", ".join(s.description for s in dx_codes[:3]) if dx_codes else "none identified"
    proc_list = ", ".join(s.description for s in proc_codes[:3]) if proc_codes else "none identified"
    summary = (
        f"Identified {len(unique_entities)} clinical entities. "
        f"Suggested diagnoses: {dx_list}. "
        f"Suggested procedures: {proc_list}. "
        "All codes require clinician verification before submission."
    )

    return AnalyzeResponse(
        entities=unique_entities,
        suggested_diagnosis_codes=dx_codes,
        suggested_procedure_codes=proc_codes,
        summary=summary,
        requires_human_review=True,
        model_used="scispacy-en_core_sci_md" if USE_SCISPACY else "regex-v1.0",
    )


def load_nlp_model():
    if USE_SCISPACY:
        try:
            import spacy
            return spacy.load("en_core_sci_md")
        except Exception:
            logging.warning("scispaCy model not available, using regex fallback")
    return "stub"
