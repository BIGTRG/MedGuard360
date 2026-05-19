"""eligibility-intel entrypoint — FastAPI on port 8010."""
from __future__ import annotations

import time
from fastapi import FastAPI
from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

from .logging_config import configure_logging
from .predictor import ENGINE_VERSION, predict
from .schemas import PredictRequest, PredictResponse

SERVICE_NAME = "eligibility-intel"
log = configure_logging(SERVICE_NAME)
app = FastAPI(title=SERVICE_NAME, version="0.1.0")

predicts_total = Counter("medguard_eligibility_predicts_total", "Eligibility predictions.",
                         labelnames=("program", "eligible"))
latency = Histogram("medguard_eligibility_predict_seconds", "Predictor latency.",
                    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1))

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "engine_version": ENGINE_VERSION}


@app.post("/v1/predict", response_model=PredictResponse)
def predict_endpoint(req: PredictRequest) -> PredictResponse:
    start = time.perf_counter()
    try:
        result = predict(req)
        predicts_total.labels(program=result.suggested_program, eligible=str(result.likely_eligible)).inc()
        return result
    finally:
        latency.observe(time.perf_counter() - start)
