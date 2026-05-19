# fraud-engine-service

Pre-payment fraud scoring orchestrator. Port **3009**. Owns `fraud_scores`,
`fraud_cases`.

## What it does

1. Subscribes to Kafka topic `claim.submitted`
2. For each claim: builds a feature vector (provider/patient history,
   charges, line counts, timing) from Postgres
3. Calls `fraud-detection` AI engine with state-specific threshold
4. Writes `fraud_scores` row (idempotent — ON CONFLICT updates)
5. Updates the parent `claims` row with the score + recommendation
6. If not `auto_pay`: opens a `fraud_cases` row, emits `fraud.flag.raised`
7. Always emits `fraud.score.computed` for downstream consumers

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET    | `/api/v1/fraud/cases`             | investigator/compliance/state | List open cases, score-sorted |
| POST   | `/api/v1/fraud/cases/:id/resolve` | investigator/compliance | Resolve case (confirmed_fraud / cleared / closed) |
| POST   | `/api/v1/fraud/override`          | investigator/compliance | Log override → AI engine for retraining |

## Events emitted

- `fraud.score.computed` — every claim
- `fraud.flag.raised` — when recommendation is route_to_review or auto_block

## AI fallback

If `fraud-detection` is unreachable:
- Never auto-pay (per AI governance)
- Score = 50, recommendation = `route_to_review`
- Flag raised with code `AI_ENGINE_UNAVAILABLE`
- Case opened for human triage

## The end-to-end demo flow now works

1. Provider hits `claims-service POST /claims` then `POST /claims/:id/submit`
2. claims-service emits `claim.submitted` to Kafka
3. fraud-engine-service consumes → calls fraud-detection → writes score
4. Claim's `status` flips to `fraud_review` if not auto-pay
5. Fraud investigator hits `GET /api/v1/fraud/cases` to see the queue
6. Every step is `auditLog()`'d → audit-log-service consumer persists
