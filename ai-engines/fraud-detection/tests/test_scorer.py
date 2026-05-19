"""
pytest tests for the fraud-detection scorer.
Covers the 6 heuristic flags and score boundary conditions.
"""
from __future__ import annotations

import pytest
from app.models import ClaimFeatures
from app.scorer import score_claim, MODEL_VERSION


# --------------------------------------------------------------------------- #
# Test fixtures                                                                 #
# --------------------------------------------------------------------------- #

def _low_risk_claim(**overrides) -> ClaimFeatures:
    """A baseline claim that should score low risk and auto-pay."""
    base = dict(
        claim_id="CLM-001",
        provider_id="PRV-001",
        patient_id="PAT-001",
        state_code="NC",
        service_date="2026-05-01",
        total_amount=250.00,          # well under $5,000 outlier threshold
        procedure_codes=["99213"],     # single code, no duplicates
        diagnosis_codes=["J06.9"],
        payer_id="BCBS-NC",
        submission_hour=10,            # 10 AM — normal business hours
        location_lat=None,
        location_lng=None,
        provider_monthly_claims=50,    # well under 200
        patient_monthly_claims=2,      # well under 15
    )
    base.update(overrides)
    return ClaimFeatures(**base)


def _make_claim(**overrides) -> ClaimFeatures:
    """Minimal claim with no optional fields set (tests null-safety)."""
    base = dict(
        claim_id="CLM-MIN",
        provider_id="PRV-MIN",
        patient_id="PAT-MIN",
        state_code="GA",
        service_date="2026-05-15",
        total_amount=100.00,
        procedure_codes=["99201"],
        diagnosis_codes=["Z00.00"],
        payer_id="MDCD-GA",
    )
    base.update(overrides)
    return ClaimFeatures(**base)


# --------------------------------------------------------------------------- #
# Test 1 — Low-risk claim auto-pays                                            #
# --------------------------------------------------------------------------- #

def test_low_risk_claim_auto_pay():
    """Baseline claim with no risk factors should score below 30 and auto-pay."""
    result = score_claim(_low_risk_claim())
    assert result.risk_score < 30, f"Expected score < 30, got {result.risk_score}"
    assert result.risk_level == "low"
    assert result.recommendation == "auto_pay"
    assert result.requires_human_review is False
    assert result.flags == []
    assert "auto" in result.explanation.lower()
    assert result.model_version == MODEL_VERSION


# --------------------------------------------------------------------------- #
# Test 2 — High provider volume triggers flag and raises score above 60        #
# --------------------------------------------------------------------------- #

def test_high_volume_provider_triggers_flag():
    """Provider with 287 monthly claims should trigger unusual_volume flag."""
    result = score_claim(_low_risk_claim(provider_monthly_claims=287))
    flag_types = [f.flag_type for f in result.flags]
    assert "unusual_volume" in flag_types, f"Expected unusual_volume flag, got flags: {flag_types}"
    assert result.risk_score > 60, f"Expected score > 60 with volume flag, got {result.risk_score}"
    assert result.recommendation in ("route_to_review", "auto_block")
    assert result.requires_human_review is True
    # Severity should be high
    vol_flag = next(f for f in result.flags if f.flag_type == "unusual_volume")
    assert vol_flag.severity == "high"
    assert "287" in vol_flag.description


# --------------------------------------------------------------------------- #
# Test 3 — Off-hours submission (2 AM) triggers flag                           #
# --------------------------------------------------------------------------- #

def test_off_hours_submission_2am():
    """Claim submitted at 2 AM should trigger off_hours_submission flag."""
    result = score_claim(_low_risk_claim(submission_hour=2))
    flag_types = [f.flag_type for f in result.flags]
    assert "off_hours_submission" in flag_types, f"Expected off_hours flag, got: {flag_types}"
    off_flag = next(f for f in result.flags if f.flag_type == "off_hours_submission")
    assert off_flag.severity == "low"
    assert "2" in off_flag.description
    # Off-hours alone (low severity) with low total amount should still route to review
    # because has_severe_flag prevents auto_pay but score may still be < 30
    assert result.recommendation in ("auto_pay", "route_to_review")


def test_off_hours_edge_midnight():
    """Hour 0 (midnight) should also trigger the flag."""
    result = score_claim(_low_risk_claim(submission_hour=0))
    flag_types = [f.flag_type for f in result.flags]
    assert "off_hours_submission" in flag_types


def test_off_hours_5am_is_normal():
    """Hour 5 (5 AM) is just outside the off-hours window and should NOT trigger."""
    result = score_claim(_low_risk_claim(submission_hour=5))
    flag_types = [f.flag_type for f in result.flags]
    assert "off_hours_submission" not in flag_types


# --------------------------------------------------------------------------- #
# Test 4 — Duplicate procedure codes trigger flag                              #
# --------------------------------------------------------------------------- #

