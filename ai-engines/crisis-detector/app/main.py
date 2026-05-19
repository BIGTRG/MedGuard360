"""crisis-detector entrypoint — FastAPI on port 8009."""
from __future__ import annotations

import time
from fastapi import FastAPI
from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

from .logging_config import configure_logging
from .detector import ENGINE_VERSION, detect
from .schemas import DetectRequest, DetectResponse

SERVICE_NAME = "crisis-detector"
log = configure_logging(SERVICE_NAME)
app = FastAPI(title=SERVICE_NAME, version="0.1.0")

detections_total = Counter("medguard_crisis_detections_total", "Crisis detections.",
                           labelnames=("severity",))
signals_total    = Counter("medguard_crisis_signals_total", "Crisis signals raised by category.",
                           labelnames=("category",))
latency          = Histogram("medguard_crisis_detect_seconds", "Detection latency.",
                             buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1))

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "engine_version": ENGINE_VERSION}


@app.post("/v1/detect", response_model=DetectResponse)
def detect_endpoint(req: DetectRequest) -> DetectResponse:
    start = time.perf_counter()
    try:
        result = detect(req.text, req.context)
        detections_total.labels(severity=result.severity).inc()
        for s in result.signals:
            signals_total.labels(category=s.category).inc()
        return result
    finally:
        latency.observe(time.perf_counter() - start)
