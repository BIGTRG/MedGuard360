"""
Denial prediction + appeal-letter draft generator.

Production uses an XGBoost classifier trained on historical (claim, denial)
pairs. For dev we ship a deterministic heuristic predictor + a template-based
appeal drafter. Both have stable signatures so the trained models drop in
without changing the API.

CARC = Claim Adjustment Reason Code. Common Medicaid denial codes:
  11  — diagnosis inconsistent with procedure
  16  — claim/service lacks information
  50  — non-medically-necessary
  96  — non-covered charge
  151 — payment adjusted because information for adjudication doesn't support charge
  197 — precertification/authorization absent
  204 — service/equipment/drug not covered under patient's current benefit plan
  236 — procedure/procedure modifier combination not compatible
"""
from __future__ import annotations

import os
from typing import Iterable

from .schemas import DenialRisk, DraftAppealRequest, DraftAppealResponse, PredictRequest, PredictResponse

ENGINE_VERSION = "denial-predictor/0.1.0-heuristic"

# Per-payer baseline denial rates (would come from real history)
_BASELINE_DENIAL_RATE = 0.12


def predict(req: PredictRequest) -> PredictResponse:
    risks: list[DenialRisk] = []
    prob = _BASELINE_DENIAL_RATE

    # Heuristic 1 — PA denied or missing
    if req.pa_status == "denied":
        risks.append(DenialRisk(code="197", description="Prior authorization was denied",
                                probability=0.85))
        prob = max(prob, 0.85)
    elif not req.pa_present:
        risks.append(DenialRisk(code="197", description="Precertification/authorization absent",
                                probability=0.40))
        prob += 0.30

    # Heuristic 2 — no diagnosis codes
    if not req.diagnosis_codes:
        risks.append(DenialRisk(code="16", description="Claim/service lacks information (missing diagnosis)",
                                probability=0.70))
        prob = max(prob, 0.70)

    # Heuristic 3 — many modifiers on a single line (modifier-stacking is a flag)
    if req.modifier_count > 3:
        risks.append(DenialRisk(code="236", description="Procedure/modifier combination not compatible",
                                probability=0.30))
        prob += 0.10

    # Heuristic 4 — high charge with few diagnoses (potential upcoding)
    if req.total_charge_cents > 50_000_00 and len(req.diagnosis_codes) < 2:
        risks.append(DenialRisk(code="151", description="Payment adjusted — information doesn't support level of service",
                                probability=0.35))
        prob += 0.15

    prob = min(prob, 0.99)

    if prob < 0.20:
        rec = "submit_as_is"
        expl = f"Low predicted denial risk ({prob:.0%}). Claim should be submitted as-is."
    elif prob < 0.55:
        rec = "address_risks_first"
        expl = (f"Moderate denial risk ({prob:.0%}). "
                f"Review the flagged items before submission to maximize first-pass payment.")
    else:
        rec = "do_not_submit"
        expl = (f"High denial risk ({prob:.0%}). "
                f"Address blocking issues (PA, documentation, diagnosis coding) before submitting.")

    return PredictResponse(
        engine_version=ENGINE_VERSION,
        claim_id=req.claim_id,
        overall_denial_probability=round(prob, 3),
        likely_reasons=risks,
        recommendation=rec,
        explanation=expl,
    )


def _explain_carc(code: str) -> str:
    """Return a plain-language hook for the appeal body based on CARC."""
    return {
        "11":  "we maintain that the documented diagnoses fully support the procedures billed and are clinically appropriate",
        "16":  "complete supporting documentation is included with this appeal, addressing every previously cited information gap",
        "50":  "the attached clinical notes establish medical necessity in accordance with payer policy and CMS coverage guidelines",
        "96":  "the service is in fact covered under the patient's current benefit plan as outlined in the plan documents",
        "151": "the documented complexity, time, and clinical decision-making support the level of service billed",
        "197": "the corresponding prior authorization approval is attached and was issued prior to the date of service",
        "204": "the service is covered under the patient's current benefit plan and we have attached the relevant benefit summary",
        "236": "the procedure/modifier combination is consistent with NCCI guidance and payer-specific edits",
    }.get(code, "we have included supporting clinical documentation that addresses the cited denial reason")


def draft_appeal(req: DraftAppealRequest) -> DraftAppealResponse:
    pname = " ".join(filter(None, [req.patient_first_name, req.patient_last_name])) or "the patient"
    provider = req.provider_name or "the rendering provider"
    rationale = _explain_carc(req.denial_code)

    subject = f"Appeal of Denial — Claim {req.claim_id} — Reason Code {req.denial_code}"

    body = "\n".join([
        f"To Whom It May Concern:",
        "",
        f"On behalf of {provider}, we are formally appealing the denial of claim {req.claim_id} "
        f"for {pname}. The denial was issued under reason code {req.denial_code} ({req.denial_description}).",
        "",
        f"After review of the patient's medical record, {rationale}.",
        "",
        f"Summary of clinical findings supporting medical necessity:",
        f"  {req.clinical_summary[:1000].strip() or '[Clinical documentation attached.]'}",
        "",
        f"Diagnosis codes: {', '.join(req.diagnosis_codes) or 'see attached'}.",
        f"Service codes: {', '.join(req.service_codes) or 'see claim'}.",
        "",
        "We respectfully request that this claim be reprocessed. Please contact our billing office "
        "if any additional information is needed.",
        "",
        "Sincerely,",
        f"{provider}",
        "",
        f"DRAFT — Generated by MedGuard360 denial-predictor for review by a denial/appeals specialist before submission.",
    ])

    attachments = [
        "Clinical notes for the date of service",
        "Visit progress note",
    ]
    if req.denial_code == "197":
        attachments.append("Prior authorization approval letter")
    if req.denial_code in ("50", "151"):
        attachments.append("Clinical guidelines / payer medical-necessity criteria")
    if req.denial_code in ("204", "96"):
        attachments.append("Patient benefit summary / coverage statement")

    return DraftAppealResponse(
        engine_version=ENGINE_VERSION,
        appeal_subject=subject,
        appeal_body=body,
        suggested_attachments=attachments,
        confidence=0.70,
        requires_human_review=True,
    )


def using_trained_model() -> bool:
    return bool(os.environ.get("MODEL_PATH"))
