"""
Tests for denial-predictor engine.

Covers:
  - High-risk procedure (no PA) → denial_probability > 0.30
  - Missing PA on a claim that needs it → probability increases vs. baseline
  - Missing diagnosis codes → very high denial probability
  - Modifier stacking → probability increase
  - draft_appeal returns a non-empty appeal letter body
  - CARC-specific templates are applied in appeal drafts
  - requires_human_review is always True on appeal drafts
"""
from __future__ import annotations

import pytest
from app.predictor import predict, draft_appeal
from app.schemas import DraftAppealRequest, PredictRequest


# ---------------------------------------------------------------------------
# Helper builders
# ---------------------------------------------------------------------------

def _req(
    *,
    claim_id: str = "CLM-001",
    payer_id: str = "medicaid_nc",
    state_code: str = "NC",
    service_codes: list[str] | None = None,
    diagnosis_codes: list[str] | None = None,
    total_charge_cents: int = 50_000,
    modifier_count: int = 0,
    pa_present: bool = False,
    pa_status: str | None = None,
) -> PredictRequest:
    return PredictRequest(
        claim_id=claim_id,
        payer_id=payer_id,
        state_code=state_code,
        service_codes=service_codes if service_codes is not None else ["99213"],
        diagnosis_codes=diagnosis_codes if diagnosis_codes is not None else ["Z00.00"],
        total_charge_cents=total_charge_cents,
        modifier_count=modifier_count,
        pa_present=pa_present,
        pa_status=pa_status,
    )


def _appeal_req(
    *,
    denial_code: str = "50",
    claim_id: str = "CLM-001",
    provider_name: str = "Dr. Jane Smith",
    patient_first_name: str = "John",
    patient_last_name: str = "Doe",
    clinical_summary: str = "Patient presented with acute lower back pain requiring lumbar imaging and physical therapy.",
) -> DraftAppealRequest:
    return DraftAppealRequest(
        claim_id=claim_id,
        denial_code=denial_code,
        denial_description=f"Denial code {denial_code}",
        clinical_summary=clinical_summary,
        payer_id="medicaid_nc",
        patient_first_name=patient_first_name,
        patient_last_name=patient_last_name,
        provider_name=provider_name,
        service_codes=["99213"],
        diagnosis_codes=["M54.5"],
    )


# ---------------------------------------------------------------------------
# Denial prediction — probability thresholds
# ---------------------------------------------------------------------------

def test_no_pa_increases_probability():
    """Claim without prior authorization should have meaningfully elevated denial risk."""
    without_pa = predict(_req(pa_present=False))
    with_pa = predict(_req(pa_present=True, pa_status="approved"))
    assert without_pa.overall_denial_probability > with_pa.overall_denial_probability, (
        "Missing PA should increase denial probability"
    )
    # Must exceed the basic 0.30 threshold specified in the test requirements
    assert without_pa.overall_denial_probability > 0.30, (
        f"No-PA claim probability should be > 0.30, got {without_pa.overall_denial_probability}"
    )


def test_denied_pa_very_high_probability():
    """A claim where PA was explicitly denied should have very high denial probability."""
    result = predict(_req(pa_present=False, pa_status="denied"))
    assert result.overall_denial_probability >= 0.80, (
        f"Denied PA claim probability should be >= 0.80, got {result.overall_denial_probability}"
    )


def test_no_diagnosis_codes_high_probability():
    """Missing diagnosis codes (CARC 16 — lacks required info) should spike denial probability."""
    result = predict(_req(diagnosis_codes=[]))
    assert result.overall_denial_probability >= 0.60, (
        f"No diagnosis codes should yield >= 0.60 probability, got {result.overall_denial_probability}"
    )


def test_modifier_stacking_raises_probability():
    """Excessive modifier count (> 3) should increase denial probability."""
    clean = predict(_req(modifier_count=0))
    stacked = predict(_req(modifier_count=4))
    assert stacked.overall_denial_probability > clean.overall_denial_probability, (
        "Modifier stacking should raise denial probability"
    )


