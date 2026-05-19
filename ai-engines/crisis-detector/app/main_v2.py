"""
crisis-detector — FastAPI entrypoint (v2, port 8009).

Exposes:
  GET  /health      — liveness probe
  GET  /metrics     — Prometheus metrics
  POST /v1/detect   — CrisisDetectRequest → CrisisDetectResponse
"""
from __future__ import annotations

import time

from fastapi import FastAPI
from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

from .logging_config import configure_logging
from .detector_v2 import detect_crisis, MODEL_VERSION
from .models import CrisisDetectRequest, CrisisDetectResponse

SERVICE_NAME = "crisis-detector"
log = configure_logging(SERVICE_NAME)

app = FastAPI(title=SERVICE_NAME, version="2.0.0")

detections_total = Counter(
    "medguard_crisis_detections_total",
    "Total crisis detections by level.",
    labelnames=("crisis_level",),
)
indicator_hits_total = Counter(
    "medguard_crisis_indicator_hits_total",
    "Crisis indicator matches by type.",
    labelnames=("indicator_type",),
)
detect_latency = Histogram(
    "medguard_crisis_detect_seconds",
    "Crisis detection latency in seconds.",
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25),
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": SERVICE_NAME, "model_version": MODEL_VERSION}


@app.post("/v1/detect", response_model=CrisisDetectResponse)
def detect_endpoint(req: CrisisDetectRequest) -> CrisisDetectResponse:
    start = time.perf_counter()
    try:
        result = detect_crisis(req)
        detections_total.labels(crisis_level=result.crisis_level).inc()
        for indicator in result.indicators:
            indicator_hits_total.labels(indicator_type=indicator.indicator_type).inc()
        log.info(
            "crisis_detection_complete",
            extra={
                "crisis_detected": result.crisis_detected,
                "crisis_level": result.crisis_level,
                "indicator_count": len(result.indicators),
                "confidence": result.confidence,
                "patient_id": req.patient_id,
                "encounter_id": req.encounter_id,
            },
        )
        return result
    finally:
        detect_latency.observe(time.perf_counter() - start)
