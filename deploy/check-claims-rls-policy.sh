#!/usr/bin/env bash
# Guard the final claims_read policy from regressing provider-profile access.
set -euo pipefail

cd "$(dirname "$0")/.."

status=0

check_policy_file() {
  local file="$1"
  local content
  content="$(tr -d '\r' < "$file")"

  if [[ "$content" != *"OR billing_provider_id IN (SELECT id FROM providers WHERE user_id = app_current_user_id())"* ]]; then
    echo "Missing provider-profile billing RLS lookup: $file"
    status=1
  fi

  if [[ "$content" != *"OR rendering_provider_id IN (SELECT id FROM providers WHERE user_id = app_current_user_id())"* ]]; then
    echo "Missing provider-profile rendering RLS lookup: $file"
    status=1
  fi

  if [[ "$content" == *"OR billing_provider_id = app_current_user_id()"* ]]; then
    echo "Regressed direct billing provider/user comparison: $file"
    status=1
  fi

  if [[ "$content" == *"OR rendering_provider_id = app_current_user_id()"* ]]; then
    echo "Regressed direct rendering provider/user comparison: $file"
    status=1
  fi

  if [[ "$content" != *"OR (app_current_role() = 'patient' AND patient_id = app_current_user_id())"* ]]; then
    echo "Missing patient self-read RLS clause: $file"
    status=1
  fi
}

check_policy_file infrastructure/postgres/migrations/0035_patient_claims_read.sql
check_policy_file deploy/seed-demo.sql

if [[ "$status" -ne 0 ]]; then
  echo "Claims RLS policy check failed."
  exit 1
fi

echo "Claims RLS policy check passed."
