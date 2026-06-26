#!/usr/bin/env bash
# MedGuard360 - full demo completion gate (CI parity + live stack verify).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "MedGuard360 demo completion gate (expect ~20-25 minutes)..."
exec "$SCRIPT_DIR/verify-demo.sh" --unit-tests --engine-tests