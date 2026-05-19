"""fraud-ring-gnn entrypoint — FastAPI on port 8005."""
from __future__ import annotations

import time
from fastapi import FastAPI
from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

from .logging_config import configure_logging
from .ring_detector import ENGINE_VERSION, detect
from .schemas import DetectRequest, DetectResponse

SERVICE_NAME = "fraud-ring-gnn"
log = configure_logging(SERVICE_NAME)
app = FastAPI(title=SERVICE_NAME, version="0.1.0")

rings_total = Counter("medguard_fraud_rings_total", "Fraud rings detected.",
                       labelnames=("size_bucket",))
latency     = Histogram("medguard_fraud_ring_detect_seconds", "Ring detection latency.",
                        buckets=(0.01, 0.1, 0.5, 1, 2.5, 5, 10, 30))

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "engine_version": ENGINE_VERSION}


@app.post("/v1/detect", response_model=DetectResponse)
def detect_endpoint(req: DetectRequest) -> DetectResponse:
    start = time.perf_counter()
    try:
        result = detect(req.nodes, req.edges, req.min_ring_size)
        for r in result.rings:
            bucket = "small" if r.size < 5 else "medium" if r.size < 15 else "large"
            rings_total.labels(size_bucket=bucket).inc()
        return result
    finally:
        latency.observe(time.perf_counter() - start)
