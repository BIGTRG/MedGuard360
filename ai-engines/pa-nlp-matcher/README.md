# pa-nlp-matcher

BERT semantic-similarity engine for prior-authorization criteria. Port **8006**.

Called by `prior-auth-service`. Decides, criterion-by-criterion, whether the
patient's clinical evidence supports each rule in the coverage criteria
document — then produces an overall score and a plain-language explanation.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/health`            | Liveness + engine version |
| GET    | `/metrics`           | Prometheus |
| POST   | `/v1/match`          | Score clinical context vs criteria |
| POST   | `/v1/override-log`   | Human overrode AI — log for retraining |

## How matching works

1. Split criteria document into individual lines (1 rule per line, > 15 chars)
2. Split clinical context into sentences
3. Embed both with sentence-transformer (`all-MiniLM-L6-v2` by default;
   swap to `pritamdeka/S-BioBert-...` for clinical-domain accuracy)
4. For each criterion, take max cosine similarity vs any clinical sentence:
   - `≥ 0.70` → **met** (with the matching sentence as evidence excerpt)
   - `≤ 0.30` → **not_met**
   - in between → **indeterminate**
5. Overall score = mean confidence of "met" criteria

## Env vars

- `PA_NLP_MODEL` — model name (default: `sentence-transformers/all-MiniLM-L6-v2`)
- `LOG_LEVEL` — `DEBUG` | `INFO` | `WARN` | `ERROR` (default `INFO`)
- `SKIP_WARMUP=1` — skip the startup warmup (faster boot, slower first request)

## Local dev

```bash
python3.10 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8006
pytest -q
```

## AI governance (per CLAUDE.md)

- Engine **never** auto-decides — always returns a recommendation; the
  prior-auth-service routes it to a human PA specialist queue.
- Every override goes to `/v1/override-log`. The aggregated overrides feed
  quarterly model retraining.
- `engine_version` is stamped on every response so we can attribute
  decisions to specific model versions.