def test_duplicate_procedure_codes_trigger_flag():
    """Repeated procedure codes in the same claim should trigger duplicate_lines."""
    result = score_claim(_low_risk_claim(
        procedure_codes=["99213", "99213", "90837"],  # 99213 appears twice
    ))
    flag_types = [f.flag_type for f in result.flags]
    assert "duplicate_lines" in flag_types, f"Expected duplicate_lines flag, got: {flag_types}"
    dup_flag = next(f for f in result.flags if f.flag_type == "duplicate_lines")
    assert dup_flag.severity == "high"
    assert "99213" in dup_flag.description
    assert result.requires_human_review is True


def test_no_duplicate_codes_no_flag():
    """Unique procedure codes should not trigger the duplicate_lines flag."""
    result = score_claim(_low_risk_claim(
        procedure_codes=["99213", "90837", "99214"],
    ))
    flag_types = [f.flag_type for f in result.flags]
    assert "duplicate_lines" not in flag_types


# --------------------------------------------------------------------------- #
# Test 5 — Score is always within [1, 100]                                    #
# --------------------------------------------------------------------------- #

def test_score_range_lower_bound():
    """Minimal claim with no risk factors should still score at least 1."""
    result = score_claim(_make_claim())
    assert 1 <= result.risk_score <= 100


def test_score_range_upper_bound_all_flags():
    """Claim triggering all 6 flags should not exceed 100."""
    result = score_claim(ClaimFeatures(
        claim_id="CLM-ALL-FLAGS",
        provider_id="PRV-X",
        patient_id="PAT-X",
        state_code="SC",
        service_date="2026-05-15",
        total_amount=99_999.99,           # charge_outlier
        procedure_codes=["99215", "99215", "90837"],  # duplicate_lines
        diagnosis_codes=["Z00.00"],
        payer_id="MDCD-SC",
        submission_hour=3,                # off_hours_submission
        location_lat=51.5074,             # outside CONUS → distance_anomaly
        location_lng=-0.1278,
        provider_monthly_claims=500,      # unusual_volume
        patient_monthly_claims=30,        # patient_overutilization
    ))
    assert 1 <= result.risk_score <= 100
    assert result.risk_level == "critical"
    assert result.recommendation == "auto_block"
    assert result.requires_human_review is True
    # All 6 flags should be present
    flag_types = {f.flag_type for f in result.flags}
    assert "unusual_volume" in flag_types
    assert "charge_outlier" in flag_types
    assert "distance_anomaly" in flag_types
    assert "patient_overutilization" in flag_types
    assert "off_hours_submission" in flag_types
    assert "duplicate_lines" in flag_types


# --------------------------------------------------------------------------- #
# Test 6 — Charge outlier flag                                                 #
# --------------------------------------------------------------------------- #

def test_charge_outlier_above_5000():
    """Claim totalling more than $5,000 should trigger the charge_outlier flag."""
    result = score_claim(_low_risk_claim(total_amount=7500.00))
    flag_types = [f.flag_type for f in result.flags]
    assert "charge_outlier" in flag_types
    outlier_flag = next(f for f in result.flags if f.flag_type == "charge_outlier")
    assert outlier_flag.severity == "high"
    assert "$7,500" in outlier_flag.description


def test_charge_exactly_5000_no_flag():
    """Claim totalling exactly $5,000 (not exceeding) should NOT trigger the flag."""
    result = score_claim(_low_risk_claim(total_amount=5000.00))
    flag_types = [f.flag_type for f in result.flags]
    assert "charge_outlier" not in flag_types


# --------------------------------------------------------------------------- #
# Test 7 — Patient over-utilization flag                                       #
# --------------------------------------------------------------------------- #

def test_patient_overutilization_above_15():
    """Patient with 20 monthly claims should trigger patient_overutilization."""
    result = score_claim(_low_risk_claim(patient_monthly_claims=20))
    flag_types = [f.flag_type for f in result.flags]
    assert "patient_overutilization" in flag_types
    pu_flag = next(f for f in result.flags if f.flag_type == "patient_overutilization")
    assert pu_flag.severity == "medium"


# --------------------------------------------------------------------------- #
# Test 8 — state_threshold kwarg is accepted without errors                   #
# --------------------------------------------------------------------------- #

def test_state_threshold_accepted():
    """The state_threshold parameter should be accepted without raising errors."""
    result = score_claim(_low_risk_claim(), state_threshold=25.0)
    assert isinstance(result.risk_score, int)


# --------------------------------------------------------------------------- #
# Test 9 — Null optional fields do not cause errors                            #
# --------------------------------------------------------------------------- #

def test_null_optional_fields_safe():
    """Claims with no optional fields should score without errors."""
    result = score_claim(_make_claim(
        submission_hour=None,
        location_lat=None,
        location_lng=None,
        provider_monthly_claims=None,
        patient_monthly_claims=None,
    ))
    assert 1 <= result.risk_score <= 100
    assert result.model_version == MODEL_VERSION
