#!/usr/bin/env bash
# MedGuard360 - pytest for demo AI engines inside Python 3.11 Docker (matches CI).
set -euo pipefail
cd "$(dirname "$0")/.."
root="$(pwd)"

mapfile -t engines < <(grep -v '^\s*#' deploy/ci-demo-engines.txt | grep -v '^\s*$')
if [ "${#engines[@]}" -ne 4 ]; then
  echo "Expected 4 engines in ci-demo-engines.txt, found ${#engines[@]}"
  exit 1
fi

echo "MedGuard360 demo AI engine tests via Docker (Python 3.11, ${#engines[@]} engines)"
failures=()
for engine in "${engines[@]}"; do
  echo "  $engine"
  docker run --rm \
    -v "${root}:/w" \
    -w "/w/ai-engines/${engine}" \
    -e SKIP_WARMUP=1 \
    python:3.11-slim \
    bash -lc "pip install -q -r requirements.txt && pytest -q" \
    || failures+=("$engine")
done

if [ "${#failures[@]}" -eq 0 ]; then
  echo "All ${#engines[@]} demo engine test suites passed."
  exit 0
fi

echo "${#failures[@]} engine test suite(s) failed:"
printf '  - %s\n' "${failures[@]}"
exit 1