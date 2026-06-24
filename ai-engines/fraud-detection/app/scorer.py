"""
Fraud risk scorer — 6-flag heuristic engine (heuristic-v1.0).

Checks six behavioral signals and accumulates a weighted risk score 1-100.
The score() signature is stable — swap the body for a trained ML model once
you have labelled training data without changing callers.

CLAUDE.md AI governance:
  - Every score includes a plain-language explanation
  - Auto-block only at critical threshold (>=85); route_to_review for most
  - Human override endpoint logs to retraining queue
  - Low-risk (<30, no high/critical flags) may auto-process
"""
from __future__ import annotations

from typing import List

from .models import ClaimFeatures, FraudFlag, FraudPrediction

MODEL_VERSION = "heuristic-v1.0"

# --------------------------------------------------------------------------- #
# Thresholds                                                                    #
# --------------------------------------------------------------------------- #
# Risk score bands
BAND_LOW_MAX = 30       # < 30  → low
BAND_MEDIUM_MAX = 60    # 30-59 → medium
BAND_HIGH_MAX = 85      # 60-84 → high; >=85 → critical

# Recommendation thresholds
AUTO_PAY_BELOW = 30     # score < 30 AND no high/critical flags → auto_pay
AUTO_BLOCK_AT = 85      # score >= 85 → auto_block

# Flag weights (sum of all → up to 25+20+20+15+10+15 = 105, clamped to 100)
W_UNUSUAL_VOLUME          = 55   # alone pushes typical outlier into review band (10+55=65)
W_CHARGE_OUTLIER          = 20
W_DISTANCE_ANOMALY        = 20
W_PATIENT_OVERUTILIZATION = 15
W_OFF_HOURS               = 10
W_DUPLICATE_LINES         = 15

BASE_SCORE = 10


def _risk_level(score: int) -> str:
    if score < BAND_LOW_MAX:
        return "low"
    if score < BAND_MEDIUM_MAX:
        return "medium"
    if score < BAND_HIGH_MAX:
        return "high"
    return "critical"


