#!/usr/bin/env bash
# MedGuard360 — run the same Node service unit tests as GitHub Actions CI.
set -euo pipefail
cd "$(dirname "$0")/.."

mapfile -t services < <(grep -v '^\s*#' deploy/ci-node-services.txt | grep -v '^\s*$')
if [ "${#services[@]}" -ne 20 ]; then
  echo "Expected 20 services in ci-node-services.txt, found ${#services[@]}"
  exit 1
fi

echo "MedGuard360 Node service unit tests (${#services[@]} services)"
if [ "${1:-}" != "--skip-shared-build" ]; then
  echo "Building packages/shared..."
  (cd packages/shared && npm run build >/dev/null)
fi

export JWT_SECRET=test-secret-min-32-chars-1234567890ab
failures=()
for svc in "${services[@]}"; do
  echo "  $svc"
  (cd "services/$svc" && npm test >/dev/null) || failures+=("$svc")
done

if [ "${#failures[@]}" -eq 0 ]; then
  echo "All ${#services[@]} service test suites passed."
  exit 0
fi

echo "${#failures[@]} service test suite(s) failed:"
printf '  - %s\n' "${failures[@]}"
exit 1