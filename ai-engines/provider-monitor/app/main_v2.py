"""
provider-monitor — FastAPI entrypoint (v2, port 8008).

Exposes:
  GET  /health         — liveness probe
  GET  /metrics        — Prometheus metrics
  POST /v1/monitor     — ProviderMonitorRequest → MonitorResult
"""
from __future__ import annotations

import time

from fastapi import FastAPI
from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

from .logging_config import configure_logging
from .monitor_v2 import monitor_provider, MODEL_VERSION
from .models import ProviderMonitorRequest, MonitorResult

SERVICE_NAME = "provider-monitor"
log = configure_logging(SERVICE_NAME)

app = FastAPI(title=SERVICE_NAME, version="2.0.0")

alerts_total = Counter(
    "medguard_provider_monitor_alerts_total",
    "Total alerts triggered by provider monitor.",
    labelnames=("alert_type", "severity"),
)
monitor_latency = Histogram(
    "medguard_provider_monitor_seconds",
    "Provider monitor check latency in seconds.",
    buckets=(0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0),
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": SERVICE_NAME, "model_version": MODEL_VERSION}


@app.post("/v1/monitor", response_model=MonitorResult)
def monitor_endpoint(req: ProviderMonitorRequest) -> MonitorResult:
    start = time.perf_counter()
    try:
        result = monitor_provider(req)
        for alert in result.alerts:
            alerts_total.labels(alert_type=alert.alert_type, severity=alert.severity).inc()
        log.info(
            "provider_monitor_complete",
            extra={
                "provider_id": req.provider_id,
                "npi": req.npi,
                "alert_count": len(result.alerts),
                "overall_risk_level": result.overall_risk_level,
                "requires_human_review": result.requires_human_review,
            },
        )
        return result
    finally:
        monitor_latency.observe(time.perf_counter() - start)
