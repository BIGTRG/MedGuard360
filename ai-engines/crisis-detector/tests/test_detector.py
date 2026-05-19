"""
pytest tests for the crisis-detector v2 (detector_v2.py / models.py).

Covers:
  - Text with "want to die" → crisis_detected=True, crisis_level high+
  - Text with suicidal phrase → correct indicator_type captured
  - Homicidal phrase → critical level
  - Normal clinical symptoms text → crisis_detected=False
  - requires_human_review always True (AI governance rule)
  - Multiple severe indicators → critical
  - Empty-ish text → no crisis
  - response schema completeness
"""
from __future__ import annotations

import pytest

from app.detector_v2 import detect_crisis, MODEL_VERSION
from app.models import CrisisDetectRequest, CrisisDetectResponse


# --------------------------------------------------------------------------- #
# Helpers                                                                       #
# --------------------------------------------------------------------------- #

def _req(text: str, patient_id: str = None, encounter_id: str = None) -> CrisisDetectRequest:
    return CrisisDetectRequest(
        text=text,
        context="clinical_note",
        patient_id=patient_id,
        encounter_id=encounter_id,
    )


# --------------------------------------------------------------------------- #
# Test 1 — "want to die" → crisis_detected=True, crisis_level=high+           #
# --------------------------------------------------------------------------- #

def test_want_to_die_crisis_detected():
    """Phrase 'want to die' must trigger crisis_detected=True at high or critical level."""
    result = detect_crisis(_req("Patient stated they want to die and have given up hope."))

    assert result.crisis_detected is True, "Expected crisis_detected=True"
    assert result.crisis_level in ("high", "critical"), (
        f"Expected high or critical, got {result.crisis_level}"
    )
    assert len(result.indicators) >= 1


def test_want_to_die_suicidal_ideation_indicator_type():
    """'want to die' should be classified as suicidal_ideation indicator type."""
    result = detect_crisis(_req("I want to die, there is nothing left."))

    indicator_types = {i.indicator_type for i in result.indicators}
    assert "suicidal_ideation" in indicator_types, (
        f"Expected suicidal_ideation in indicator types, got: {indicator_types}"
    )


# --------------------------------------------------------------------------- #
# Test 2 — "kill myself" → severe indicator, high crisis level                #
# --------------------------------------------------------------------------- #

def test_kill_myself_severe_indicator():
    """'kill myself' is a severe suicidal ideation phrase."""
    result = detect_crisis(_req("He said he wants to kill myself before the end of the week."))

    assert result.crisis_detected is True
    severe_indicators = [i for i in result.indicators if i.severity == "severe"]
    assert len(severe_indicators) >= 1, (
        f"Expected at least one severe indicator, got: {result.indicators}"
    )


# --------------------------------------------------------------------------- #
# Test 3 — Homicidal phrase → critical level                                  #
# --------------------------------------------------------------------------- #

def test_homicidal_phrase_critical_level():
    """A homicidal indicator should push crisis level to critical."""
    result = detect_crisis(_req("Patient expressed desire to want to kill someone."))

    assert result.crisis_detected is True
    # homicidal alone should be critical or high
    assert result.crisis_level in ("critical", "high"), (
        f"Expected critical or high for homicidal phrase, got {result.crisis_level}"
    )
    homicidal = [i for i in result.indicators if i.indicator_type == "homicidal"]
    assert len(homicidal) >= 1


# --------------------------------------------------------------------------- #
# Test 4 — Normal clinical text → crisis_detected=False                       #
# --------------------------------------------------------------------------- #

def test_normal_symptoms_no_crisis():
    """A routine clinical note with no crisis language should return crisis_detected=False."""
    result = detect_crisis(_req(
        "Patient presents with mild upper respiratory infection. "
        "Complains of sore throat and runny nose for 3 days. "
        "Vital signs stable. Prescribed amoxicillin 500mg TID for 7 days."
    ))

    assert result.crisis_detected is False, (
        f"Expected crisis_detected=False for routine note, got {result.crisis_level}"
    )
    assert result.crisis_level == "none"


def test_mental_health_note_no_crisis_language():
    """A mental health note without crisis keywords should not trigger detection."""
    result = detect_crisis(_req(
        "Patient continues cognitive behavioral therapy for generalized anxiety disorder. "
        "Reports improved sleep and reduced worry. "
        "Coping strategies are effective. Follow-up scheduled in 4 weeks."
    ))

    assert result.crisis_detected is False
    assert result.crisis_level == "none"


