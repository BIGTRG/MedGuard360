"""denial-predictor entrypoint — FastAPI on port 8007."""
from __future__ import annotations

import time
from fastapi import FastAPI
from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

from .logging_config import configure_logging
from .predictor import ENGINE_VERSION, predict, draft_appeal, using_trained_model
from .schemas import DraftAppealRequest, DraftAppealResponse, PredictRequest, PredictResponse

SERVICE_NAME = "denial-predictor"
log = configure_logging(SERVICE_NAME)
app = FastAPI(title=SERVICE_NAME, version="0.1.0")

predicts_total = Counter("medguard_denial_predicts_total", "Denial predictions by recommendation.",
                         labelnames=("recommendation",))
appeals_total = Counter("medguard_denial_appeals_total", "Appeals drafted, by CARC code.",
                        labelnames=("carc",))
latency = Histogram("medguard_denial_predict_seconds", "Predictor latency.",
                    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5))
overrides_total = Counter("medguard_denial_overrides_total", "Human overrides of AI recommendations.",
                          labelnames=("from_rec", "to_decision"))

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "engine_version": ENGINE_VERSION, "trained_model_loaded": using_trained_model()}


@app.post("/v1/predict", response_model=PredictResponse)
def predict_endpoint(req: PredictRequest) -> PredictResponse:
    start = time.perf_counter()
    try:
        result = predict(req)
        predicts_total.labels(recommendation=result.recommendation).inc()
        return result
    finally:
        latency.observe(time.perf_counter() - start)


@app.post("/v1/draft-appeal", response_model=DraftAppealResponse)
def draft_endpoint(req: DraftAppealRequest) -> DraftAppealResponse:
    result = draft_appeal(req)
    appeals_total.labels(carc=req.denial_code).inc()
    return result


@app.post("/v1/override-log")
def override_log(payload: dict) -> dict:
    overrides_total.labels(
        from_rec=str(payload.get("ai_recommendation", "unknown")),
        to_decision=str(payload.get("human_decision", "unknown")),
    ).inc()
    log.info("denial_override_logged", extra=payload)
    return {"recorded": True}
