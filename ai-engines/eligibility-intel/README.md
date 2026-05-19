# eligibility-intel

Eligibility prediction engine. Port **8010**. Called by `eligibility-service`
as a fallback when real-time MMIS lookup is unavailable, or as a quick
pre-screen before the 270/271 round-trip.

## Endpoint

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/health`     | Liveness |
| GET    | `/metrics`    | Prometheus |
| POST   | `/v1/predict` | Predict likely eligibility + suggested program + benefit set |

## Inputs

`state_code`, `patient_age`, `household_income_annual_cents`, `pregnant`,
`disabled`, optional `medicaid_id`, `coverage_type_requested`.

## Output

```json
{
  "likely_eligible": true,
  "probability": 0.85,
  "suggested_program": "medicaid_chip | medicare_a_b | marketplace | uninsured",
  "benefits": [{"name": "Primary care visits", "covered": true}],
  "explanation": "Eligibility likelihood: 85%. Suggested program: medicaid_chip. ...",
  "requires_real_lookup": true
}
```

`requires_real_lookup` is always `true` — this is a prediction, not a
binding determination. eligibility-service still has to verify with MMIS
before claims fly.

## Implementation

Today: rules + 2026 FPL thresholds per state. Drop-in replacement for an
ML classifier later — schema unchanged.
