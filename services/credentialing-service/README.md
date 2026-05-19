# credentialing-service

50-state credentialing engine. Port **3003**. Target turnaround: 3–5 days.
Owns `credentialing_applications`, `credentialing_documents`, `psv_checks`,
`credentials`.

## Workflow

1. **Submit application** (`POST /credentialing/applications`) — status `received`,
   `target_decision_by` = +5 days
2. **Upload documents** (`POST /applications/:id/documents`) — each file goes
   through `ocr-engine`, gets classified + key fields extracted
3. **Run PSV** (`POST /applications/:id/run-psv`) — runs all 6 federal/state
   registry checks (NPI, PECOS, LEIE, SAM.gov, state license, DEA);
   moves to `review_pending` if all clear or `docs_pending` if flagged
4. **Decide** (`POST /applications/:id/decide`) — credentialing specialist
   approves or denies; approval issues a `credentials` row with 1-year expiry

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST   | `/api/v1/credentialing/applications`                   | Submit application |
| GET    | `/api/v1/credentialing/applications/:id`               | Full state (app + docs + PSV) |
| POST   | `/api/v1/credentialing/applications/:id/documents`     | Upload (multipart `document`) → OCR |
| POST   | `/api/v1/credentialing/applications/:id/run-psv`       | Run all 6 PSV checks |
| POST   | `/api/v1/credentialing/applications/:id/decide`        | Approve/deny + issue credential |

## Events emitted

- `credentialing.application.received`
- `credentialing.psv.completed`
- `credentialing.approved`
- `credentialing.denied`

## PSV stubs

`src/psv.ts` ships with deterministic stubs for all 6 federal/state checks so
the end-to-end workflow runs in dev. Real integrations TODO:
- NPI Registry: `https://npiregistry.cms.hhs.gov/api/`
- PECOS: CMS Enrollment API
- LEIE: download monthly file from OIG, match against
- SAM.gov: SAM.gov Entity Management API (requires SAM.gov key)
- State license boards: per-state (NC: NCMedBoard.org Public Search; SC, GA similar)
- DEA Registry: NTIS DEA Active Registrants file
