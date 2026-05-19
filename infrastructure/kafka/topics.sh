#!/usr/bin/env bash
# MedGuard360 — Kafka topic bootstrap.
# Run on the broker host. Idempotent: safe to re-run.
#
# Naming: <domain>.<event> (lowercase, dot-separated)
# Partitioning is sized for early-state load. Increase as states roll out.

set -euo pipefail
BROKER="${BROKER:-localhost:9092}"
KT="kafka-topics.sh --bootstrap-server $BROKER"

create() {
  local name="$1" partitions="$2" replication="$3" retention_ms="${4:-604800000}" # 7 days default
  $KT --create --if-not-exists \
      --topic "$name" \
      --partitions "$partitions" \
      --replication-factor "$replication" \
      --config retention.ms="$retention_ms" \
      --config compression.type=snappy \
      --config min.insync.replicas=2
  echo "  ✓ $name"
}

echo "== identity =="
create user.created              6 3
create user.login.succeeded      6 3
create user.login.failed         6 3
create user.logout               6 3
create user.permission.changed   3 3

echo "== claims =="
create claim.submitted          12 3
create claim.validated          12 3
create claim.adjudicated        12 3
create claim.paid               12 3
create claim.denied             12 3
create claim.appealed            6 3

echo "== prior auth =="
create pa.requested              6 3
create pa.criteria.evaluated     6 3
create pa.approved               6 3
create pa.denied                 6 3
create pa.needs.more.info        6 3

echo "== credentialing =="
create credentialing.application.received 6 3
create credentialing.psv.completed         6 3
create credentialing.approved              6 3
create credentialing.denied                6 3
create credentialing.expiring              3 3

echo "== fraud =="
create fraud.score.computed     12 3
create fraud.flag.raised        12 3
create fraud.ring.detected       3 3
create fraud.case.opened         3 3

echo "== clinical =="
create clinical.encounter.started      6 3
create clinical.encounter.completed    6 3
create clinical.note.created           6 3
create clinical.code.suggested         6 3

echo "== crisis =="
create crisis.plan.created       3 3
create crisis.alert.raised       6 3 86400000   # 1 day
create crisis.responder.dispatched 6 3

echo "== eligibility =="
create eligibility.checked       6 3 86400000   # 1 day

echo "== notifications =="
create notification.email.requested 6 3 86400000
create notification.sms.requested   6 3 86400000
create notification.push.requested  6 3 86400000

echo "== audit (HIPAA) — never expire =="
create audit.event              24 3 -1          # infinite retention

echo "Done."
