# fraud-detection

Claim risk scoring 1–100. Port **8004**. Called by `fraud-engine-service`
for every submitted claim **before payment** — preventive, not retrospective.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/health`          | Liveness |
| GET    | `/metrics`         | Prometheus |
| POST   | `/v1/score?state_threshold=` | Score a claim's features |
| POST   | `/v1/override-log` | Record a human override |

## Score recommendations

| Score | Recommendation |
|-------|----------------|
| `< 30` (and no high-severity flag) | `auto_pay` |
| `≥ state threshold` (default 80) | `auto_block` |
| anything else | `route_to_review` |

`state-config-service` provides the per-state threshold. fraud-engine-service
reads it and passes via `state_threshold` query param.

## Current implementation

Heuristic scorer with 6 deterministic flags:
1. `UNUSUAL_VOLUME_24H` — provider submitted > 200 claims in 24h
2. `CHARGE_OUTLIER` — claim is > 10× provider's 30-day average
3. `DISTANCE_ANOMALY` — provider > 500 miles from patient
4. `PATIENT_OVERUTILIZATION` — patient has > 50 claims in 30 days
5. `OFF_HOURS_SUBMISSION` — submitted between 22:00 and 05:00 local
6. `DUPLICATE_LINES` — many lines with identical service code

`scorer.score()` signature is **stable** — when you have training data,
swap in an Isolation Forest + XGBoost model loaded from `MODEL_PATH`
without changing the API.
