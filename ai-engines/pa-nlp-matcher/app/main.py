"""
pa-nlp-matcher entrypoint — FastAPI on port 8006.

Endpoints:
  GET  /health           — liveness (model loaded?)
  GET  /metrics          — Prometheus metrics
  POST /v1/match         — BERT semantic similarity: PA criteria vs. clinical docs
  POST /v1/override-log  — record a PA specialist override (retraining signal)
"""
from __future__ import annotations

import os
import time

from contextlib import asynccontextmanager
from fastapi import FastAPI
from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

from .logging_config import configure_logging
from .matcher import load_model, match_criteria, _model_backend, MODEL_NAME
from .models import MatchRequest, MatchResponse, OverrideLogRequest

SERVICE_NAME = "pa-nlp-matcher"
log = configure_logging(SERVICE_NAME)

# Module-level model handle — populated during lifespan startup
model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the NLP model on startup so the first request is fast."""
    global model
    if not os.getenv("SKIP_WARMUP"):
        log.info(
            "loading_nlp_model",
            extra={"model_name": MODEL_NAME, "service": SERVICE_NAME},
        )
        model = load_model()
        log.info(
            "nlp_model_loaded",
            extra={"backend": _model_backend, "model_name": MODEL_NAME},
        )
    yield
    # (Cleanup on shutdown — no-op for in-process models)


app = FastAPI(
    title="MedGuard360 PA NLP Matcher",
    version="1.0.0",
    description=(
        "BERT semantic similarity engine for Prior Authorization criteria matching. "
        "Compares clinical documentation against coverage criteria and returns "
        "per-criterion outcomes (met / not_met / indeterminate)."
    ),
    lifespan=lifespan,
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics")

# Custom Prometheus metrics
matches_total = Counter(
    "medguard_pa_nlp_matches_total",
    "PA NLP match invocations, labeled by recommendation.",
    labelnames=("recommendation",),
)
match_latency = Histogram(
    "medguard_pa_nlp_match_seconds",
    "End-to-end /v1/match latency including model inference.",
    buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)
overrides_total = Counter(
    "medguard_pa_nlp_human_overrides_total",
    "PA specialist overrides of AI recommendations (quarterly retraining signal).",
    labelnames=("ai_recommendation", "human_decision"),
)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": SERVICE_NAME,
        "model_name": MODEL_NAME,
        "model_backend": _model_backend,
        "model_loaded": model is not None,
    }


@app.post("/v1/match", response_model=MatchResponse)
def match_endpoint(request: MatchRequest) -> MatchResponse:
    """
    Evaluate clinical documentation against a list of PA criteria.

    Returns per-criterion outcomes and an overall recommendation.
    requires_human_review is always True — AI governance policy.
    """
    start = time.perf_counter()
    result = match_criteria(request)
    elapsed = time.perf_counter() - start

    matches_total.labels(recommendation=result.overall_recommendation).inc()
    match_latency.observe(elapsed)

    outcomes_summary = {
        m.outcome.value: sum(1 for mm in result.criterion_matches if mm.outcome == m.outcome)
        for m in result.criterion_matches
    }

    log.info(
        "pa_criteria_matched",
        extra={
            "overall_recommendation": result.overall_recommendation,
            "overall_confidence": result.overall_confidence,
            "n_criteria": len(result.criterion_matches),
            "outcomes": outcomes_summary,
            "model_used": result.model_used,
            "latency_ms": round(elapsed * 1000, 2),
        },
    )

    return result


@app.post("/v1/override-log")
def log_override(req: OverrideLogRequest) -> dict:
    """
    Record a PA specialist's override of an AI recommendation.

    Per CLAUDE.md AI governance: AI NEVER makes final PA approval/denial decisions.
    All PA decisions require specialist review. Overrides are aggregated
    quarterly for model retraining.
    """
    overrides_total.labels(
        ai_recommendation=req.predicted_recommendation,
        human_decision=req.human_decision,
    ).inc()

    log.info(
        "pa_specialist_override_logged",
        extra={
            "pa_request_id": req.pa_request_id,
            "predicted_recommendation": req.predicted_recommendation,
            "human_decision": req.human_decision,
            "specialist_id": req.specialist_id,
            "override_reason": req.override_reason,
        },
    )

    return {
        "logged": True,
        "message": "Override logged for retraining pipeline.",
    }
