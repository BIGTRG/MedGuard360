"""
Crisis language detector v2 — uses models.py CrisisDetectResponse schema.

Production swaps in a fine-tuned BERT/RoBERTa classifier. For dev we ship a
phrase-pattern detector with high recall (biased toward false positives over
missed crises). All results route to human review — AI is a triage aid only.
"""
from __future__ import annotations

import re
from typing import List

from .models import CrisisDetectRequest, CrisisDetectResponse, CrisisIndicator

MODEL_VERSION = "keyword-classifier-v1.0"

# Crisis indicator patterns: (regex, indicator_type, severity, base_confidence)
CRISIS_PATTERNS = [
    # Suicidal ideation — severe
    (
        r"\b(?:want to die|kill myself|end my life|suicidal|suicide attempt|thoughts of suicide)\b",
        "suicidal_ideation",
        "severe",
        0.92,
    ),
    (
        r"\b(?:don't want to live|no reason to live|better off dead|wish I was dead)\b",
        "suicidal_ideation",
        "severe",
        0.89,
    ),
    (
        r"\b(?:thinking about suicide|considering suicide)\b",
        "suicidal_ideation",
        "moderate",
        0.85,
    ),
    # Self-harm — moderate
    (
        r"\b(?:cutting myself|self-harm|self harm|hurt myself|burning myself)\b",
        "self_harm",
        "moderate",
        0.88,
    ),
    # Homicidal — severe
    (
        r"\b(?:want to kill|hurt someone|harm others|homicidal)\b",
        "homicidal",
        "severe",
        0.90,
    ),
    # Substance crisis — moderate/high
    (
        r"\b(?:overdose|OD|took too many|mixed substances|can't stop using)\b",
        "substance_crisis",
        "moderate",
        0.85,
    ),
    # Psychiatric emergency — moderate
    (
        r"\b(?:psychosis|hallucinating|paranoid|voices telling me|not reality)\b",
        "psychiatric_emergency",
        "moderate",
        0.82,
    ),
    # Mild indicators
    (
        r"\b(?:hopeless|worthless|no point|give up|can't go on)\b",
        "suicidal_ideation",
        "mild",
        0.72,
    ),
]

RECOMMENDED_ACTIONS = {
    "critical": (
        "IMMEDIATELY contact emergency services (911) and activate crisis response protocol. "
        "Do not leave patient alone."
    ),
    "high": (
        "Alert crisis team within 15 minutes. Activate crisis plan. Contact emergency contacts."
    ),
    "medium": (
        "Initiate safety assessment. Contact on-call mental health provider within 1 hour."
    ),
    "low": (
        "Document and monitor. Schedule follow-up within 24 hours. Review crisis plan."
    ),
    "none": "No immediate action required. Continue standard care.",
}


def detect_crisis(request: CrisisDetectRequest) -> CrisisDetectResponse:
    """
    Detect crisis indicators in clinical text.

    Always sets requires_human_review=True. AI output is a triage signal only;
    a clinician must review every positive detection before any patient action.
    """
    text = request.text
    indicators: List[CrisisIndicator] = []

    for pattern, indicator_type, severity, base_confidence in CRISIS_PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            indicators.append(
                CrisisIndicator(
                    phrase=match.group(),
                    indicator_type=indicator_type,
                    severity=severity,
                    confidence=base_confidence,
                )
            )

    # Determine crisis level from indicator severity profile
    if not indicators:
        crisis_level = "none"
        crisis_detected = False
        confidence = 0.95
    else:
        severe_count = sum(1 for i in indicators if i.severity == "severe")
        moderate_count = sum(1 for i in indicators if i.severity == "moderate")

        if severe_count >= 2 or any(i.indicator_type == "homicidal" for i in indicators):
            crisis_level = "critical"
        elif severe_count >= 1:
            crisis_level = "high"
        elif moderate_count >= 2:
            crisis_level = "medium"
        elif moderate_count >= 1:
            crisis_level = "low"
        else:
            crisis_level = "low"

        crisis_detected = True
        confidence = round(max(i.confidence for i in indicators), 4)

    unique_types = set(i.indicator_type for i in indicators)
    explanation = (
        (
            "No crisis indicators detected"
            if not crisis_detected
            else f"Detected {len(indicators)} crisis indicator(s)"
        )
        + f". Crisis level: {crisis_level.upper()}."
        + (
            f" Indicators include: {', '.join(sorted(unique_types))}."
            if indicators
            else ""
        )
        + " This must be reviewed by a clinician — the AI is a triage aid, not a diagnostic tool."
    )

    return CrisisDetectResponse(
        crisis_detected=crisis_detected,
        crisis_level=crisis_level,
        confidence=confidence,
        indicators=indicators,
        explanation=explanation,
        recommended_action=RECOMMENDED_ACTIONS[crisis_level],
        requires_human_review=True,
        model_version=MODEL_VERSION,
    )
