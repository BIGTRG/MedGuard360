# provider-monitor

Continuous provider credentialing + billing monitoring. Port **8008**.
Runs nightly batch over all active providers; surfaces findings sorted
by severity.

## Endpoint

`POST /v1/monitor` with an array of `ProviderSnapshot` → returns a list of
findings (severity `info` | `warn` | `critical`).

## What it flags

**Credentialing drift**
- `LICENSE_EXPIRED` / `LICENSE_EXPIRING_NOW` (< 14d) / `LICENSE_EXPIRING_SOON` (< 60d)
- Same for DEA and malpractice insurance
- `PSV_STALE` — PSV checks > 90 days old

**Billing anomalies**
- `BILLING_VOLUME_SPIKE` — 30d claims ≥ 3× provider's monthly average
- `CHARGE_SPIKE` — 30d avg claim charge ≥ 2.5× baseline
- `PATIENT_DIVERSITY_DROP` — distinct patients dropped sharply while volume held
  (potential duplicate-billing pattern)

## Operational pattern

reporting-service (or a cron job) calls this nightly with snapshots assembled
from `providers`, `credentials`, `psv_checks`, and aggregated `claims`. Each
finding emits a `notification.email.requested` event so the credentialing
specialist queue stays current.
