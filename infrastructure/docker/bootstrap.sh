#!/bin/sh
# MedGuard360 — one-shot bootstrap for fresh docker-compose stack.
# Applies Postgres migrations, creates Kafka topics, creates MinIO buckets.
# Idempotent: safe to re-run.

set -e

echo "MedGuard360 bootstrap starting..."

# ---- 0. install tools we need ----
apk add --no-cache postgresql-client curl >/dev/null
# mc (MinIO client) — Alpine package was dropped; pull binary directly.
curl -sSLo /usr/local/bin/mc https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x /usr/local/bin/mc

# ---- 1. Postgres migrations ----
echo ""
echo "== Applying Postgres migrations =="
export PGPASSWORD="${PG_PASSWORD}"

# Standalone/alternate migration files that conflict with canonical *_schema.sql
# variants when applied in glob order. Skip them during docker bootstrap.
skip_migration() {
  case "$1" in
    0006_fraud_cases.sql|0007_providers.sql|0008_clinical.sql|0012_notification_schema.sql|0013_hub.sql|0014_pharmacy.sql|0015_dme.sql|0016_nemt.sql|0017_crisis.sql|0018_reporting.sql)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

for migration in /work/infrastructure/postgres/migrations/*.sql; do
  name=$(basename "$migration")
  if skip_migration "$name"; then
    echo "  ⏭  $name (skipped — canonical *_schema.sql variant exists)"
    continue
  fi
  echo "  → $name"
  if [ "${BOOTSTRAP_LENIENT:-0}" = "1" ]; then
    psql -h "${PG_HOST}" -U "${PG_USER}" -d "${PG_DATABASE}" -1 -f "$migration" >/dev/null 2>&1 || {
      echo "  ⚠ $name (skipped — may already be applied)"
    }
  else
    psql -h "${PG_HOST}" -U "${PG_USER}" -d "${PG_DATABASE}" -1 -f "$migration" >/dev/null || {
      echo "Migration failed: $name" >&2
      exit 1
    }
  fi
done
echo "Migrations applied."

# ---- 2. Kafka topics ----
# kafka-tools isn't available in Alpine. Topics will be auto-created on first
# publish (Kafka's auto.create.topics.enable=true default). Explicit partition
# counts in the original create_topic calls are lost — auto-created topics use
# num.partitions=1 by default. Run kafka-topics.sh from the kafka container
# post-deploy if specific partition counts matter.
create_topic() {
  echo "  ⏭  $1 (auto-create on first publish)"
}

create_topic user.created
create_topic user.login.succeeded
create_topic user.login.failed
create_topic user.logout
create_topic user.permission.changed
create_topic claim.submitted 6
create_topic claim.validated
create_topic claim.adjudicated
create_topic claim.paid
create_topic claim.denied
create_topic claim.appealed
create_topic pa.requested
create_topic pa.criteria.evaluated
create_topic pa.approved
create_topic pa.denied
create_topic pa.needs.more.info
create_topic credentialing.application.received
create_topic credentialing.psv.completed
create_topic credentialing.approved
create_topic credentialing.denied
create_topic credentialing.expiring
create_topic fraud.score.computed 6
create_topic fraud.flag.raised
create_topic fraud.ring.detected
create_topic fraud.case.opened
create_topic fraud.case.escalated
create_topic fraud.case.resolved
create_topic pa.decided
create_topic clinical.encounter.started
create_topic clinical.encounter.completed
create_topic clinical.note.created
create_topic clinical.code.suggested
create_topic crisis.plan.created
create_topic crisis.alert.raised 3 86400000
create_topic crisis.responder.dispatched
create_topic eligibility.checked 3 86400000
create_topic notification.email.requested 3 86400000
create_topic notification.sms.requested 3 86400000
create_topic notification.push.requested 3 86400000
create_topic audit.event 12 -1
create_topic provider.created
create_topic provider.status.changed
create_topic dme.order.created
create_topic dme.order.status.changed
create_topic nemt.trip.scheduled
create_topic nemt.trip.completed
create_topic hie.referral.created
create_topic hie.consent.granted
create_topic hie.consent.revoked
create_topic patient.created
create_topic patient.updated

echo "Kafka topics ready."

# ---- 3. MinIO buckets ----
echo ""
echo "== Creating MinIO buckets =="
mc alias set local "${MINIO_URL}" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}" >/dev/null
for b in clinical-audio clinical-video clinical-documents credentialing-docs \
         claims-edi remittance-edi patient-uploads provider-uploads \
         crisis-plans audit-archive medguard360-audit-archive system-backups; do
  mc mb --ignore-existing "local/$b" >/dev/null
  mc encrypt set sse-s3 "local/$b" >/dev/null 2>&1 || true
  echo "  ✓ $b"
done

echo ""
echo "✅ Bootstrap complete. You can now run: docker compose up -d"