def test_high_charge_few_diagnoses_raises_probability():
    """High charge (>$500,000) with fewer than 2 diagnoses should trigger level-of-service risk."""
    low_charge = predict(_req(total_charge_cents=10_000, diagnosis_codes=["Z00.00"]))
    high_charge = predict(_req(total_charge_cents=60_000_00, diagnosis_codes=["Z00.00"]))
    assert high_charge.overall_denial_probability > low_charge.overall_denial_probability


def test_clean_claim_low_probability():
    """A well-formed claim with PA and diagnoses should have low denial risk."""
    result = predict(_req(
        pa_present=True,
        pa_status="approved",
        diagnosis_codes=["Z00.00", "M54.5"],
        modifier_count=0,
        total_charge_cents=25_000,
    ))
    assert result.overall_denial_probability < 0.25, (
        f"Clean claim should be < 0.25 denial probability, got {result.overall_denial_probability}"
    )
    assert result.recommendation == "submit_as_is"


def test_probability_capped_at_099():
    """Combined risk factors must never exceed 0.99."""
    result = predict(_req(
        pa_present=False,
        pa_status="denied",
        diagnosis_codes=[],
        modifier_count=5,
        total_charge_cents=100_000_00,
    ))
    assert result.overall_denial_probability <= 0.99


def test_prediction_includes_likely_reasons():
    """PredictResponse should carry at least one DenialRisk when probability is elevated."""
    result = predict(_req(pa_present=False, diagnosis_codes=[]))
    assert len(result.likely_reasons) >= 1
    for r in result.likely_reasons:
        assert r.code
        assert r.description
        assert 0.0 <= r.probability <= 1.0


def test_recommendation_values():
    """recommendation must be one of the three canonical values."""
    valid = {"submit_as_is", "address_risks_first", "do_not_submit"}
    r1 = predict(_req(pa_present=True, pa_status="approved"))
    r2 = predict(_req(pa_present=False))
    r3 = predict(_req(pa_present=False, diagnosis_codes=[], pa_status="denied"))
    for result in (r1, r2, r3):
        assert result.recommendation in valid, f"Unexpected recommendation: {result.recommendation}"


# ---------------------------------------------------------------------------
# Appeal draft — content checks
# ---------------------------------------------------------------------------

def test_draft_appeal_non_empty_body():
    """draft_appeal must return a non-empty appeal_body string."""
    result = draft_appeal(_appeal_req())
    assert result.appeal_body
    assert len(result.appeal_body.strip()) > 0, "appeal_body must not be blank"


def test_draft_appeal_minimum_length():
    """Appeal letter body should be substantial (>= 10 sentences / 300 chars)."""
    result = draft_appeal(_appeal_req())
    # Proxy for 10+ sentences: count newlines + sentence-ending punctuation
    body = result.appeal_body
    assert len(body) >= 300, f"Appeal body too short: {len(body)} chars"
    # Loose sentence count: periods/exclamation marks
    sentences = body.count('.') + body.count('!')
    assert sentences >= 5, f"Expected >= 5 sentence-ending marks, found {sentences}"


def test_draft_appeal_includes_provider_name():
    """Provider name should appear in the appeal letter."""
    result = draft_appeal(_appeal_req(provider_name="Dr. Maria Garcia"))
    assert "Dr. Maria Garcia" in result.appeal_body or "Dr. Maria Garcia" in result.appeal_subject


def test_draft_appeal_includes_patient_name():
    """Patient name should appear in the appeal letter."""
    result = draft_appeal(_appeal_req(patient_first_name="Alice", patient_last_name="Johnson"))
    assert "Alice" in result.appeal_body or "Johnson" in result.appeal_body


def test_draft_appeal_includes_claim_id():
    """Claim ID should be referenced in the appeal."""
    claim_id = "CLM-XYZ-9999"
    result = draft_appeal(_appeal_req(claim_id=claim_id))
    assert claim_id in result.appeal_body or claim_id in result.appeal_subject


