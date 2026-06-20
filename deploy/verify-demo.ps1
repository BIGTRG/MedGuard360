# MedGuard360 — full demo verification (preflight + smoke + demo-flow).
$ErrorActionPreference = "Stop"
& "$PSScriptRoot\demo-preflight.ps1"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& "$PSScriptRoot\smoke-demo.ps1"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& "$PSScriptRoot\demo-flow.ps1"
exit $LASTEXITCODE