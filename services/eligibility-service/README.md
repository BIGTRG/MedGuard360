# eligibility-service

Real-time Medicaid / Medicare / commercial eligibility (270/271). Port **3005**.
Owns `eligibility_checks`.

## Lookup waterfall

`POST /eligibility/check` runs the following in order:

1. **Cache** (24-hour TTL) — if a fresh row exists for the
   (patient, payer, state), return it (`source: cache`)
2. **MMIS 270/271** — submit 270 to the state's MMIS endpoint
   (from state-config-service), parse the 271 (`source: mmis_270_271`)
3. **AI fallback** — if MMIS is down or unconfigured, call
   `eligibility-intel /v1/predict` (`source: ai_prediction`)

The waterfall guarantees a response even when one tier is degraded.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST   | `/api/v1/eligibility/check`        | Full waterfall lookup |
| GET    | `/api/v1/eligibility/checks/:id`   | Read one |
| POST   | `/api/v1/eligibility/predict`      | AI-only quick check (no MMIS) |

## Events emitted

- `eligibility.checked` — every lookup (with `source` so reporting can
  attribute cache vs MMIS vs AI usage)

## Production wiring

`mmis.ts.simulate()` is a placeholder. To wire real MMIS:
1. Implement X12 270 builder + 271 parser
2. Load endpoint + auth creds from `state-config-service`
   (`state_configs.mmis_api_endpoint`, `state_configs.mmis_credential_vault_key`)
3. Hit endpoint with mTLS or VPN per state contract
