# reporting-service

PERM, compliance reports, dashboards. Port **3016**.
Owns `report_jobs`, `daily_rollups`.

## Two halves

**1. On-demand reports** (`POST /reports/run`)
- `kind: 'perm'` — Payment Error Rate Measurement summary (CMS submission format)
- `kind: 'fraud_summary'` — fraud scores by recommendation + cases by status
- `kind: 'claims_volume'` — daily submitted/paid/denied series

**2. Real-time rollups**
Kafka consumer subscribes to every major business event and increments
`daily_rollups` by state + metric + day. Powers dashboards without scanning
the source tables on every page load.

## Subscribed topics

`claim.submitted`, `claim.paid`, `claim.denied`, `claim.appealed`,
`pa.requested`, `pa.approved`, `pa.denied`,
`fraud.score.computed`, `fraud.flag.raised`,
`credentialing.approved`, `credentialing.denied`,
`eligibility.checked`, `crisis.alert.raised`

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST   | `/api/v1/reports/run`                    | state agency / compliance / federal CMS | Run a report synchronously |
| GET    | `/api/v1/reports/:id`                    | RLS-scoped | Fetch a stored job |
| GET    | `/api/v1/reports/rollups?state=&metric=&fromDay=&toDay=` | dashboards | Fast time-series for a metric |
