#!/usr/bin/env bash
# Guard the final claims_read policy against comparing provider-profile IDs to user IDs.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FILES=(
  "$ROOT_DIR/infrastructure/postgres/migrations/0035_patient_claims_read.sql"
  "$ROOT_DIR/deploy/seed-demo.sql"
)

for file in "${FILES[@]}"; do
  if ! rg -q "billing_provider_id IN \(SELECT id FROM providers WHERE user_id = app_current_user_id\(\)\)" "$file"; then
    echo "Missing provider-profile billing_provider_id RLS lookup in $file" >&2
    exit 1
  fi

  if ! rg -q "rendering_provider_id IN \(SELECT id FROM providers WHERE user_id = app_current_user_id\(\)\)" "$file"; then
    echo "Missing provider-profile rendering_provider_id RLS lookup in $file" >&2
    exit 1
  fi

  if rg -q "OR (billing_provider_id|rendering_provider_id) = app_current_user_id\(\)" "$file"; then
    echo "Found direct provider-id-to-user-id claims RLS comparison in $file" >&2
    exit 1
  fi
done

echo "claims RLS policy check passed."
