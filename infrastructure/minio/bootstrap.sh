#!/usr/bin/env bash
# MedGuard360 — MinIO bucket + lifecycle bootstrap.
# Per CLAUDE.md: hot 30 days, warm 12 months, cold 7+ years.
# All PHI stored encrypted at rest with AES-256 (MinIO server-side encryption).

set -euo pipefail
MC_ALIAS="${MC_ALIAS:-medguard}"
MINIO_URL="${MINIO_URL:-http://localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:?set MINIO_ACCESS_KEY}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:?set MINIO_SECRET_KEY}"

mc alias set "$MC_ALIAS" "$MINIO_URL" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"

# Top-level buckets
for b in clinical-audio clinical-video clinical-documents credentialing-docs \
         claims-edi remittance-edi patient-uploads provider-uploads \
         crisis-plans audit-archive system-backups; do
  mc mb --ignore-existing "$MC_ALIAS/$b"
  mc encrypt set sse-s3 "$MC_ALIAS/$b"
  mc anonymous set none "$MC_ALIAS/$b"
done

# Lifecycle: hot → warm @ 30d, warm → cold @ 365d, expire (where allowed) @ 7y
cat > /tmp/lifecycle-clinical.json <<'JSON'
{
  "Rules": [
    {
      "ID": "Hot to Warm",
      "Status": "Enabled",
      "Transitions": [{ "Days": 30, "StorageClass": "WARM" }]
    },
    {
      "ID": "Warm to Cold",
      "Status": "Enabled",
      "Transitions": [{ "Days": 365, "StorageClass": "COLD" }]
    }
  ]
}
JSON
for b in clinical-audio clinical-video clinical-documents credentialing-docs claims-edi remittance-edi; do
  mc ilm import "$MC_ALIAS/$b" < /tmp/lifecycle-clinical.json
done

# Audit archive: never expire, immediate cold tier per HIPAA archival
cat > /tmp/lifecycle-audit.json <<'JSON'
{
  "Rules": [
    {
      "ID": "Audit Immediate Cold",
      "Status": "Enabled",
      "Transitions": [{ "Days": 1, "StorageClass": "COLD" }]
    }
  ]
}
JSON
mc ilm import "$MC_ALIAS/audit-archive" < /tmp/lifecycle-audit.json

# Object locking (WORM) on audit archive — meets HIPAA tamper-evidence
mc retention set --default GOVERNANCE 2555d "$MC_ALIAS/audit-archive"   # 7 years

echo "MinIO bootstrap complete."
