#!/usr/bin/env bash
# MedGuard360 - full demo verification (preflight + smoke + demo-flow).
set -euo pipefail

cd "$(dirname "$0")/.."
SCRIPT_DIR="$(dirname "$0")"

run_pwsh() {
  local file="$1"
  if command -v pwsh >/dev/null 2>&1; then
    pwsh -ExecutionPolicy Bypass -File "$file"
    return $?
  fi
  if command -v powershell >/dev/null 2>&1; then
    powershell -ExecutionPolicy Bypass -File "$file"
    return $?
  fi
  echo "PowerShell (pwsh) required for smoke + demo-flow on macOS/Linux." >&2
  echo "Install: https://learn.microsoft.com/powershell/scripting/install/installing-powershell" >&2
  return 1
}

for arg in "$@"; do
  case "$arg" in
    --unit-tests)
      "$SCRIPT_DIR/run-service-tests.sh"
      ;;
    --engine-tests)
      if command -v python3.11 >/dev/null 2>&1; then
        "$SCRIPT_DIR/run-engine-tests.sh"
      else
        echo "Python 3.11 not found - running engine tests via Docker..."
        "$SCRIPT_DIR/run-engine-tests-docker.sh"
      fi
      ;;
  esac
done

"$SCRIPT_DIR/check-script-encoding.sh"
"$SCRIPT_DIR/check-claims-rls-policy.sh"
"$SCRIPT_DIR/demo-preflight.sh"
run_pwsh "$SCRIPT_DIR/smoke-demo.ps1"
run_pwsh "$SCRIPT_DIR/demo-flow.ps1"
