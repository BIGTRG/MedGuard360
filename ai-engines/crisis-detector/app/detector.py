"""
Crisis-language detector.

Production swaps in a fine-tuned BERT/RoBERTa classifier trained on clinical
crisis-language corpora. For dev we ship a phrase-pattern detector with broad
coverage; same schema, drop-in upgrade later.

NEVER mishandle this — false negatives are dangerous. We bias toward HIGH
recall (more false positives, fewer missed crises). The downstream system
always routes crisis flags to a human within 3 seconds (CLAUDE.md responder
biometric scan requirement).
"""
from __future__ import annotations

import re

from .schemas import CrisisSignal, DetectResponse

ENGINE_VERSION = "crisis-detector/0.1.0-rules"

PATTERNS: dict[str, list[re.Pattern[str]]] = {
    "suicidal_ideation": [
        re.compile(r"\b(?:want|going|plan)(?:ing)?\s+to\s+(?:kill|end)\s+(?:myself|my\s+life)\b", re.I),
        re.compile(r"\b(?:suicid|killing myself|ending it|won.?t be here|better off dead)\w*\b", re.I),
        re.compile(r"\b(?:no reason to live|nothing left to live for)\b", re.I),
    ],
    "self_harm": [
        re.compile(r"\b(?:cut|cutting|burn(?:ing)?|hurt(?:ing)?)\s+(?:myself|my\s+(?:arms|legs|body))\b", re.I),
        re.compile(r"\b(?:self.?harm|self.?injury|nssi)\b", re.I),
    ],
    "homicidal_ideation": [
        re.compile(r"\b(?:want|going|plan)(?:ing)?\s+to\s+(?:kill|hurt|harm)\s+(?:him|her|them|someone)\b", re.I),
        re.compile(r"\b(?:homicid)\w*\b", re.I),
    ],
    "substance_overdose": [
        re.compile(r"\b(?:overdose|overdosed|took (?:too many|all of) my)\b", re.I),
        re.compile(r"\b(?:fentanyl|opioid|opiate)\s+(?:exposure|overdose)\b", re.I),
    ],
    "domestic_violence": [
        re.compile(r"\b(?:partner|husband|wife|boyfriend|girlfriend)\s+(?:hit|punched|hurt|threatened|beat)\b", re.I),
        re.compile(r"\b(?:domestic\s+violence|intimate\s+partner\s+violence|ipv)\b", re.I),
    ],
    "child_abuse": [
        re.compile(r"\b(?:abused|hit|hurt|molested)\s+(?:my|the)\s+(?:child|kid|daughter|son)\b", re.I),
        re.compile(r"\b(?:child\s+abuse|csa|sexual\s+abuse\s+of\s+a\s+child)\b", re.I),
    ],
    "severe_psychosis": [
        re.compile(r"\b(?:voices?\s+(?:telling|in)\s+my\s+head|command\s+hallucinations)\b", re.I),
        re.compile(r"\b(?:they\s+are\s+after\s+me|the\s+government\s+is\s+tracking)\b", re.I),
    ],
}


def detect(text: str, context: str | None = None) -> DetectResponse:
    signals: list[CrisisSignal] = []
    for category, patterns in PATTERNS.items():
        excerpts: list[str] = []
        hits = 0
        for p in patterns:
            for m in p.finditer(text):
                hits += 1
                start, end = max(0, m.start() - 30), min(len(text), m.end() + 30)
                excerpts.append(text[start:end].strip())
                if len(excerpts) >= 3: break
            if len(excerpts) >= 3: break
        if hits > 0:
            confidence = min(0.95, 0.6 + hits * 0.15)
            signals.append(CrisisSignal(
                category=category,  # type: ignore[arg-type]
                confidence=round(confidence, 3),
                excerpts=excerpts,
            ))

    if not signals:
        return DetectResponse(
            engine_version=ENGINE_VERSION, is_crisis=False, severity="none",
            signals=[CrisisSignal(category="none", confidence=0.99, excerpts=[])],
            recommended_action="no_action",
            explanation="No crisis-language signals detected in the provided text.",
        )

    # Severity: highest single-category confidence drives the level.
    max_conf = max(s.confidence for s in signals)
    if max_conf >= 0.85:   severity = "critical"
    elif max_conf >= 0.70: severity = "high"
    elif max_conf >= 0.50: severity = "moderate"
    else:                   severity = "low"

    high_priority = {"suicidal_ideation", "homicidal_ideation", "child_abuse"}
    has_high_priority = any(s.category in high_priority for s in signals)

    if severity in ("critical", "high") or has_high_priority:
        action = "page_crisis_team_immediately"
    elif severity == "moderate":
        action = "route_to_clinical_review_today"
    else:
        action = "flag_for_routine_followup"

    explanation = (
        f"Detected {len(signals)} crisis-language signal(s). "
        f"Highest confidence: {max_conf:.2f}. Severity classified as {severity}. "
        f"Recommendation: {action.replace('_', ' ')}. "
        f"This must be reviewed by a clinician — the AI is a triage aid, not a diagnostic tool."
    )

    return DetectResponse(
        engine_version=ENGINE_VERSION,
        is_crisis=True, severity=severity,  # type: ignore[arg-type]
        signals=signals,
        recommended_action=action,
        explanation=explanation,
    )
