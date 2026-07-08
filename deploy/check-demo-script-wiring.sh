#!/usr/bin/env bash
# Guard Windows demo wrapper calls that cannot be executed in Linux CI.
set -euo pipefail

cd "$(dirname "$0")/.."

if grep -q 'verify-demo\.ps1" @PSBoundParameters' deploy/demo-up.ps1; then
  echo "demo-up.ps1 must not splat all wrapper parameters into verify-demo.ps1."
  echo "Forward only parameters supported by verify-demo.ps1."
  exit 1
fi

if ! grep -q 'function Invoke-VerifyDemo' deploy/demo-up.ps1; then
  echo "demo-up.ps1 is missing the safe verify-demo.ps1 wrapper."
  exit 1
fi

echo "Demo script wiring check passed."
