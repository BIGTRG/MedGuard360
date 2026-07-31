#!/usr/bin/env bash
# Regression tests for demo deploy scripts. These use temp workspaces and stubs
# so they do not require Docker, Python 3.11, PowerShell, or a live demo stack.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
failures=0
tmp_dirs=()

cleanup() {
  if [ "${#tmp_dirs[@]}" -gt 0 ]; then
    rm -rf "${tmp_dirs[@]}"
  fi
}
trap cleanup EXIT

new_workspace() {
  local tmp
  tmp="$(mktemp -d)"
  tmp_dirs+=("$tmp")
  mkdir -p "$tmp/deploy" "$tmp/infrastructure/docker" "$tmp/bin"
  printf '%s\n' "$tmp"
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    printf 'Expected output to contain: %s\nActual output:\n%s\n' "$needle" "$haystack" >&2
    return 1
  fi
}

assert_equals() {
  local expected="$1"
  local actual="$2"
  if [[ "$actual" != "$expected" ]]; then
    printf 'Expected:\n%s\nActual:\n%s\n' "$expected" "$actual" >&2
    return 1
  fi
}

run_test() {
  local name="$1"
  shift
  if "$@"; then
    printf 'ok - %s\n' "$name"
  else
    printf 'not ok - %s\n' "$name" >&2
    failures=$((failures + 1))
  fi
}

write_log_script() {
  local path="$1"
  local marker="$2"
  cat >"$path" <<SCRIPT
#!/bin/sh
printf '%s\n' '$marker' >> "\$TEST_LOG"
SCRIPT
  chmod +x "$path"
}

write_pwsh_stub() {
  local path="$1"
  cat >"$path" <<'SCRIPT'
#!/bin/sh
file=""
while [ "$#" -gt 0 ]; do
  if [ "$1" = "-File" ]; then
    shift
    file="$1"
  fi
  shift || break
done
printf 'pwsh:%s\n' "${file##*/}" >> "$TEST_LOG"
SCRIPT
  chmod +x "$path"
}

link_minimal_tooling() {
  local bin_dir="$1"
  ln -s "$(command -v dirname)" "$bin_dir/dirname"
}

test_encoding_check_rejects_utf16() {
  local tmp output status
  tmp="$(new_workspace)"
  cp "$ROOT/deploy/check-script-encoding.sh" "$tmp/deploy/check-script-encoding.sh"
  printf '\xff\xfe#\x00!\x00\n\0' >"$tmp/deploy/bad.ps1"

  set +e
  output="$(cd "$tmp" && /bin/bash deploy/check-script-encoding.sh 2>&1)"
  status=$?
  set -e

  if [ "$status" -eq 0 ]; then
    printf 'Expected UTF-16 script to fail encoding check.\nOutput:\n%s\n' "$output" >&2
    return 1
  fi
  assert_contains "$output" "UTF-16 encoding: deploy/bad.ps1"
  assert_contains "$output" "Re-save affected scripts as UTF-8"
}

test_encoding_check_accepts_utf8_scripts() {
  local tmp output
  tmp="$(new_workspace)"
  cp "$ROOT/deploy/check-script-encoding.sh" "$tmp/deploy/check-script-encoding.sh"
  printf '#!/usr/bin/env bash\nprintf ok\n' >"$tmp/deploy/good.sh"
  printf '#!/usr/bin/env bash\nprintf ok\n' >"$tmp/infrastructure/docker/init.sh"

  output="$(cd "$tmp" && /bin/bash deploy/check-script-encoding.sh 2>&1)"
  assert_contains "$output" "Script encoding check passed."
}

test_verify_demo_uses_docker_engine_tests_without_python311() {
  local tmp log expected actual
  tmp="$(new_workspace)"
  log="$tmp/verify.log"
  cp "$ROOT/deploy/verify-demo.sh" "$tmp/deploy/verify-demo.sh"
  link_minimal_tooling "$tmp/bin"
  write_log_script "$tmp/deploy/run-engine-tests-docker.sh" "engine-docker"
  write_log_script "$tmp/deploy/run-engine-tests.sh" "engine-native"
  write_log_script "$tmp/deploy/check-script-encoding.sh" "check-encoding"
  write_log_script "$tmp/deploy/demo-preflight.sh" "preflight"
  touch "$tmp/deploy/smoke-demo.ps1" "$tmp/deploy/demo-flow.ps1"
  write_pwsh_stub "$tmp/bin/pwsh"

  TEST_LOG="$log" PATH="$tmp/bin" /bin/bash "$tmp/deploy/verify-demo.sh" --engine-tests >/dev/null

  expected=$'engine-docker\ncheck-encoding\npreflight\npwsh:smoke-demo.ps1\npwsh:demo-flow.ps1'
  actual="$(<"$log")"
  assert_equals "$expected" "$actual"
}

