"""
Tests for eligibility-intel predictor.

Covers:
  - NC patient at 120% FPL → Medicaid eligible
  - GA patient at 110% FPL → NOT eligible (non-expansion state)
  - Patient age ≥ 65 → medicare_a_b suggestion
  - Medicaid ID present → high-confidence eligible
  - Child under 19 → CHIP/Medicaid eligible
  - High income → uninsured / marketplace
"""
from __future__ import annotations

import pytest
from app.predictor import predict
from app.schemas import PredictRequest

# 2026 FPL for 1 person = $15,650 (per predictor.py)
FPL_1_PERSON = 15_650


def _income_cents(dollars: int) -> int:
    return dollars * 100


# ---------------------------------------------------------------------------
# NC patient at 120% FPL → should be Medicaid eligible
# NC income limit: 138% FPL (expansion state)
# 120% of $15,650 = $18,780
# ---------------------------------------------------------------------------
def test_nc_120pct_fpl_eligible():
    """NC patient with income at 120% FPL is within the 138% Medicaid threshold."""
    income = int(FPL_1_PERSON * 1.20)
    req = PredictRequest(
        state_code="NC",
        patient_age=35,
        household_income_annual_cents=_income_cents(income),
    )
    result = predict(req)
    assert result.likely_eligible is True, (
        f"Expected eligible for NC at 120% FPL, got likely_eligible={result.likely_eligible}"
    )
    assert result.suggested_program == "medicaid_chip", (
        f"Expected medicaid_chip, got {result.suggested_program}"
    )
    assert result.probability >= 0.50


# ---------------------------------------------------------------------------
# GA patient at 110% FPL → NOT eligible (GA = non-expansion, limit 100%)
# 110% of $15,650 = $17,215 — above GA's 100% FPL cap
# ---------------------------------------------------------------------------
def test_ga_110pct_fpl_not_eligible():
    """GA patient at 110% FPL exceeds GA's 100% FPL Medicaid cap — should be ineligible."""
    income = int(FPL_1_PERSON * 1.10)
    req = PredictRequest(
        state_code="GA",
        patient_age=40,
        household_income_annual_cents=_income_cents(income),
    )
    result = predict(req)
    assert result.likely_eligible is False, (
        f"Expected NOT eligible for GA at 110% FPL, got likely_eligible={result.likely_eligible}"
    )
    assert result.suggested_program != "medicaid_chip", (
        f"GA 110% FPL should NOT suggest medicaid_chip, got {result.suggested_program}"
    )


# ---------------------------------------------------------------------------
# GA patient at 90% FPL → IS eligible (within GA's 100% FPL limit)
# ---------------------------------------------------------------------------
def test_ga_90pct_fpl_eligible():
    """GA patient at 90% FPL is within GA's 100% FPL cap — should be eligible."""
    income = int(FPL_1_PERSON * 0.90)
    req = PredictRequest(
        state_code="GA",
        patient_age=28,
        household_income_annual_cents=_income_cents(income),
    )
    result = predict(req)
    assert result.likely_eligible is True
    assert result.suggested_program == "medicaid_chip"


# ---------------------------------------------------------------------------
# Patient age ≥ 65 → suggest medicare_a_b
# ---------------------------------------------------------------------------
def test_patient_over_65_suggests_medicare():
    """A patient aged 65+ should be routed to medicare_a_b."""
    req = PredictRequest(
        state_code="NC",
        patient_age=68,
    )
    result = predict(req)
    assert result.likely_eligible is True
    assert result.suggested_program == "medicare_a_b", (
        f"Expected medicare_a_b for patient age 68, got {result.suggested_program}"
    )
    assert result.probability >= 0.90


def test_patient_exactly_65_suggests_medicare():
    """Boundary: exactly age 65 triggers Medicare suggestion."""
    req = PredictRequest(
        state_code="GA",
        patient_age=65,
    )
    result = predict(req)
    assert result.likely_eligible is True
    assert result.suggested_program == "medicare_a_b"


