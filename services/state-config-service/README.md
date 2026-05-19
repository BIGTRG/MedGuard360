# state-config-service

Per-state rules engine. Port **3018**. Read-heavy; Redis cache in front.

## What it owns

- `state_configs` — one row per state, defines PA windows, fraud thresholds, hub phone, etc.
- `mco_registry` — Medicaid Managed Care Organizations per state
- `pa_rules` — `(state, payer, service_code) → pa_required + criteria_doc_id`
- `pa_criteria_documents` — full coverage criteria text; embedded by pa-nlp-matcher

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/state-config/states` | List all active states |
| GET | `/api/v1/state-config/states/:state` | One state's config |
| GET | `/api/v1/state-config/states/:state/mcos` | MCOs in that state |
| GET | `/api/v1/state-config/pa-rule?state=&payer=&code=` | **Hottest endpoint** — PA lookup |
| GET | `/api/v1/state-config/criteria/:id` | Full criteria document text |

## Caching

5-minute Redis TTL on every read. Writes (admin only, not yet implemented) MUST
call `invalidate('state-config:state:<code>')` after persisting.
