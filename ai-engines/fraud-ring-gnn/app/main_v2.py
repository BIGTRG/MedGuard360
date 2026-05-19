"""
fraud-ring-gnn — FastAPI entrypoint (v2, port 8005).

Exposes:
  GET  /health          — liveness probe
  GET  /metrics         — Prometheus metrics
  POST /v1/analyze      — RingAnalysisRequest → RingAnalysisResponse
"""
from __future__ import annotations

import time

from fastapi import FastAPI
from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

from .logging_config import configure_logging
from .analyzer import analyze_ring, MODEL_VERSION
from .models import RingAnalysisRequest, RingAnalysisResponse

SERVICE_NAME = "fraud-ring-gnn"
log = configure_logging(SERVICE_NAME)

app = FastAPI(title=SERVICE_NAME, version="2.0.0")

rings_detected_total = Counter(
    "medguard_gnn_rings_detected_total",
    "Number of fraud rings detected.",
    labelnames=("pattern_type",),
)
analysis_latency = Histogram(
    "medguard_gnn_analysis_seconds",
    "Ring analysis latency in seconds.",
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 2.5, 5.0, 10.0),
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": SERVICE_NAME, "model_version": MODEL_VERSION}


@app.post("/v1/analyze", response_model=RingAnalysisResponse)
def analyze_endpoint(req: RingAnalysisRequest) -> RingAnalysisResponse:
    start = time.perf_counter()
    try:
        result = analyze_ring(req)
        for ring in result.detected_rings:
            rings_detected_total.labels(pattern_type=ring.pattern_type).inc()
        log.info(
            "ring_analysis_complete",
            extra={
                "providers": len(req.providers),
                "patients": len(req.patients),
                "rings_found": len(result.detected_rings),
                "overall_risk_score": result.overall_risk_score,
                "model_version": result.model_version,
            },
        )
        return result
    finally:
        analysis_latency.observe(time.perf_counter() - start)
