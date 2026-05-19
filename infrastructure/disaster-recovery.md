# MedGuard360 — Disaster Recovery Runbook

**Last updated:** 2026-05-17
**Owner:** info@geniuseye.ai

## Recovery objectives

| Tier | Component | RTO | RPO |
|------|-----------|-----|-----|
| 0 (critical) | auth-service, audit-log-service | 15 min | 0 |
| 0 (critical) | Postgres primary | 30 min | 5 min |
| 1 (high)     | claims-service, fraud-engine, crisis-service | 1 h    | 5 min |
| 1 (high)     | All other Node services | 2 h | 15 min |
| 2 (medium)   | AI engines | 4 h | n/a (stateless) |
| 2 (medium)   | Portal frontend | 4 h | n/a (stateless) |
| 3 (low)      | reporting/dashboards | 24 h | 1 h |

## Backup strategy

### Postgres
- **Streaming replication** to 2 read replicas (5432 primary, 5433/5434 replicas)
- **Continuous archiving** of WAL to MinIO `system-backups` bucket via `wal-g`
- **Daily base backup** at 02:00 UTC, retained 35 days
- **Weekly full backup** to AWS S3 (`s3://medguard360-dr/postgres/`), retained 12 months
- **Quarterly archive** to AWS S3 Glacier, retained 7 years (HIPAA)

### MinIO (PHI documents, audio, video)
- **Bucket replication** to a secondary MinIO cluster in a different region
- **Object versioning** enabled on every bucket — accidental deletes recoverable
- **WORM lock** on `audit-archive` (7 years per HIPAA 164.530(j))

### Kafka
- **Replication factor 3** on every topic (already in `infrastructure/kafka/topics.sh`)
- **`audit.event` retention: infinite** — never truncate
- Other topics: 7 days standard, 1 day for high-volume notifications

### Secrets
- Primary: HashiCorp Vault or AWS Secrets Manager
- DR copy: cross-region replication
- Quarterly: rotation drill (use a non-production secret to validate process)

## Failure scenarios

### Scenario 1 — Single Pod / Container dies
**RTO:** seconds. Kubernetes ReplicaSet replaces it. PM2 in non-k8s deployments
restarts via `exp_backoff_restart_delay`.
**Action:** none. Verify Prometheus `ServiceDown` resolved within 2 min.

### Scenario 2 — Postgres primary down
**RTO:** 30 min.
1. CloudNativePG (or your HA tool) promotes a replica.
2. PgBouncer reconnects automatically to the new primary.
3. Verify writes via `psql -h pgbouncer -c "INSERT INTO test ..."`.
4. Original primary, when recovered, rejoins as a replica.

### Scenario 3 — Kafka broker loss
**RTO:** 5 min.
- With RF=3 and `min.insync.replicas=2`, the broker loss is transparent.
- Verify no consumer lag spike via `medguard_kafka_consumergroup_lag` metric.

### Scenario 4 — Region down (full DR)
**RTO:** 4 h. **RPO:** 5 min (last WAL ship to S3).
1. **DNS failover** — change `api.medguard360.com` to point at DR region's load balancer
2. **Restore Postgres** in DR region from `s3://medguard360-dr/postgres/` (use wal-g)
3. **Restore MinIO** — replication has already mirrored objects to DR; just promote the cluster
4. **Restore Kafka** topics from S3-MM2 mirror (if MM2 was running)
5. **Start service deployments** — Helm chart in the DR cluster
6. **Bootstrap secrets** — pull from cross-region Vault
7. **Smoke test** — `tools/dr-smoke.sh` runs through the killer-demo flow
8. **Notify** state agency contacts, MCOs, providers via the standing comms plan

### Scenario 5 — Ransomware on Postgres
**RTO:** 1 h. **RPO:** 24 h (last clean daily backup).
1. **Isolate**: kubectl scale all `kind=service` deployments to 0
2. **Forensics**: snapshot encrypted disks; preserve audit_log_events (RLS append-only)
3. **Restore**: bring up Postgres from S3 daily backup
4. **Replay**: forward-replay Kafka audit topic into restored DB to recover the last 24 h
5. **Re-validate** PERM reports against restored data before resuming writes

### Scenario 6 — audit-log-service down or losing events
**Severity: CRITICAL** — HIPAA compliance violation
1. Prometheus alert `AuditLogGap` fires (PHI access rate > 1.5× audit emit rate)
2. PagerDuty pages on-call within 5 min
3. **Immediately stop** all PHI-access services (`fraud-engine`, `claims`, `patient` etc.)
   to halt new PHI exposures
4. Failover audit-log-service to a fresh pod
5. Replay `audit.event` Kafka topic from offset 0 (it's infinite-retention)
6. Write incident report — required by HIPAA breach notification rule
7. Notify Compliance Officer + state agency partners

## DR drills

Quarterly schedule:

| Quarter | Drill | Owner |
|---------|-------|-------|
| Q1 | Postgres failover (Scenario 2) | DBA |
| Q2 | Region failover dry-run (Scenario 4) | Platform |
| Q3 | Ransomware recovery from backup (Scenario 5) | Security |
| Q4 | Full RTO/RPO measurement, document deviations | All |

## Contact tree

| Role | Primary | Backup |
|------|---------|--------|
| Platform on-call | info@geniuseye.ai (PagerDuty) | n+1 rotation |
| Compliance Officer | <to assign> | <to assign> |
| State agency liaisons | per state contract | per state contract |
| Outside counsel | <to assign> | n/a |

## What's NOT covered here (still TODO)

- **CI/CD pipeline** for the DR cluster — currently manual `helm install`
- **Automated DNS failover** via Route53 health checks
- **Synthetic continuous testing** of the DR path (rather than quarterly)
- **Tabletop exercises** with state agency partners
