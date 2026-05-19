"""ocr-engine — FastAPI on port 8003.

Exposes two processing endpoints:
  POST /v1/process  — spec endpoint: accepts file_path + file_type, uses Tesseract processor
  POST /v1/ocr      — legacy endpoint: accepts document_url, downloads + runs OCR pipeline
"""
from __future__ import annotations

import time

from fastapi import FastAPI, HTTPException
from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

from .logging_config import configure_logging
from .models import OcrRequest, OcrResponse
from .processor import process_document
from .ocr import ENGINE_VERSION, ocr, warmup
from .schemas import OcrRequest as LegacyOcrRequest, OcrResponse as LegacyOcrResponse

SERVICE_NAME = "ocr-engine"
log = configure_logging(SERVICE_NAME)
app = FastAPI(title=SERVICE_NAME, version="0.1.0")

ocr_total = Counter(
    "medguard_ocr_total",
    "OCR invocations by classified document type and outcome.",
    labelnames=("doc_class", "outcome"),
)
ocr_latency = Histogram(
    "medguard_ocr_seconds",
    "End-to-end OCR latency in seconds.",
    buckets=(0.5, 1, 2.5, 5, 10, 30, 60, 120),
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.on_event("startup")
def _startup() -> None:
    warmup()
    log.info("ocr-engine ready", extra={"engine": ENGINE_VERSION})


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "engine_version": ENGINE_VERSION}


@app.post("/v1/process", response_model=OcrResponse)
def process_endpoint(req: OcrRequest) -> OcrResponse:
    """
    Spec endpoint: accepts a local or MinIO file_path + file_type.
    Runs Tesseract OCR via processor.py and returns classification +
    extracted fields. requires_human_review is always True per AI governance.
    """
    start = time.perf_counter()
    try:
        result = process_document(req)
        ocr_total.labels(doc_class=result.document_class.value, outcome="success").inc()
        return result
    except Exception as err:
        ocr_total.labels(doc_class="unknown", outcome="error").inc()
        log.error("process failed", extra={"file_path": req.file_path, "error": str(err)})
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {err}")
    finally:
        ocr_latency.observe(time.perf_counter() - start)


@app.post("/v1/ocr", response_model=LegacyOcrResponse)
def ocr_endpoint(req: LegacyOcrRequest) -> LegacyOcrResponse:
    """
    Legacy endpoint: accepts a document_url (MinIO pre-signed or HTTP URL),
    downloads it and runs the OCR + classify pipeline.
    """
    start = time.perf_counter()
    try:
        result = ocr(req.document_url, req.correlation_id, req.expected_class)
        ocr_total.labels(doc_class=result.classified_as, outcome="success").inc()
        return result
    except Exception as err:
        ocr_total.labels(doc_class="unknown", outcome="error").inc()
        log.error("ocr failed", extra={"document_url": req.document_url, "error": str(err)})
        raise HTTPException(status_code=500, detail=f"OCR failed: {err}")
    finally:
        ocr_latency.observe(time.perf_counter() - start)
