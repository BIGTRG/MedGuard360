#!/usr/bin/env bash
# Guard the final claims_read policy definitions against provider/user ID drift.
set -euo pipefail

cd "$(dirname "$0")/.."

bad=0

require_pattern() {
  local file="$1"
  local pattern="$2"
  local label="$3"

  if ! grep -Fq "$pattern" "$file"; then
    echo "$file: missing $label"
    bad=1
  fi
}

reject_pattern() {
  local file="$1"
  local pattern="$2"
  local label="$3"

  if grep -Fq "$pattern" "$file"; then
    echo "$file: stale $label"
    bad=1
  fi
}

for file in \
  infrastructure/postgres/migrations/0030_fix_claims_provider_rls.sql \
  infrastructure/postgres/migrations/0035_patient_claims_read.sql \
  deploy/seed-demo.sql; do
  require_pattern "$file" \
    "billing_provider_id IN (SELECT id FROM providers WHERE user_id = app_current_user_id())" \
    "billing provider profile mapping"
  require_pattern "$file" \
    "rendering_provider_id IN (SELECT id FROM providers WHERE user_id = app_current_user_id())" \
    "rendering provider profile mapping"
  reject_pattern "$file" \
    "OR billing_provider_id = app_current_user_id()" \
    "billing provider direct user-id comparison"
  reject_pattern "$file" \
    "OR rendering_provider_id = app_current_user_id()" \
    "rendering provider direct user-id comparison"
done

if [[ "$bad" -ne 0 ]]; then
  echo "Claims RLS policy check failed."
  exit 1
fi

echo "Claims RLS policy check passed."
