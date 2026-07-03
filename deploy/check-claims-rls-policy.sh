#!/usr/bin/env bash
# Fail if the effective claims_read policies compare provider IDs to user IDs.
set -euo pipefail

cd "$(dirname "$0")/.."

files=(
  "infrastructure/postgres/migrations/0035_patient_claims_read.sql"
  "infrastructure/postgres/migrations/0037_fix_final_claims_read_provider_mapping.sql"
  "deploy/seed-demo.sql"
)

billing_mapping="billing_provider_id IN (SELECT id FROM providers WHERE user_id = app_current_user_id())"
rendering_mapping="rendering_provider_id IN (SELECT id FROM providers WHERE user_id = app_current_user_id())"
patient_read="OR (app_current_role() = 'patient' AND patient_id = app_current_user_id())"

bad=0
for file in "${files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing claims RLS policy file: $file"
    bad=1
    continue
  fi

  if ! grep -Fq "$billing_mapping" "$file"; then
    echo "Missing provider billing mapping in $file"
    bad=1
  fi
  if ! grep -Fq "$rendering_mapping" "$file"; then
    echo "Missing provider rendering mapping in $file"
    bad=1
  fi
  if ! grep -Fq "$patient_read" "$file"; then
    echo "Missing patient self-read policy in $file"
    bad=1
  fi

  if grep -Eq "billing_provider_id[[:space:]]*=[[:space:]]*app_current_user_id\\(\\)" "$file"; then
    echo "Stale billing provider/user comparison in $file"
    bad=1
  fi
  if grep -Eq "rendering_provider_id[[:space:]]*=[[:space:]]*app_current_user_id\\(\\)" "$file"; then
    echo "Stale rendering provider/user comparison in $file"
    bad=1
  fi
done

if [[ "$bad" -ne 0 ]]; then
  exit 1
fi

echo "Claims RLS policy check passed."