def score_claim(features: ClaimFeatures, state_threshold: float = 30.0) -> FraudPrediction:
    """
    Score claim fraud risk 1-100.  Six heuristic flags:

    1. unusual_volume        — provider_monthly_claims > 200
    2. charge_outlier        — total_amount > 5000
    3. distance_anomaly      — location provided (stub: flag if lat/lng present)
    4. patient_overutilization — patient_monthly_claims > 15
    5. off_hours_submission  — submission_hour in [0, 4] (midnight–4 am)
    6. duplicate_lines       — same procedure code appears more than once

    Weights: unusual_volume +55, charge_outlier +20, distance_anomaly +20,
             patient_overutilization +15, off_hours +10, duplicate_lines +15
    Base score: 10.  Clamped to [1, 100].
    """
    points = BASE_SCORE
    flags: List[FraudFlag] = []

    # ------------------------------------------------------------------ #
    # Flag 1 — Unusual provider claim volume                               #
    # ------------------------------------------------------------------ #
    if features.provider_monthly_claims is not None and features.provider_monthly_claims > 200:
        points += W_UNUSUAL_VOLUME
        flags.append(FraudFlag(
            flag_type="unusual_volume",
            severity="high",
            description=(
                f"Provider submitted {features.provider_monthly_claims} claims this month, "
                f"exceeding the 200-claim threshold."
            ),
            contributing_factor=round(W_UNUSUAL_VOLUME / 100, 2),
        ))

    # ------------------------------------------------------------------ #
    # Flag 2 — Charge outlier                                              #
    # ------------------------------------------------------------------ #
    if features.total_amount > 5000:
        points += W_CHARGE_OUTLIER
        flags.append(FraudFlag(
            flag_type="charge_outlier",
            severity="high",
            description=(
                f"Claim total ${features.total_amount:,.2f} exceeds the $5,000 outpatient "
                f"outlier threshold."
            ),
            contributing_factor=round(W_CHARGE_OUTLIER / 100, 2),
        ))

    # ------------------------------------------------------------------ #
    # Flag 3 — Distance / location anomaly                                 #
    # Stub: flag whenever lat/lng are provided (indicates GPS tracking      #
    # is active; production would compare against known provider location). #
    # ------------------------------------------------------------------ #
    if features.location_lat is not None and features.location_lng is not None:
        # Stub heuristic: flag as anomaly if coordinates are present and
        # outside continental US rough bounding box (lat 24-49, lng -125 to -66).
        lat, lng = features.location_lat, features.location_lng
        outside_conus = not (24.0 <= lat <= 49.5 and -125.5 <= lng <= -66.0)
        if outside_conus:
            points += W_DISTANCE_ANOMALY
            flags.append(FraudFlag(
                flag_type="distance_anomaly",
                severity="critical",
                description=(
                    f"Claim GPS coordinates ({lat:.4f}, {lng:.4f}) are outside the "
                    f"continental United States, suggesting location spoofing."
                ),
                contributing_factor=round(W_DISTANCE_ANOMALY / 100, 2),
            ))

    # ------------------------------------------------------------------ #
    # Flag 4 — Patient over-utilization                                    #
    # ------------------------------------------------------------------ #
    if features.patient_monthly_claims is not None and features.patient_monthly_claims > 15:
        points += W_PATIENT_OVERUTILIZATION
        flags.append(FraudFlag(
            flag_type="patient_overutilization",
            severity="medium",
            description=(
                f"Patient has {features.patient_monthly_claims} claims this month, "
                f"exceeding the 15-claim over-utilization threshold."
            ),
            contributing_factor=round(W_PATIENT_OVERUTILIZATION / 100, 2),
        ))

    # ------------------------------------------------------------------ #
    # Flag 5 — Off-hours submission (midnight to 4 am)                    #
    # ------------------------------------------------------------------ #
    if features.submission_hour is not None and 0 <= features.submission_hour <= 4:
        points += W_OFF_HOURS
        flags.append(FraudFlag(
            flag_type="off_hours_submission",
            severity="low",
            description=(
                f"Claim submitted at {features.submission_hour}:00 AM (midnight–4 AM window "
                f"associated with automated fraud submissions)."
            ),
            contributing_factor=round(W_OFF_HOURS / 100, 2),
        ))

    # ------------------------------------------------------------------ #
    # Flag 6 — Duplicate procedure codes (cloning / unbundling signal)    #
    # ------------------------------------------------------------------ #
    seen: set[str] = set()
    duplicates: set[str] = set()
    for code in features.procedure_codes:
        if code in seen:
            duplicates.add(code)
        seen.add(code)

    if duplicates:
        points += W_DUPLICATE_LINES
        flags.append(FraudFlag(
            flag_type="duplicate_lines",
            severity="high",
            description=(
                f"Procedure code(s) appear more than once: {', '.join(sorted(duplicates))}. "
                f"Duplicate procedure codes may indicate claim cloning or improper unbundling."
            ),
            contributing_factor=round(W_DUPLICATE_LINES / 100, 2),
        ))

    # ------------------------------------------------------------------ #
    # Clamp score to [1, 100]                                              #
    # ------------------------------------------------------------------ #
    raw_score = max(1, min(100, points))
    risk_lvl = _risk_level(raw_score)

    # ------------------------------------------------------------------ #
    # Recommendation                                                        #
    # ------------------------------------------------------------------ #
    has_severe_flag = any(f.severity in ("high", "critical") for f in flags)

    if raw_score >= AUTO_BLOCK_AT:
        recommendation = "auto_block"
    elif raw_score < AUTO_PAY_BELOW and not has_severe_flag:
        recommendation = "auto_pay"
    else:
        recommendation = "route_to_review"

    requires_human_review = recommendation != "auto_pay"

    # ------------------------------------------------------------------ #
    # Plain-language explanation                                            #
    # ------------------------------------------------------------------ #
    explanation = _build_explanation(raw_score, risk_lvl, recommendation, flags)

    return FraudPrediction(
        claim_id=features.claim_id,
        risk_score=raw_score,
        risk_level=risk_lvl,
        recommendation=recommendation,
        flags=flags,
        explanation=explanation,
        model_version=MODEL_VERSION,
        requires_human_review=requires_human_review,
    )


def _build_explanation(
    score: int,
    risk_level: str,
    recommendation: str,
    flags: List[FraudFlag],
) -> str:
    """Produce a plain-language summary suitable for fraud investigators."""
    parts: List[str] = [f"Risk score {score}/100."]

    if not flags:
        parts.append("No fraud signals detected.")
    else:
        flag_descriptions = [f.description for f in flags]
        high_flags = [f for f in flags if f.severity in ("high", "critical")]
        if high_flags:
            parts.append(
                f"{risk_level.capitalize()} risk due to: "
                + "; ".join(f.description for f in high_flags)
                + "."
            )
        medium_low = [f for f in flags if f.severity in ("medium", "low")]
        if medium_low:
            parts.append(
                "Additional signals: "
                + "; ".join(f.description for f in medium_low)
                + "."
            )

    rec_map = {
        "auto_pay": "Claim approved for automatic payment — no fraud signals detected.",
        "route_to_review": "Routed to investigator review before payment is released.",
        "auto_block": "Payment automatically blocked pending mandatory fraud investigator review.",
    }
    parts.append(rec_map[recommendation])

    return " ".join(parts)