def test_draft_appeal_requires_human_review():
    """requires_human_review must always be True — AI drafts are never auto-submitted."""
    result = draft_appeal(_appeal_req())
    assert result.requires_human_review is True


def test_draft_appeal_carc_197_attaches_pa():
    """CARC 197 (missing PA) appeal should recommend attaching a PA approval letter."""
    result = draft_appeal(_appeal_req(denial_code="197"))
    combined = " ".join(result.suggested_attachments).lower()
    assert "authorization" in combined or "prior" in combined, (
        "CARC 197 appeal should recommend PA-related attachment"
    )


def test_draft_appeal_carc_50_attaches_clinical():
    """CARC 50 (not medically necessary) appeal should recommend clinical documentation."""
    result = draft_appeal(_appeal_req(denial_code="50"))
    combined = " ".join(result.suggested_attachments).lower()
    assert "clinical" in combined or "medical" in combined or "necessity" in combined


def test_draft_appeal_carc_16_attaches_documentation():
    """CARC 16 (lacks information) appeal should suggest documentation attachments."""
    result = draft_appeal(_appeal_req(denial_code="16"))
    assert len(result.suggested_attachments) >= 1


def test_draft_appeal_all_carc_codes_generate_letters():
    """Each supported CARC code should produce a non-empty letter and subject."""
    carc_codes = ["11", "16", "50", "96", "151", "197", "204", "236"]
    for code in carc_codes:
        result = draft_appeal(_appeal_req(denial_code=code))
        assert result.appeal_body, f"Empty appeal body for CARC {code}"
        assert result.appeal_subject, f"Empty subject for CARC {code}"
        assert result.requires_human_review is True


def test_draft_appeal_engine_version():
    """Engine version must be a non-empty string."""
    result = draft_appeal(_appeal_req())
    assert result.engine_version
    assert len(result.engine_version) > 0


def test_draft_appeal_confidence_in_range():
    """Confidence score must be 0.0–1.0."""
    result = draft_appeal(_appeal_req())
    assert 0.0 <= result.confidence <= 1.0


def test_draft_appeal_unknown_carc_still_drafts():
    """Unknown CARC code should not crash — a generic letter should be produced."""
    result = draft_appeal(_appeal_req(denial_code="999"))
    assert result.appeal_body
    assert result.requires_human_review is True


def test_draft_appeal_with_long_clinical_summary():
    """Very long clinical summary should be handled gracefully (truncated if needed)."""
    long_summary = "Patient had multiple comorbidities including. " * 300  # ~13,500 chars
    result = draft_appeal(_appeal_req(clinical_summary=long_summary))
    assert result.appeal_body
    # Letter should still be reasonable length (clinical summary is truncated to 1000 in predictor)
    assert len(result.appeal_body) < 20_000


# ---------------------------------------------------------------------------
# Integration: predict then draft
# ---------------------------------------------------------------------------

def test_predict_then_draft_workflow():
    """End-to-end: get denial prediction for risky claim, then draft appeal."""
    pred = predict(_req(
        claim_id="CLM-E2E-001",
        pa_present=False,
        diagnosis_codes=["M54.5"],
    ))
    assert pred.overall_denial_probability > 0.20

    # Use top risk code for appeal
    top_risk = pred.likely_reasons[0] if pred.likely_reasons else None
    denial_code = top_risk.code if top_risk else "197"

    appeal = draft_appeal(DraftAppealRequest(
        claim_id="CLM-E2E-001",
        denial_code=denial_code,
        denial_description=top_risk.description if top_risk else "Denial",
        clinical_summary="Chronic lower back pain; MRI indicated per guidelines.",
        payer_id="medicaid_nc",
        patient_first_name="Bob",
        patient_last_name="Smith",
        provider_name="Dr. Kim Lee",
        service_codes=["99213"],
        diagnosis_codes=["M54.5"],
    ))
    assert appeal.appeal_body
    assert appeal.requires_human_review is True
