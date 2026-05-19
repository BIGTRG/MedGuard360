# MedGuard360 — AI Engine Training Guide

Every ML engine ships with two implementations:
- **Heuristic** (default) — deterministic rules, no model file required
- **Trained** — drops in when an env var points to a saved model

This guide explains how to train each model and switch the engine to use it.

## fraud-detection (port 8004)

```bash
cd ai-engines/fraud-detection
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python train.py                                    # synthetic data
python train.py --csv my_labeled_claims.csv        # real data

# Serve:
MODEL_PATH=models/fraud_v1.joblib uvicorn app.main:app --port 8004
```

CSV columns expected: the 14 features in `app/schemas.py:ClaimFeatures` + `is_fraud` label.
Real-data source: `fraud_cases` rows joined with `claims` features.

## pa-nlp-matcher (port 8006)

```bash
cd ai-engines/pa-nlp-matcher
pip install sentence-transformers torch
python train.py
# OR with a clinical-domain base model:
PA_NLP_BASE_MODEL=pritamdeka/S-BioBert-snli-multinli-stsb python train.py

# Serve:
PA_NLP_MODEL=./models/pa_v1 uvicorn app.main:app --port 8006
```

CSV columns: `clinical_text,criterion_text,label` (label ∈ [0, 1] for cosine similarity).

## crisis-detector (port 8009)

```bash
cd ai-engines/crisis-detector
pip install transformers torch
python train.py
# Or with more epochs:
CRISIS_EPOCHS=5 python train.py

# Serve: (the engine's detector.py still runs the pattern check
# as a safety net; the trained model adds precision)
CRISIS_MODEL_PATH=./models/crisis_v1 uvicorn app.main:app --port 8009
```

CSV columns: `text,category` (categories listed in `train.py:CATEGORIES`).

## fraud-ring-gnn (port 8005)

```bash
cd ai-engines/fraud-ring-gnn
pip install torch torch-geometric
python train.py

# Serve:
GNN_MODEL_PATH=./models/ring_v1.pt uvicorn app.main:app --port 8005
```

For real data: extract entity-entity graph from your Postgres
(`fraud-engine-service/src/ringScan.ts` shows the SQL pattern) and label
nodes by membership in confirmed-fraud rings from `fraud_cases`.

## AI governance reminders

Every model output already includes:
- `engine_version` — exact model identifier (bump when retraining)
- Plain-language `explanation` — for the human reviewing the recommendation
- `/v1/override-log` endpoint — captures human overrides for next training cycle

When a model is overridden by humans > 15% of the time on a given category,
**retrain.** The override-log Prometheus counter (`medguard_*_overrides_total`)
makes the trigger visible.

## Retraining cadence

CLAUDE.md says quarterly. AlertManager rule recommended:

```yaml
- alert: ModelOverrideRateHigh
  expr: |
    sum(rate(medguard_fraud_overrides_total[7d])) by (from_rec)
      / sum(rate(medguard_fraud_scores_total[7d])) by (recommendation) > 0.15
  for: 24h
  annotations:
    summary: "{{ $labels.from_rec }} fraud override rate > 15% — retrain"
```
