# claims-service

EDI 837P/I claim generation. Port **3008**. Owns `claims`, `claim_lines`.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST   | `/api/v1/claims`            | billing/provider/admin | Create a draft claim |
| GET    | `/api/v1/claims/:id`        | any with RLS access | Read claim + lines |
| POST   | `/api/v1/claims/:id/submit` | + biometric required | Generate 837P, submit, emit `claim.submitted` |

## EDI generation

`src/edi837p.ts` produces ASC X12 N 5010 `005010X222A1` 837P payloads.
Minimal but well-formed — passes basic structure validators. Production-grade
companion guide compliance per payer needs additional situational segments
(2310B rendering provider, 2320 other payer info, etc.).

## Events emitted

- `claim.submitted` — picked up by:
  - `fraud-engine-service` → calls `fraud-detection` AI engine
  - `eligibility-service` → re-checks coverage
  - `audit-log-service` → audit row

## Status lifecycle

`draft` → `validated` → `submitted` → `fraud_review` → `paid` | `denied` → (optional `appealed`)

`fraud-engine-service` flips `submitted` → `fraud_review` if AI recommends
review or auto-block. Otherwise the claim stays in `submitted` until the payer
returns 835 remittance.

## Tables owned

`claims`, `claim_lines` — migration 0005. Standard RLS scoping
(state-scoped admins + provider sees own claims + cross-state federal).
