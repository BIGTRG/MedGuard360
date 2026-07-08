#!/usr/bin/env bash
# Regression checks for the demo AI engine test manifest and runners.
set -euo pipefail

cd "$(dirname "$0")/.."

fail() {
  echo "[FAIL] $*" >&2
  exit 1
}

assert_equals() {
  local expected="$1"
  local actual="$2"
  local message="$3"
  [[ "$actual" == "$expected" ]] || fail "$message: expected '$expected', got '$actual'"
}

expected=(
  fraud-detection
  fraud-ring-gnn
  pa-nlp-matcher
  denial-predictor
  crisis-detector
)

mapfile -t engines < <(grep -v '^\s*#' deploy/ci-demo-engines.txt | grep -v '^\s*$')
assert_equals "${#expected[@]}" "${#engines[@]}" "ci-demo-engines.txt must cover every demo AI engine"

for i in "${!expected[@]}"; do
  engine="${expected[$i]}"
  assert_equals "$engine" "${engines[$i]}" "Unexpected engine at ci-demo-engines.txt line $((i + 1))"
  [[ -f "ai-engines/$engine/requirements.txt" ]] || fail "$engine is missing requirements.txt"
  [[ -d "ai-engines/$engine/tests" ]] || fail "$engine is missing pytest coverage"
done

if grep -q 'Expected 4 engines' deploy/run-engine-tests.sh deploy/run-engine-tests-docker.sh deploy/run-engine-tests.ps1 deploy/run-engine-tests-docker.ps1; then
  fail "demo engine runners still contain the stale four-engine guard"
fi

for script in deploy/run-engine-tests.sh deploy/run-engine-tests-docker.sh deploy/run-service-tests.sh deploy/complete-demo.sh; do
  [[ -x "$script" ]] || fail "$script must be executable because demo gate scripts invoke it directly"
done

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

create_stub() {
  local name="$1"
  local body="$2"
  {
    printf '#!/usr/bin/env bash\n'
    printf 'set -euo pipefail\n'
    printf '%s\n' "$body"
  } > "$tmpdir/$name"
  chmod +x "$tmpdir/$name"
}

create_stub python3.11 'exit 0'
create_stub pip 'printf "pip:%s\n" "$PWD" >> "$MG360_RUNNER_LOG"'
create_stub pytest 'printf "pytest:%s\n" "$PWD" >> "$MG360_RUNNER_LOG"'
create_stub docker 'printf "docker:%s\n" "$*" >> "$MG360_RUNNER_LOG"'

local_log="$tmpdir/local-runner.log"
PATH="$tmpdir:$PATH" MG360_RUNNER_LOG="$local_log" deploy/run-engine-tests.sh >"$tmpdir/local-engine-runner.out"

for engine in "${expected[@]}"; do
  grep -qx "pytest:$(pwd)/ai-engines/$engine" "$local_log" || fail "local runner did not execute pytest for $engine"
done

local_runs="$(grep -c '^pytest:' "$local_log")"
assert_equals "${#expected[@]}" "$local_runs" "local runner pytest invocation count"

docker_log="$tmpdir/docker-runner.log"
PATH="$tmpdir:$PATH" MG360_RUNNER_LOG="$docker_log" deploy/run-engine-tests-docker.sh >"$tmpdir/docker-engine-runner.out"

for engine in "${expected[@]}"; do
  grep -q -- "-w /w/ai-engines/$engine" "$docker_log" || fail "Docker runner did not target $engine"
done

docker_runs="$(grep -c '^docker:' "$docker_log")"
assert_equals "${#expected[@]}" "$docker_runs" "Docker runner invocation count"

echo "Demo engine configuration tests passed."
