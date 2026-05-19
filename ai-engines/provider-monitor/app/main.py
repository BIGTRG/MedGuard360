"""provider-monitor entrypoint — FastAPI on port 8008."""
from __future__ import annotations

import time
from fastapi import FastAPI
from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

from .logging_config import configure_logging
from .monitor import ENGINE_VERSION, monitor
from .schemas import MonitorRequest, MonitorResponse

SERVICE_NAME = "provider-monitor"
log = configure_logging(SERVICE_NAME)
app = FastAPI(title=SERVICE_NAME, version="0.1.0")

findings_total = Counter("medguard_provider_monitor_findings_total",
                         "Provider-monitor findings.",
                         labelnames=("severity", "code"))
latency = Histogram("medguard_provider_monitor_seconds", "Monitor batch latency.",
                    buckets=(0.01, 0.1, 0.5, 1, 2.5, 5, 10))

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "engine_version": ENGINE_VERSION}


@app.post("/v1/monitor", response_model=MonitorResponse)
def monitor_endpoint(req: MonitorRequest) -> MonitorResponse:
    start = time.perf_counter()
    try:
        result = monitor(req.snapshots)
        for f in result.findings:
            findings_total.labels(severity=f.severity, code=f.code).inc()
        return result
    finally:
        latency.observe(time.perf_counter() - start)