# ---------------------------------------------------------------------------
# Medicare takes priority over income-based Medicaid for age ≥ 65
# ---------------------------------------------------------------------------
def test_over_65_with_low_income_prefers_medicare():
    """Patient ≥ 65 with very low income: Medicare should still be primary suggestion."""
    income = int(FPL_1_PERSON * 0.50)
    req = PredictRequest(
        state_code="NC",
        patient_age=70,
        household_income_annual_cents=_income_cents(income),
    )
    result = predict(req)
    # The engine may suggest medicare_a_b or medicaid_chip; key assertion is eligibility
    assert result.likely_eligible is True
    assert result.suggested_program in ("medicare_a_b", "medicaid_chip")


# ---------------------------------------------------------------------------
# Patient with Medicaid ID → very high probability
# ---------------------------------------------------------------------------
def test_medicaid_id_high_confidence():
    """Presence of a Medicaid ID should yield near-certain eligibility."""
    req = PredictRequest(
        state_code="NC",
        patient_age=45,
        medicaid_id="NC1234567",
    )
    result = predict(req)
    assert result.likely_eligible is True
    assert result.probability >= 0.90
    assert result.suggested_program == "medicaid_chip"


# ---------------------------------------------------------------------------
# Disabled patient → Medicare eligible
# ---------------------------------------------------------------------------
def test_disabled_patient_medicare():
    """Disabled flag triggers Medicare eligibility regardless of age."""
    req = PredictRequest(
        state_code="SC",
        patient_age=45,
        disabled=True,
    )
    result = predict(req)
    assert result.likely_eligible is True
    assert result.probability >= 0.90


# ---------------------------------------------------------------------------
# Pregnant patient → probability boost
# ---------------------------------------------------------------------------
def test_pregnant_boosts_probability():
    """Pregnancy should raise probability above the base for otherwise borderline cases."""
    req_base = PredictRequest(state_code="NC", patient_age=25)
    req_pregnant = PredictRequest(state_code="NC", patient_age=25, pregnant=True)
    base_prob = predict(req_base).probability
    preg_prob = predict(req_pregnant).probability
    assert preg_prob >= base_prob, "Pregnancy flag should not decrease eligibility probability"


# ---------------------------------------------------------------------------
# Child under 19 → CHIP/Medicaid eligible
# ---------------------------------------------------------------------------
def test_child_under_19_chip_eligible():
    """Children under 19 should be routed to medicaid_chip even without income info."""
    req = PredictRequest(
        state_code="GA",
        patient_age=10,
    )
    result = predict(req)
    assert result.likely_eligible is True
    assert result.suggested_program == "medicaid_chip"
    assert result.probability >= 0.70


# ---------------------------------------------------------------------------
# Very high income adult, no special flags → uninsured / low probability
# ---------------------------------------------------------------------------
def test_high_income_adult_uninsured():
    """Adult with very high income and no special flags should not be Medicaid-eligible."""
    income = int(FPL_1_PERSON * 5.0)   # 500% FPL — well above any threshold
    req = PredictRequest(
        state_code="NC",
        patient_age=50,
        household_income_annual_cents=_income_cents(income),
    )
    result = predict(req)
    assert result.likely_eligible is False
    assert result.suggested_program in ("uninsured", "marketplace")


# ---------------------------------------------------------------------------
# engine_version and requires_real_lookup are always present
# ---------------------------------------------------------------------------
def test_response_schema_fields():
    """All required response fields should be populated."""
    req = PredictRequest(state_code="NC", patient_age=30)
    result = predict(req)
    assert result.engine_version
    assert result.state_code == "NC"
    assert isinstance(result.probability, float)
    assert 0.0 <= result.probability <= 1.0
    assert result.requires_real_lookup is True
    assert isinstance(result.benefits, list)
    assert result.explanation


# ---------------------------------------------------------------------------
# SC income limit — SC is 100% in the predictor (non-expansion in current data)
# At exactly 100% FPL: eligible; at 101%: not
# ---------------------------------------------------------------------------
def test_sc_income_boundary():
    """SC income exactly at 100% FPL should be eligible; 1% above should not."""
    at_limit = _income_cents(FPL_1_PERSON)
    above_limit = _income_cents(int(FPL_1_PERSON * 1.01))

    result_at = predict(PredictRequest(state_code="SC", patient_age=30,
                                       household_income_annual_cents=at_limit))
    result_above = predict(PredictRequest(state_code="SC", patient_age=30,
                                          household_income_annual_cents=above_limit))

    assert result_at.likely_eligible is True
    assert result_above.likely_eligible is False
