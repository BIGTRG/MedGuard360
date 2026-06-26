#!/usr/bin/env bash
# MedGuard360 - NC DHHS meeting-day check (fast preflight or full verify).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
full=0
for arg in "$@"; do
  case "$arg" in
    --full) full=1 ;;
  esac
done

echo "MedGuard360 meeting-day check"
"$SCRIPT_DIR/check-script-encoding.sh"
if [ "$full" -eq 1 ]; then
  "$SCRIPT_DIR/verify-demo.sh"
else
  "$SCRIPT_DIR/demo-preflight.sh"
fi
echo ""
if [ "$full" -eq 1 ]; then
  echo "MEETING READY - smoke + demo-flow green."
else
  echo "MEETING READY - preflight green (run --full for smoke + demo-flow)."
fi
echo "Portal: http://localhost/  Password: demo-Password!1"
echo "Walkthrough: sales/NC-DHHS-DEMO-SCRIPT.md"