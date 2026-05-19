import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

from .models import AnalyzeRequest, AnalyzeResponse
from .nlp_engine import analyze_text, load_nlp_model

logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp":"%(asctime)s","level":"%(levelname)s","service":"clinical-nlp","message":"%(message)s"}',
)

_nlp_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _nlp_model
    if not os.getenv("SKIP_WARMUP"):
        _nlp_model = load_nlp_model()
    yield


app = FastAPI(title="MedGuard360 Clinical NLP", version="1.0.0", lifespan=lifespan)
Instrumentator().instrument(app).expose(app)


@app.get("/health")
def health():
    return {"status": "ok", "service": "clinical-nlp"}


@app.post("/v1/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest):
    return analyze_text(request, _nlp_model)


@app.post("/v1/override-log")
def log_override(req: dict):
    logging.getLogger("clinical-nlp").info("Override logged: %s", req)
    return {"logged": True, "message": "Override logged for retraining pipeline"}
