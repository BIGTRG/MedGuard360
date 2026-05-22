#!/usr/bin/env bash
# Creates Kafka topics by exec'ing into the apache/kafka container.
# Idempotent: --if-not-exists.
set -euo pipefail

K_CONTAINER="${KAFKA_CONTAINER:-medguard360-kafka-1}"
KT="docker exec $K_CONTAINER /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:9092"

create() {
  topic="$1"; partitions="${2:-3}"; retention_ms="${3:-604800000}"
  $KT --create --if-not-exists --topic "$topic" \
      --partitions "$partitions" --replication-factor 1 \
      --config retention.ms="$retention_ms" --config compression.type=snappy >/dev/null 2>&1 || true
  echo "  ok $topic"
}

create user.created
create user.login.succeeded
create user.login.failed
create user.logout
create user.permission.changed
create claim.submitted 6
create claim.validated
create claim.adjudicated
create claim.paid
create claim.denied
create claim.appealed
create pa.requested
create pa.criteria.evaluated
create pa.approved
create pa.denied
create pa.needs.more.info
create credentialing.application.received
create credentialing.psv.completed
create credentialing.approved
create credentialing.denied
create credentialing.expiring
create fraud.score.computed 6
create fraud.flag.raised
create fraud.ring.detected
create fraud.case.opened
create clinical.encounter.started
create clinical.encounter.completed
create clinical.note.created
create clinical.code.suggested
create crisis.plan.created
create crisis.alert.raised 3 86400000
create crisis.responder.dispatched
create eligibility.checked 3 86400000
create notification.email.requested 3 86400000
create notification.sms.requested 3 86400000
create notification.push.requested 3 86400000
create notification.sent
create audit.event 12 -1
create provider.created
create provider.status.changed
create dme.order.created
create dme.order.status.changed
create nemt.trip.scheduled
create nemt.trip.completed
create hie.referral.created
create hie.referral.updated
create hie.consent.granted
create hie.consent.revoked
create hub.call.completed
create patient.created
create patient.updated
create pa.decided
create fraud.alert.raised
create denial.appeal.submitted
echo "All topics ready."
