#!/usr/bin/env bash
# MedGuard360 — pytest for demo-critical AI engines (matches GitHub CI).
set -euo pipefail
cd "$(dirname "$0")/.."

mapfile -t engines < <(grep -v '^\s*#' deploy/ci-demo-engines.txt | grep -v '^\s*$')
if [ "${#engines[@]}" -ne 4 ]; then
  echo "Expected 4 engines in ci-demo-engines.txt, found ${#engines[@]}"
  exit 1
fi

echo "MedGuard360 demo AI engine tests (${#engines[@]} engines)"
export SKIP_WARMUP=1
failures=()
for engine in "${engines[@]}"; do
  echo "  $engine"
  pip install -r "ai-engines/$engine/requirements.txt" -q
  (cd "ai-engines/$engine" && pytest -q) || failures+=("$engine")
done

if [ "${#failures[@]}" -eq 0 ]; then
  echo "All ${#engines[@]} demo engine test suites passed."
  exit 0
fi

echo "${#failures[@]} engine test suite(s) failed:"
printf '  - %s\n' "${failures[@]}"
exit 1