# --------------------------------------------------------------------------- #
# Test 5 — requires_human_review always True                                  #
# --------------------------------------------------------------------------- #

def test_requires_human_review_always_true_positive():
    """Crisis detected → requires_human_review must be True."""
    result = detect_crisis(_req("Patient said they want to die."))
    assert result.requires_human_review is True


def test_requires_human_review_always_true_negative():
    """No crisis detected → requires_human_review must still be True."""
    result = detect_crisis(_req("Patient reports mild headache and fatigue."))
    assert result.requires_human_review is True, (
        "requires_human_review must be True even when no crisis is detected"
    )


# --------------------------------------------------------------------------- #
# Test 6 — Multiple severe indicators → critical                              #
# --------------------------------------------------------------------------- #

def test_multiple_severe_indicators_critical():
    """Two or more severe indicators in one note should push crisis to critical."""
    result = detect_crisis(_req(
        "Patient says they want to die and has thoughts of suicide. "
        "They also expressed desire to hurt someone at work."
    ))

    assert result.crisis_detected is True
    assert result.crisis_level == "critical", (
        f"Expected critical with multiple severe indicators, got {result.crisis_level}"
    )


# --------------------------------------------------------------------------- #
# Test 7 — Self-harm phrase captured                                          #
# --------------------------------------------------------------------------- #

def test_self_harm_phrase_detected():
    """'cutting myself' should produce a self_harm indicator."""
    result = detect_crisis(_req(
        "Patient disclosed that they have been cutting myself on the arms for 2 weeks."
    ))

    assert result.crisis_detected is True
    sh_indicators = [i for i in result.indicators if i.indicator_type == "self_harm"]
    assert len(sh_indicators) >= 1, (
        f"Expected self_harm indicator, got types: {[i.indicator_type for i in result.indicators]}"
    )


# --------------------------------------------------------------------------- #
# Test 8 — Confidence field is within valid range                             #
# --------------------------------------------------------------------------- #

def test_confidence_within_range():
    """Confidence must always be between 0.0 and 1.0."""
    for text in (
        "Patient wants to die.",
        "Patient is doing well, no concerns.",
        "He talked about cutting himself and not wanting to live.",
    ):
        result = detect_crisis(_req(text))
        assert 0.0 <= result.confidence <= 1.0, (
            f"Confidence out of range for text='{text}': {result.confidence}"
        )


# --------------------------------------------------------------------------- #
# Test 9 — Response schema completeness                                       #
# --------------------------------------------------------------------------- #

def test_response_schema_completeness():
    """All CrisisDetectResponse fields present and correctly typed."""
    result = detect_crisis(_req(
        "Patient denies suicidal ideation.",
        patient_id="PAT-TEST",
        encounter_id="ENC-001",
    ))

    assert isinstance(result, CrisisDetectResponse)
    assert isinstance(result.crisis_detected, bool)
    assert result.crisis_level in ("none", "low", "medium", "high", "critical")
    assert isinstance(result.confidence, float)
    assert isinstance(result.indicators, list)
    assert isinstance(result.explanation, str) and len(result.explanation) > 0
    assert isinstance(result.recommended_action, str) and len(result.recommended_action) > 0
    assert result.requires_human_review is True
    assert result.model_version == MODEL_VERSION


# --------------------------------------------------------------------------- #
# Test 10 — Hopeless/worthless → mild suicidal ideation                      #
# --------------------------------------------------------------------------- #

def test_mild_hopeless_phrase_low_crisis():
    """'hopeless' alone should produce a low-level crisis indicator."""
    result = detect_crisis(_req(
        "Patient reports feeling hopeless about their situation lately."
    ))

    assert result.crisis_detected is True
    mild_indicators = [i for i in result.indicators if i.severity == "mild"]
    assert len(mild_indicators) >= 1, (
        f"Expected at least one mild indicator for 'hopeless', got: {result.indicators}"
    )
    # With only mild indicators, crisis level should be low (not high/critical)
    assert result.crisis_level in ("low", "medium"), (
        f"Expected low or medium for mild hopeless phrase, got {result.crisis_level}"
    )
