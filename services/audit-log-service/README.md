# audit-log-service

Append-only HIPAA audit log. Port **3019**. Owns `audit_log_events`.

## Two roles in one process

1. **Kafka consumer** — subscribes to `audit.event`, persists every event to
   `audit_log_events`. Idempotent (PK collisions are ignored as duplicate).
2. **Read API** — `/api/v1/audit/search` for compliance officers and auditors.

## Tamper-evidence

- `audit_log_events` has triggers blocking `UPDATE` and `DELETE`
  (see migration `0001_base_schema.sql`).
- 7-year WORM lock on the `audit-archive` MinIO bucket for the cold copy.
- Prometheus alert `AuditLogGap` fires if `medguard_phi_access_total` rate
  is more than 1.5× the `audit.event` emit rate — i.e. somebody touched PHI
  without producing an audit event.

## RLS scoping

Read policy in `audit_log_events` enforces:
- `federal_cms` and `platform_administrator` see everything
- `compliance_officer`, `qa_auditor`, `fraud_investigator` see only events
  whose `actor_state_code` matches their own (or null = cross-state events)

## Search endpoint

`GET /api/v1/audit/search?actorUserId=&resource=&resourceId=&correlationId=&from=&to=&limit=`

All filters optional. Default limit 200, max 1000.
