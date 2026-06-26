#!/usr/bin/env bash
# Deterministic regression tests for demo orchestration scripts.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP_ROOT="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

prepare_workspace() {
  local name="$1"
  local script="$2"
  local dir="$TMP_ROOT/$name"
  mkdir -p "$dir/deploy"
  cp "$REPO_ROOT/deploy/$script" "$dir/deploy/$script"
  chmod +x "$dir/deploy/$script"
  printf '%s\n' "$dir"
}

write_executable() {
  local path="$1"
  shift
  {
    printf '%s\n' '#!/bin/sh'
    printf '%s\n' 'set -eu'
    printf '%s\n' "$@"
  } > "$path"
  chmod +x "$path"
}

assert_trace() {
  local trace_file="$1"
  local expected="$2"
  local actual
  actual="$(<"$trace_file")"
  if [[ "$actual" != "$expected" ]]; then
    printf 'Unexpected trace in %s\n' "$trace_file" >&2
    printf 'Expected:\n%s\n' "$expected" >&2
    printf 'Actual:\n%s\n' "$actual" >&2
    exit 1
  fi
}

test_meeting_day_fast_runs_encoding_then_preflight() {
  local dir trace
  dir="$(prepare_workspace "meeting-fast" "meeting-day.sh")"
  trace="$dir/trace"
  : > "$trace"

  write_executable "$dir/deploy/check-script-encoding.sh" \
    'printf "%s\n" "encoding" >> "$TRACE_FILE"'
  write_executable "$dir/deploy/demo-preflight.sh" \
    'printf "%s\n" "preflight" >> "$TRACE_FILE"'
  write_executable "$dir/deploy/verify-demo.sh" \
    'printf "%s\n" "unexpected-verify" >> "$TRACE_FILE"' \
    'exit 31'

  TRACE_FILE="$trace" /usr/bin/bash "$dir/deploy/meeting-day.sh"

  assert_trace "$trace" $'encoding\npreflight'
}

test_meeting_day_full_runs_encoding_then_verify() {
  local dir trace
  dir="$(prepare_workspace "meeting-full" "meeting-day.sh")"
  trace="$dir/trace"
  : > "$trace"

  write_executable "$dir/deploy/check-script-encoding.sh" \
    'printf "%s\n" "encoding" >> "$TRACE_FILE"'
  write_executable "$dir/deploy/demo-preflight.sh" \
    'printf "%s\n" "unexpected-preflight" >> "$TRACE_FILE"' \
    'exit 32'
  write_executable "$dir/deploy/verify-demo.sh" \
    'printf "%s\n" "verify" >> "$TRACE_FILE"'

  TRACE_FILE="$trace" /usr/bin/bash "$dir/deploy/meeting-day.sh" --full

  assert_trace "$trace" $'encoding\nverify'
}

test_laptop_meeting_forwards_full_flag() {
  local dir trace
  dir="$(prepare_workspace "laptop-meeting" "laptop.sh")"
  trace="$dir/trace"
  : > "$trace"

  write_executable "$dir/deploy/meeting-day.sh" \
    'printf "cwd:%s\n" "$PWD" >> "$TRACE_FILE"' \
    'printf "args:%s\n" "$*" >> "$TRACE_FILE"'

  TRACE_FILE="$trace" /usr/bin/bash "$dir/deploy/laptop.sh" --meeting --full

  assert_trace "$trace" "cwd:$dir"$'\nargs:--full'
}

write_verify_demo_stubs() {
  local dir="$1"
  write_executable "$dir/deploy/check-script-encoding.sh" \
    'printf "%s\n" "encoding" >> "$TRACE_FILE"'
  write_executable "$dir/deploy/demo-preflight.sh" \
    'printf "%s\n" "preflight" >> "$TRACE_FILE"'
  write_executable "$dir/deploy/run-engine-tests.sh" \
    'printf "%s\n" "local-engine-tests" >> "$TRACE_FILE"'
  write_executable "$dir/deploy/run-engine-tests-docker.sh" \
    'printf "%s\n" "docker-engine-tests" >> "$TRACE_FILE"'
}

write_minimal_path_stubs() {
  local bin="$1"
  mkdir -p "$bin"
  write_executable "$bin/dirname" \
    'case "$1" in' \
    '  */*) printf "%s\n" "${1%/*}" ;;' \
    '  *) printf "%s\n" "." ;;' \
    'esac'
  write_executable "$bin/pwsh" \
    'printf "pwsh:%s\n" "$*" >> "$TRACE_FILE"'
}

test_verify_demo_engine_tests_use_docker_without_python311() {
  local dir bin trace
  dir="$(prepare_workspace "verify-docker-fallback" "verify-demo.sh")"
  bin="$dir/bin"
  trace="$dir/trace"
  : > "$trace"

  write_verify_demo_stubs "$dir"
  write_minimal_path_stubs "$bin"

  PATH="$bin" TRACE_FILE="$trace" /usr/bin/bash "$dir/deploy/verify-demo.sh" --engine-tests

  assert_trace "$trace" "docker-engine-tests"$'\nencoding\npreflight\npwsh:-ExecutionPolicy Bypass -File '"$dir/deploy/smoke-demo.ps1"$'\npwsh:-ExecutionPolicy Bypass -File '"$dir/deploy/demo-flow.ps1"
}

test_verify_demo_engine_tests_use_local_runner_with_python311() {
  local dir bin trace
  dir="$(prepare_workspace "verify-local-python" "verify-demo.sh")"
  bin="$dir/bin"
  trace="$dir/trace"
  : > "$trace"

  write_verify_demo_stubs "$dir"
  write_minimal_path_stubs "$bin"
  write_executable "$bin/python3.11" \
    'exit 0'

  PATH="$bin" TRACE_FILE="$trace" /usr/bin/bash "$dir/deploy/verify-demo.sh" --engine-tests

  assert_trace "$trace" "local-engine-tests"$'\nencoding\npreflight\npwsh:-ExecutionPolicy Bypass -File '"$dir/deploy/smoke-demo.ps1"$'\npwsh:-ExecutionPolicy Bypass -File '"$dir/deploy/demo-flow.ps1"
}

run_test() {
  local name="$1"
  "$name"
  printf '[OK] %s\n' "$name"
}

run_test test_meeting_day_fast_runs_encoding_then_preflight
run_test test_meeting_day_full_runs_encoding_then_verify
run_test test_laptop_meeting_forwards_full_flag
run_test test_verify_demo_engine_tests_use_docker_without_python311
run_test test_verify_demo_engine_tests_use_local_runner_with_python311

printf 'Demo script regression tests passed.\n'
