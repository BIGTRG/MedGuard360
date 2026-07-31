#!/usr/bin/env bash
# Static guard for Windows demo-up.ps1 regressions that are hard to execute on Linux CI.
set -euo pipefail

cd "$(dirname "$0")/.."

python3 - <<'PY'
from pathlib import Path

script = Path("deploy/demo-up.ps1").read_text(encoding="utf-8")

forbidden = '"$PSScriptRoot\\verify-demo.ps1" @PSBoundParameters'
if forbidden in script:
    raise SystemExit("demo-up.ps1 must not splat all parent parameters into verify-demo.ps1")

if "function Invoke-DemoVerification" not in script:
    raise SystemExit("demo-up.ps1 must centralize verify-demo.ps1 parameter forwarding")

for flag in ("UnitTests", "EngineTests"):
    if f"$verifyParams.{flag}" not in script:
        raise SystemExit(f"demo-up.ps1 must forward -{flag} to verify-demo.ps1")

for service in ("bootstrap", "kafka-init"):
    command = f"docker compose -f $compose run --rm {service}"
    start = script.find(command)
    if start == -1:
        raise SystemExit(f"demo-up.ps1 is missing {service} initialization")
    window = script[start:start + 350]
    if "$LASTEXITCODE -ne 0" not in window or "exit 1" not in window:
        raise SystemExit(f"demo-up.ps1 must fail when {service} initialization fails")

print("demo-up.ps1 regression check passed.")
PY
