#!/usr/bin/env bash
# Deterministic regression tests for demo orchestration scripts.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP_DIRS=()
failures=0

cleanup() {
  if [ "${#TMP_DIRS[@]}" -gt 0 ]; then
    rm -rf "${TMP_DIRS[@]}"
  fi
}
trap cleanup EXIT

new_workspace() {
  local tmp
  tmp="$(mktemp -d)"
  TMP_DIRS+=("$tmp")
  mkdir -p "$tmp/deploy" "$tmp/infrastructure/docker" "$tmp/bin"
  printf '%s\n' "$tmp"
}

copy_script() {
  local tmp="$1"
  local script="$2"
  cp "$ROOT_DIR/deploy/$script" "$tmp/deploy/$script"
  chmod +x "$tmp/deploy/$script"
}

write_executable() {
  local path="$1"
  shift
  {
    printf '%s\n' '#!/usr/bin/bash'
    printf '%s\n' 'set -euo pipefail'
    printf '%s\n' "$@"
  } > "$path"
  chmod +x "$path"
}

write_trace_script() {
  local path="$1"
  local marker="$2"
  write_executable "$path" \
    "printf '%s\n' '$marker' >> \"\$TRACE_FILE\""
}

write_minimal_path() {
  local bin="$1"
  write_executable "$bin/dirname" \
    'case "$1" in' \
    '  */*) printf "%s\n" "${1%/*}" ;;' \
    '  *) printf "%s\n" "." ;;' \
    'esac'
  write_executable "$bin/pwsh" \
    'printf "pwsh:%s\n" "$*" >> "$TRACE_FILE"'
}

assert_equals() {
  local expected="$1"
  local actual="$2"
  local label="$3"
  if [[ "$actual" != "$expected" ]]; then
    printf 'Unexpected %s.\nExpected:\n%s\nActual:\n%s\n' "$label" "$expected" "$actual" >&2
    return 1
  fi
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"
  if [[ "$haystack" != *"$needle"* ]]; then
    printf '%s did not contain expected text: %s\nActual:\n%s\n' "$label" "$needle" "$haystack" >&2
    return 1
  fi
}

assert_file_not_utf16() {
  local path="$1"
  local hex
  hex="$(head -c 4 "$path" | od -An -t x1 | tr -d ' \n')"
  if [[ "$hex" == fffe* ]] || [[ "$hex" == 2300* ]] || [[ "$hex" == efbbbf2300* ]]; then
    printf 'Expected UTF-8-compatible text file, got UTF-16 marker in %s\n' "$path" >&2
    return 1
  fi
}

run_test() {
  local name="$1"
  if "$name"; then
    printf 'ok - %s\n' "$name"
  else
    printf 'not ok - %s\n' "$name" >&2
    failures=$((failures + 1))
  fi
}

test_complete_demo_requests_ci_parity_verify() {
  local tmp output actual
  tmp="$(new_workspace)"
  copy_script "$tmp" "complete-demo.sh"
  write_executable "$tmp/deploy/verify-demo.sh" \
    'printf "%s\n" "$@" > "$(cd "$(dirname "$0")" && pwd)/verify.args"'

  output="$(cd "$tmp" && ./deploy/complete-demo.sh)"
  actual="$(< "$tmp/deploy/verify.args")"

  assert_equals $'--unit-tests\n--engine-tests' "$actual" "complete-demo verify arguments"
  assert_contains "$output" "DEMO COMPLETE - NC DHHS laptop demo ready." "complete-demo output"
}

test_laptop_complete_delegates_before_docker_checks() {
  local tmp trace actual
  tmp="$(new_workspace)"
  trace="$tmp/trace"
  : > "$trace"
  copy_script "$tmp" "laptop.sh"
  write_trace_script "$tmp/deploy/complete-demo.sh" "complete"

  TRACE_FILE="$trace" /usr/bin/bash "$tmp/deploy/laptop.sh" --complete >/dev/null
  actual="$(< "$trace")"

  assert_equals "complete" "$actual" "laptop --complete trace"
}

test_laptop_meeting_forwards_full_flag() {
  local tmp trace actual
  tmp="$(new_workspace)"
  trace="$tmp/trace"
  : > "$trace"
  copy_script "$tmp" "laptop.sh"
  write_executable "$tmp/deploy/meeting-day.sh" \
    'printf "cwd:%s\n" "$PWD" >> "$TRACE_FILE"' \
    'printf "args:%s\n" "$*" >> "$TRACE_FILE"'

  TRACE_FILE="$trace" /usr/bin/bash "$tmp/deploy/laptop.sh" --meeting --full >/dev/null
  actual="$(< "$trace")"

  assert_equals "cwd:$tmp"$'\nargs:--full' "$actual" "laptop --meeting --full trace"
}

test_meeting_day_fast_runs_encoding_then_preflight() {
  local tmp trace actual
  tmp="$(new_workspace)"
  trace="$tmp/trace"
  : > "$trace"
  copy_script "$tmp" "meeting-day.sh"
  write_trace_script "$tmp/deploy/check-script-encoding.sh" "encoding"
  write_trace_script "$tmp/deploy/demo-preflight.sh" "preflight"
  write_executable "$tmp/deploy/verify-demo.sh" \
    'printf "%s\n" "unexpected-verify" >> "$TRACE_FILE"' \
    'exit 31'

  TRACE_FILE="$trace" /usr/bin/bash "$tmp/deploy/meeting-day.sh" >/dev/null
  actual="$(< "$trace")"

  assert_equals $'encoding\npreflight' "$actual" "meeting-day fast trace"
}

