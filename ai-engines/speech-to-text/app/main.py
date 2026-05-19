import logging
import os
import tempfile
from contextlib import asynccontextmanager

from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

from .models import TranscribeRequest, TranscribeResponse
from .transcriber import load_model, transcribe_audio

logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp":"%(asctime)s","level":"%(levelname)s","service":"speech-to-text","message":"%(message)s"}',
)
logger = logging.getLogger("speech-to-text")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not os.getenv("SKIP_WARMUP"):
        load_model()
    yield


app = FastAPI(
    title="MedGuard360 Speech to Text",
    version="1.0.0",
    lifespan=lifespan,
)
Instrumentator().instrument(app).expose(app)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "speech-to-text",
        "model": os.getenv("WHISPER_MODEL", "small"),
    }


@app.post("/v1/transcribe", response_model=TranscribeResponse)
def transcribe(request: TranscribeRequest):
    if not os.path.exists(request.audio_file_path):
        try:
            from minio import Minio

            minio_client = Minio(
                os.getenv("MINIO_ENDPOINT", "minio")
                + ":"
                + os.getenv("MINIO_PORT", "9000"),
                access_key=os.getenv("MINIO_ACCESS_KEY", "medguard"),
                secret_key=os.getenv("MINIO_SECRET_KEY", ""),
                secure=os.getenv("MINIO_SSL", "false").lower() == "true",
            )
            parts = request.audio_file_path.lstrip("/").split("/", 1)
            bucket = parts[0] if len(parts) > 1 else "medguard360-audio"
            obj_path = parts[1] if len(parts) > 1 else parts[0]

            with tempfile.NamedTemporaryFile(suffix=".audio", delete=False) as tmp:
                minio_client.fget_object(bucket, obj_path, tmp.name)
                result = transcribe_audio(tmp.name, request.language)
                os.unlink(tmp.name)
                return result
        except Exception as exc:
            logger.warning("Could not download from MinIO: %s. Using stub.", exc)

    return transcribe_audio(request.audio_file_path, request.language)
