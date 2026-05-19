"""
Eligibility prediction engine.

Rules-based today using federal Medicaid eligibility thresholds (FPL %)
per state — easy to maintain and explainable. Drops in an ML classifier
later by swapping the implementation while keeping the schema stable.
"""
from __future__ import annotations

from .schemas import BenefitDetail, PredictRequest, PredictResponse

ENGINE_VERSION = "eligibility-intel/0.1.0-rules"

# 2026 Federal Poverty Level (1-person household, annual, in dollars). Simplified.
FPL_2026_1_PERSON = 15_650
# State Medicaid income limits as % of FPL for adults (expansion states ~138%, others vary).
# This is a small slice; real data lives in state-config-service.
STATE_INCOME_LIMITS = {
    "NC": 138, "SC": 100, "GA": 100,                # phase 1
}


def _annual_dollars(cents: int | None) -> int | None:
    return None if cents is None else int(cents / 100)


def predict(req: PredictRequest) -> PredictResponse:
    income_limit_pct = STATE_INCOME_LIMITS.get(req.state_code, 138)
    income_limit_dollars = int(FPL_2026_1_PERSON * income_limit_pct / 100)

    reasons: list[str] = []
    likely = False
    program = "uninsured"
    probability = 0.10

    # Direct Medicaid ID → near-certain
    if req.medicaid_id:
        likely = True
        probability = 0.98
        program = "medicaid_chip"
        reasons.append(f"Active Medicaid ID {req.medicaid_id} on file.")

    # Medicare age trigger
    if req.patient_age >= 65 or req.disabled:
        likely = True
        probability = max(probability, 0.95)
        program = "medicare_a_b" if program == "uninsured" else program
        reasons.append("Age ≥ 65 or documented disability → Medicare eligible.")

    # Income-based Medicaid
    income = _annual_dollars(req.household_income_annual_cents)
    if income is not None and income <= income_limit_dollars:
        likely = True
        probability = max(probability, 0.85)
        program = "medicaid_chip"
        reasons.append(
            f"Household income ~${income:,} ≤ {req.state_code} Medicaid limit "
            f"(${income_limit_dollars:,} = {income_limit_pct}% FPL)."
        )

    # Pregnancy expands eligibility
    if req.pregnant:
        probability = min(0.99, probability + 0.10)
        likely = likely or probability >= 0.50
        reasons.append("Pregnancy expands Medicaid eligibility per state policy.")

    # Children-specific (under 19)
    if req.patient_age < 19 and not likely:
        likely = True
        probability = max(probability, 0.75)
        program = "medicaid_chip"
        reasons.append("Child under 19 — likely CHIP/Medicaid eligible regardless of income within state caps.")

    # Benefit detail (rough — real eligibility-service hits MMIS for actual coverage)
    benefits: list[BenefitDetail] = []
    if program == "medicaid_chip":
        benefits = [
            BenefitDetail(name="Primary care visits",       covered=True),
            BenefitDetail(name="Behavioral health",         covered=True),
            BenefitDetail(name="Prescription drugs",        covered=True, notes="Subject to state formulary"),
            BenefitDetail(name="Emergency services",        covered=True),
            BenefitDetail(name="DME",                       covered=True, notes="Most items require PA"),
            BenefitDetail(name="Cosmetic procedures",       covered=False),
        ]
    elif program == "medicare_a_b":
        benefits = [
            BenefitDetail(name="Inpatient hospital (Part A)", covered=True),
            BenefitDetail(name="Outpatient services (Part B)", covered=True),
            BenefitDetail(name="Preventive services",          covered=True),
            BenefitDetail(name="Prescription drugs",           covered=False,
                          notes="Requires Part D enrollment"),
        ]

    explanation = (
        f"Eligibility likelihood: {probability:.0%}. Suggested program: {program}. "
        + " ".join(reasons)
        + " Verify against state MMIS via eligibility-service before billing."
    )

    return PredictResponse(
        engine_version=ENGINE_VERSION,
        state_code=req.state_code,
        likely_eligible=likely,
        probability=round(probability, 3),
        suggested_program=program,
        benefits=benefits,
        explanation=explanation,
        requires_real_lookup=True,
    )