test_meeting_day_full_runs_encoding_then_verify() {
  local tmp trace actual
  tmp="$(new_workspace)"
  trace="$tmp/trace"
  : > "$trace"
  copy_script "$tmp" "meeting-day.sh"
  write_trace_script "$tmp/deploy/check-script-encoding.sh" "encoding"
  write_executable "$tmp/deploy/demo-preflight.sh" \
    'printf "%s\n" "unexpected-preflight" >> "$TRACE_FILE"' \
    'exit 32'
  write_trace_script "$tmp/deploy/verify-demo.sh" "verify"

  TRACE_FILE="$trace" /usr/bin/bash "$tmp/deploy/meeting-day.sh" --full >/dev/null
  actual="$(< "$trace")"

  assert_equals $'encoding\nverify' "$actual" "meeting-day --full trace"
}

write_verify_stubs() {
  local tmp="$1"
  write_trace_script "$tmp/deploy/run-service-tests.sh" "service-tests"
  write_trace_script "$tmp/deploy/run-engine-tests.sh" "engine-native"
  write_trace_script "$tmp/deploy/run-engine-tests-docker.sh" "engine-docker"
  write_trace_script "$tmp/deploy/check-script-encoding.sh" "encoding"
  write_trace_script "$tmp/deploy/demo-preflight.sh" "preflight"
}

test_verify_demo_uses_native_engine_tests_when_python311_exists() {
  local tmp trace actual
  tmp="$(new_workspace)"
  trace="$tmp/trace"
  : > "$trace"
  copy_script "$tmp" "verify-demo.sh"
  write_verify_stubs "$tmp"
  write_minimal_path "$tmp/bin"
  write_executable "$tmp/bin/python3.11" 'exit 0'

  PATH="$tmp/bin" TRACE_FILE="$trace" /usr/bin/bash "$tmp/deploy/verify-demo.sh" --unit-tests --engine-tests >/dev/null
  actual="$(< "$trace")"

  assert_equals "service-tests"$'\nengine-native\nencoding\npreflight\npwsh:-ExecutionPolicy Bypass -File '"$tmp/deploy/smoke-demo.ps1"$'\npwsh:-ExecutionPolicy Bypass -File '"$tmp/deploy/demo-flow.ps1" "$actual" "verify-demo native trace"
}

test_verify_demo_uses_docker_engine_tests_without_python311() {
  local tmp trace actual
  tmp="$(new_workspace)"
  trace="$tmp/trace"
  : > "$trace"
  copy_script "$tmp" "verify-demo.sh"
  write_verify_stubs "$tmp"
  write_minimal_path "$tmp/bin"

  PATH="$tmp/bin" TRACE_FILE="$trace" /usr/bin/bash "$tmp/deploy/verify-demo.sh" --engine-tests >/dev/null
  actual="$(< "$trace")"

  assert_equals "engine-docker"$'\nencoding\npreflight\npwsh:-ExecutionPolicy Bypass -File '"$tmp/deploy/smoke-demo.ps1"$'\npwsh:-ExecutionPolicy Bypass -File '"$tmp/deploy/demo-flow.ps1" "$actual" "verify-demo Docker fallback trace"
}

test_encoding_check_rejects_utf16_scripts() {
  local tmp output status
  tmp="$(new_workspace)"
  copy_script "$tmp" "check-script-encoding.sh"
  printf '\xff\xfe#\x00!\x00\n\0' > "$tmp/deploy/bad.ps1"

  set +e
  output="$(cd "$tmp" && /usr/bin/bash deploy/check-script-encoding.sh 2>&1)"
  status=$?
  set -e

  if [ "$status" -eq 0 ]; then
    printf 'Expected UTF-16 script to fail encoding check.\nOutput:\n%s\n' "$output" >&2
    return 1
  fi
  assert_contains "$output" "UTF-16 encoding: deploy/bad.ps1" "encoding check output"
  assert_contains "$output" "Re-save affected scripts as UTF-8" "encoding check remediation"
}

test_sql_migration_encoding_contract_is_preserved() {
  local migration
  migration="$ROOT_DIR/infrastructure/postgres/migrations/0030_fix_claims_provider_rls.sql"

  assert_contains "$(< "$ROOT_DIR/.gitattributes")" "*.sql text eol=lf" "gitattributes SQL rule"
  assert_file_not_utf16 "$ROOT_DIR/.gitattributes"
  assert_file_not_utf16 "$migration"
  assert_contains "$(< "$migration")" "billing_provider_id IN (SELECT id FROM providers WHERE user_id = app_current_user_id())" "claims provider RLS migration"
}

run_test test_complete_demo_requests_ci_parity_verify
run_test test_laptop_complete_delegates_before_docker_checks
run_test test_laptop_meeting_forwards_full_flag
run_test test_meeting_day_fast_runs_encoding_then_preflight
run_test test_meeting_day_full_runs_encoding_then_verify
run_test test_verify_demo_uses_native_engine_tests_when_python311_exists
run_test test_verify_demo_uses_docker_engine_tests_without_python311
run_test test_encoding_check_rejects_utf16_scripts
run_test test_sql_migration_encoding_contract_is_preserved

if [ "$failures" -ne 0 ]; then
  printf '%s demo script contract test(s) failed.\n' "$failures" >&2
  exit 1
fi

printf 'Demo script contract tests passed.\n'
