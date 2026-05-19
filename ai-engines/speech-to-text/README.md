# speech-to-text

Whisper-based clinical audio transcription. Port **8001**.
Called by `clinical-doc-service` for both real-time encounter capture and
async transcription of uploaded audio.

## Endpoint

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/health`        | Liveness + engine version |
| GET    | `/metrics`       | Prometheus |
| POST   | `/v1/transcribe` | Transcribe audio at `audio_url` (MinIO/HTTP), returns text + word timestamps + confidence |

## Output

JSON with:
- `text` — full transcript
- `segments[]` — chunked with `start`/`end` seconds + per-word timestamps
- `overall_confidence` — derived from Whisper's avg_logprob via `exp()`

## Env

- `WHISPER_MODEL` — `tiny` | `base` | `small` | `medium` | `large-v3` (default `small`)
- `SKIP_WARMUP=1` — skip model load on startup
- `LOG_LEVEL`

## For clinical accuracy

Use `medium` or `large-v3`. Medical terminology + accents push small models'
WER above clinically acceptable thresholds.
