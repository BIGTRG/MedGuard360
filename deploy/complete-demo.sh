#!/usr/bin/env bash
# MedGuard360 - full demo completion gate (CI parity + live stack verify).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "MedGuard360 demo completion gate (expect ~20-25 minutes)..."
"$SCRIPT_DIR/verify-demo.sh" --unit-tests --engine-tests
echo ""
echo "DEMO COMPLETE - NC DHHS laptop demo ready."
echo "Portal: http://localhost/  Password: demo-Password!1"
echo "Walkthrough: sales/NC-DHHS-DEMO-SCRIPT.md"