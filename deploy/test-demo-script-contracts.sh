#!/usr/bin/env bash
# Regression tests for demo control-flow scripts without Docker or a live stack.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP_DIRS=()
TEST_WORKSPACE=""

cleanup() {
  for dir in "${TMP_DIRS[@]}"; do
    rm -rf "$dir"
  done
}
trap cleanup EXIT

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"
  case "$haystack" in
    *"$needle"*) ;;
    *) fail "$label did not contain expected text: $needle" ;;
  esac
}

make_workspace() {
  TEST_WORKSPACE="$(mktemp -d)"
  TMP_DIRS+=("$TEST_WORKSPACE")
  mkdir -p "$TEST_WORKSPACE/deploy"
}

test_complete_demo_runs_ci_parity_verify() {
  local tmp output expected
  make_workspace
  tmp="$TEST_WORKSPACE"
  cp "$ROOT_DIR/deploy/complete-demo.sh" "$tmp/deploy/complete-demo.sh"
  chmod +x "$tmp/deploy/complete-demo.sh"

  cat > "$tmp/deploy/verify-demo.sh" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$@" > "$(cd "$(dirname "$0")" && pwd)/verify-args.txt"
STUB
  chmod +x "$tmp/deploy/verify-demo.sh"

  output="$(cd "$tmp" && ./deploy/complete-demo.sh)"
  assert_contains "$output" "DEMO COMPLETE - NC DHHS laptop demo ready." "complete-demo output"

  expected="$tmp/expected-verify-args.txt"
  cat > "$expected" <<'EXPECTED'
--unit-tests
--engine-tests
EXPECTED
  if ! diff -u "$expected" "$tmp/deploy/verify-args.txt"; then
    fail "complete-demo.sh did not request both unit and engine tests"
  fi
}

test_verify_demo_runs_requested_tests_before_live_checks() {
  local tmp calls expected output
  make_workspace
  tmp="$TEST_WORKSPACE"
  mkdir -p "$tmp/bin"
  cp "$ROOT_DIR/deploy/verify-demo.sh" "$tmp/deploy/verify-demo.sh"
  chmod +x "$tmp/deploy/verify-demo.sh"
  calls="$tmp/calls.txt"
  : > "$calls"

  for script in run-service-tests run-engine-tests check-script-encoding demo-preflight; do
    cat > "$tmp/deploy/${script}.sh" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "${0##*/}" >> "$MEDGUARD_TEST_CALLS"
STUB
    chmod +x "$tmp/deploy/${script}.sh"
  done

  cat > "$tmp/bin/python3.11" <<'STUB'
#!/usr/bin/env bash
exit 0
STUB
  chmod +x "$tmp/bin/python3.11"

  cat > "$tmp/bin/pwsh" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
printf 'pwsh' >> "$MEDGUARD_TEST_CALLS"
for arg in "$@"; do
  printf ' %s' "$arg" >> "$MEDGUARD_TEST_CALLS"
done
printf '\n' >> "$MEDGUARD_TEST_CALLS"
STUB
  chmod +x "$tmp/bin/pwsh"

  output="$(
    cd "$tmp"
    PATH="$tmp/bin:$PATH" MEDGUARD_TEST_CALLS="$calls" ./deploy/verify-demo.sh --unit-tests --engine-tests
  )"
  [ -z "$output" ] || fail "verify-demo.sh stubs should not emit output: $output"

  expected="$tmp/expected-calls.txt"
  cat > "$expected" <<'EXPECTED'
run-service-tests.sh
run-engine-tests.sh
check-script-encoding.sh
demo-preflight.sh
pwsh -ExecutionPolicy Bypass -File ./deploy/smoke-demo.ps1
pwsh -ExecutionPolicy Bypass -File ./deploy/demo-flow.ps1
EXPECTED
  if ! diff -u "$expected" "$calls"; then
    fail "verify-demo.sh did not run CI-parity checks before live checks"
  fi
}

test_laptop_complete_delegates_without_docker() {
  local tmp output
  make_workspace
  tmp="$TEST_WORKSPACE"
  cp "$ROOT_DIR/deploy/laptop.sh" "$tmp/deploy/laptop.sh"
  chmod +x "$tmp/deploy/laptop.sh"

  cat > "$tmp/deploy/complete-demo.sh" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
echo "COMPLETE_STUB"
printf 'called\n' > "$(cd "$(dirname "$0")" && pwd)/complete-called.txt"
STUB
  chmod +x "$tmp/deploy/complete-demo.sh"

  output="$(cd "$tmp" && ./deploy/laptop.sh --complete)"
  assert_contains "$output" "COMPLETE_STUB" "laptop --complete output"
  [ -f "$tmp/deploy/complete-called.txt" ] || fail "laptop.sh --complete did not invoke complete-demo.sh"
}

test_powershell_completion_contracts() {
  local complete_ps1 demo_up_ps1
  complete_ps1="$(< "$ROOT_DIR/deploy/complete-demo.ps1")"
  demo_up_ps1="$(< "$ROOT_DIR/deploy/demo-up.ps1")"

  assert_contains "$complete_ps1" 'verify-demo.ps1" -UnitTests -EngineTests' "complete-demo.ps1"
  assert_contains "$demo_up_ps1" 'if ($Complete)' "demo-up.ps1"
  assert_contains "$demo_up_ps1" 'complete-demo.ps1' "demo-up.ps1"
}

test_complete_demo_runs_ci_parity_verify
test_verify_demo_runs_requested_tests_before_live_checks
test_laptop_complete_delegates_without_docker
test_powershell_completion_contracts

echo "Demo script contract tests passed."
