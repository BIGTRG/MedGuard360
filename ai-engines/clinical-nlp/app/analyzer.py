"""
Clinical NLP analyzer.

Production deployment uses scispaCy models (en_core_sci_md + en_ner_bc5cdr_md)
for biomedical NER. The wrapper here gracefully falls back to a deterministic
keyword-based extractor if scispaCy isn't installed, so the rest of the
platform can run without the heavy ML deps during dev.

The `analyze()` signature is stable — swap implementations without breaking
callers.
"""
from __future__ import annotations

import os
import re
from functools import lru_cache

from .schemas import AnalyzeResponse, ClinicalEntity, SuggestedCode

ENGINE_VERSION = "clinical-nlp/0.1.0"

# Minimal seed dictionary for code suggestion — real deployment loads from
# UMLS/SNOMED + ICD-10 + CPT crosswalks. This lets the rest of the platform
# get end-to-end before the full medical-coding pipeline is wired up.
_DIAGNOSIS_HINTS: list[tuple[re.Pattern[str], str, str]] = [
    (re.compile(r"\b(major depressive disorder|mdd|depression)\b", re.I), "F32.9", "Major depressive disorder, unspecified"),
    (re.compile(r"\b(hypertension|high blood pressure|htn)\b", re.I),     "I10",   "Essential (primary) hypertension"),
    (re.compile(r"\btype 2 diabet\w*|t2dm\b", re.I),                       "E11.9", "Type 2 diabetes mellitus without complications"),
    (re.compile(r"\bgeneralized anxiety|anxiety disorder|gad\b", re.I),    "F41.1", "Generalized anxiety disorder"),
    (re.compile(r"\b(asthma)\b", re.I),                                    "J45.909", "Unspecified asthma, uncomplicated"),
    (re.compile(r"\b(opioid use disorder|oud)\b", re.I),                    "F11.20", "Opioid dependence, uncomplicated"),
    (re.compile(r"\b(post[-\s]?traumatic stress disorder|ptsd)\b", re.I),   "F43.10", "Post-traumatic stress disorder, unspecified"),
    (re.compile(r"\b(otitis media)\b", re.I),                              "H66.90", "Otitis media, unspecified, unspecified ear"),
]
_PROCEDURE_HINTS: list[tuple[re.Pattern[str], str, str]] = [
    (re.compile(r"\b(office visit|established patient).*?(15|20|25|30)\s?min", re.I),     "99213", "Office visit, established patient, low complexity"),
    (re.compile(r"\b(office visit|established patient).*?(40|45|50)\s?min", re.I),         "99214", "Office visit, established patient, moderate complexity"),
    (re.compile(r"\b(psychotherapy).*?(45|50|55)\s?min", re.I),                            "90834", "Psychotherapy, 45 minutes"),
    (re.compile(r"\b(psychotherapy).*?(60)\s?min", re.I),                                  "90837", "Psychotherapy, 60 minutes"),
    (re.compile(r"\b(telehealth|telemedicine|video visit)\b", re.I),                       "99421", "Telehealth assessment (asynchronous)"),
]


@lru_cache(maxsize=1)
def _scispacy_pipeline():
    if os.environ.get("USE_SCISPACY", "0") != "1":
        return None
    try:
        import spacy
        return spacy.load("en_core_sci_md")
    except Exception:
        return None


def warmup() -> None:
    _scispacy_pipeline()


def _extract_entities(text: str) -> list[ClinicalEntity]:
    nlp = _scispacy_pipeline()
    if nlp is not None:
        doc = nlp(text)
        out: list[ClinicalEntity] = []
        for ent in doc.ents:
            etype = _map_label(ent.label_)
            out.append(ClinicalEntity(
                text=ent.text, type=etype,        # type: ignore[arg-type]
                start=int(ent.start_char), end=int(ent.end_char),
                confidence=0.85,
            ))
        return out
    # Fallback: regex over the seed dictionary
    out2: list[ClinicalEntity] = []
    for pat, _code, desc in _DIAGNOSIS_HINTS:
        for m in pat.finditer(text):
            out2.append(ClinicalEntity(
                text=m.group(0), type="disease",
                start=m.start(), end=m.end(), confidence=0.70,
            ))
    for pat, _code, desc in _PROCEDURE_HINTS:
        for m in pat.finditer(text):
            out2.append(ClinicalEntity(
                text=m.group(0), type="procedure",
                start=m.start(), end=m.end(), confidence=0.70,
            ))
    return out2


def _suggest_codes(text: str) -> tuple[list[SuggestedCode], list[SuggestedCode]]:
    diag: list[SuggestedCode] = []
    proc: list[SuggestedCode] = []
    for pat, code, desc in _DIAGNOSIS_HINTS:
        m = pat.search(text)
        if m:
            diag.append(SuggestedCode(
                code=code, code_system="ICD-10", description=desc, confidence=0.80,
                rationale=f"Matched phrase '{m.group(0)}' in clinical note.",
            ))
    for pat, code, desc in _PROCEDURE_HINTS:
        m = pat.search(text)
        if m:
            proc.append(SuggestedCode(
                code=code, code_system="CPT", description=desc, confidence=0.75,
                rationale=f"Matched phrase '{m.group(0)}' in clinical note.",
            ))
    return diag, proc


def _map_label(label: str) -> str:
    L = label.lower()
    if L in ("disease", "disorder", "syndrome"): return "disease"
    if L in ("drug", "medication", "chemical"):  return "medication"
    if L in ("procedure",):                       return "procedure"
    if L in ("sign", "symptom"):                  return "symptom"
    if L in ("anatomy", "body_part"):             return "anatomy"
    return "other"


def analyze(note_text: str, encounter_id: str | None) -> AnalyzeResponse:
    entities = _extract_entities(note_text)
    diagnosis_codes, procedure_codes = _suggest_codes(note_text)

    parts = [
        f"Extracted {len(entities)} clinical entities from the note.",
        f"Suggested {len(diagnosis_codes)} ICD-10 diagnosis code(s) and {len(procedure_codes)} CPT procedure code(s).",
        "All suggestions must be reviewed and approved by a clinician before billing (AI governance).",
    ]

    return AnalyzeResponse(
        engine_version=ENGINE_VERSION,
        encounter_id=encounter_id,
        entities=entities,
        suggested_diagnosis_codes=diagnosis_codes,
        suggested_procedure_codes=procedure_codes,
        summary=" ".join(parts),
    )
