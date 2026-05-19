import os
os.environ["SKIP_WARMUP"] = "1"

from app.models import AnalyzeRequest
from app.nlp_engine import analyze_text


def test_chest_pain_detection():
    req = AnalyzeRequest(text="Patient presents with chest pain and hypertension.")
    result = analyze_text(req)
    codes = [c.code for c in result.suggested_diagnosis_codes]
    assert "R07.9" in codes
    assert "I10" in codes


def test_ecg_procedure():
    req = AnalyzeRequest(text="Ordered an ECG to evaluate the arrhythmia.")
    result = analyze_text(req)
    proc_codes = [c.code for c in result.suggested_procedure_codes]
    assert "93000" in proc_codes


def test_requires_human_review():
    req = AnalyzeRequest(text="Normal clinical note with no findings.")
    result = analyze_text(req)
    assert result.requires_human_review is True


def test_model_used():
    req = AnalyzeRequest(text="Some text.")
    result = analyze_text(req)
    assert result.model_used == "regex-v1.0"