test_verify_demo_uses_native_engine_tests_with_python311() {
  local tmp log expected actual
  tmp="$(new_workspace)"
  log="$tmp/verify.log"
  cp "$ROOT/deploy/verify-demo.sh" "$tmp/deploy/verify-demo.sh"
  link_minimal_tooling "$tmp/bin"
  write_log_script "$tmp/deploy/run-engine-tests-docker.sh" "engine-docker"
  write_log_script "$tmp/deploy/run-engine-tests.sh" "engine-native"
  write_log_script "$tmp/deploy/check-script-encoding.sh" "check-encoding"
  write_log_script "$tmp/deploy/demo-preflight.sh" "preflight"
  touch "$tmp/deploy/smoke-demo.ps1" "$tmp/deploy/demo-flow.ps1"
  write_pwsh_stub "$tmp/bin/pwsh"
  cat >"$tmp/bin/python3.11" <<'SCRIPT'
#!/bin/sh
exit 0
SCRIPT
  chmod +x "$tmp/bin/python3.11"

  TEST_LOG="$log" PATH="$tmp/bin" /bin/bash "$tmp/deploy/verify-demo.sh" --engine-tests >/dev/null

  expected=$'engine-native\ncheck-encoding\npreflight\npwsh:smoke-demo.ps1\npwsh:demo-flow.ps1'
  actual="$(<"$log")"
  assert_equals "$expected" "$actual"
}

test_run_engine_tests_falls_back_to_docker_without_python311() {
  local tmp log actual
  tmp="$(new_workspace)"
  log="$tmp/engine.log"
  cp "$ROOT/deploy/run-engine-tests.sh" "$tmp/deploy/run-engine-tests.sh"
  link_minimal_tooling "$tmp/bin"
  write_log_script "$tmp/deploy/run-engine-tests-docker.sh" "engine-docker"

  TEST_LOG="$log" PATH="$tmp/bin" /bin/bash "$tmp/deploy/run-engine-tests.sh" >/dev/null

  actual="$(<"$log")"
  assert_equals "engine-docker" "$actual"
}

test_laptop_meeting_forwards_full_flag() {
  local tmp log actual
  tmp="$(new_workspace)"
  log="$tmp/laptop.log"
  cp "$ROOT/deploy/laptop.sh" "$tmp/deploy/laptop.sh"
  cat >"$tmp/deploy/meeting-day.sh" <<'SCRIPT'
#!/bin/sh
printf 'meeting:%s\n' "$*" >> "$TEST_LOG"
SCRIPT
  chmod +x "$tmp/deploy/meeting-day.sh"

  TEST_LOG="$log" /bin/bash "$tmp/deploy/laptop.sh" --meeting --full >/dev/null

  actual="$(<"$log")"
  assert_equals "meeting:--full" "$actual"
}

test_laptop_complete_invokes_completion_gate() {
  local tmp log actual
  tmp="$(new_workspace)"
  log="$tmp/laptop.log"
  cp "$ROOT/deploy/laptop.sh" "$tmp/deploy/laptop.sh"
  write_log_script "$tmp/deploy/complete-demo.sh" "complete"

  TEST_LOG="$log" /bin/bash "$tmp/deploy/laptop.sh" --complete >/dev/null

  actual="$(<"$log")"
  assert_equals "complete" "$actual"
}

run_test "encoding check rejects UTF-16 deploy scripts" test_encoding_check_rejects_utf16
run_test "encoding check accepts UTF-8 deploy scripts" test_encoding_check_accepts_utf8_scripts
run_test "verify-demo uses Docker engine tests when Python 3.11 is absent" test_verify_demo_uses_docker_engine_tests_without_python311
run_test "verify-demo uses native engine tests when Python 3.11 is present" test_verify_demo_uses_native_engine_tests_with_python311
run_test "run-engine-tests falls back to Docker when Python 3.11 is absent" test_run_engine_tests_falls_back_to_docker_without_python311
run_test "laptop meeting mode forwards --full" test_laptop_meeting_forwards_full_flag
run_test "laptop complete mode invokes completion gate" test_laptop_complete_invokes_completion_gate

if [ "$failures" -ne 0 ]; then
  printf '%s deploy script test(s) failed.\n' "$failures" >&2
  exit 1
fi

printf 'All deploy script tests passed.\n'
