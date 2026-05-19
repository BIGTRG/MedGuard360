"""
fraud-detection entrypoint — FastAPI on port 8004.

Endpoints:
  GET  /health           — liveness check
  GET  /metrics          — Prometheus metrics
  POST /v1/score         — score a claim for fraud risk (1-100)
  POST /v1/override-log  — record investigator override for retraining
"""
from __future__ import annotations

import logging
import os
import json
import time

from fastapi import FastAPI, Query
from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

from .logging_config import configure_logging
from .models import ClaimFeatures, FraudPrediction, OverrideLogRequest
from .scorer import MODEL_VERSION, score_claim

SERVICE_NAME = "fraud-detection"
log = configure_logging(SERVICE_NAME)

app = FastAPI(
    title="MedGuard360 Fraud Detection",
    version="1.0.0",
    description=(
        "Claim risk scoring engine. Produces a 1–100 risk score based on "
        "6 heuristic flags. Designed for drop-in replacement with a trained ML model."
    ),
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics")

# Custom Prometheus counters
scores_total = Counter(
    "medguard_fraud_scores_total",
    "Claims scored, labeled by recommendation.",
    labelnames=("recommendation", "risk_level"),
)
flags_raised_total = Counter(
    "medguard_fraud_flags_raised_total",
    "Fraud flags raised, labeled by flag type.",
    labelnames=("flag_type",),
)
score_latency = Histogram(
    "medguard_fraud_score_seconds",
    "End-to-end /v1/score latency.",
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0),
)
overrides_total = Counter(
    "medguard_fraud_overrides_total",
    "Human investigator overrides of AI fraud recommendations.",
    labelnames=("direction",),  # escalated | de-escalated | unchanged
)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": SERVICE_NAME,
        "version": "1.0.0",
        "model_version": MODEL_VERSION,
    }


@app.post("/v1/score", response_model=FraudPrediction)
def score_claim_endpoint(
    features: ClaimFeatures,
    state_threshold: float = Query(
        default=30.0,
        description="State-specific auto-pay threshold override (0.0–100.0).",
        ge=0.0,
        le=100.0,
    ),
) -> FraudPrediction:
    """Score a claim for fraud risk and return a 1–100 risk score with flags."""
    start = time.perf_counter()
    result = score_claim(features, state_threshold=state_threshold)
    elapsed = time.perf_counter() - start

    # Prometheus metrics
    scores_total.labels(
        recommendation=result.recommendation,
        risk_level=result.risk_level,
    ).inc()
    for flag in result.flags:
        flags_raised_total.labels(flag_type=flag.flag_type).inc()
    score_latency.observe(elapsed)

    # Structured JSON log
    log.info(
        "claim_scored",
        extra={
            "claim_id": result.claim_id,
            "risk_score": result.risk_score,
            "risk_level": result.risk_level,
            "recommendation": result.recommendation,
            "flags": [f.flag_type for f in result.flags],
            "model_version": result.model_version,
            "latency_ms": round(elapsed * 1000, 2),
            "state_threshold": state_threshold,
        },
    )

    return result


@app.post("/v1/override-log")
def log_override(req: OverrideLogRequest) -> dict:
    """
    Log a human investigator's override of an AI fraud recommendation.
    Overrides are aggregated quarterly for model retraining.

    Per CLAUDE.md AI governance: AI NEVER makes final fraud determinations.
    All consequential decisions require human review.
    """
    delta = req.human_risk_score - req.predicted_risk_score
    if delta > 5:
        direction = "escalated"
    elif delta < -5:
        direction = "de-escalated"
    else:
        direction = "unchanged"

    overrides_total.labels(direction=direction).inc()

    log.info(
        "investigator_override_logged",
        extra={
            "claim_id": req.claim_id,
            "predicted_risk_score": req.predicted_risk_score,
            "human_risk_score": req.human_risk_score,
            "delta": delta,
            "direction": direction,
            "investigator_id": req.investigator_id,
            "override_reason": req.override_reason,
        },
    )

    return {
        "logged": True,
        "message": "Override logged for retraining pipeline.",
    }
