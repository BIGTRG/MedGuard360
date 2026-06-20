# MedGuard360 — full demo verification (preflight + smoke + demo-flow).
param(
  [switch]$UnitTests,
  [switch]$EngineTests
)
$ErrorActionPreference = "Stop"
if ($UnitTests) {
  & "$PSScriptRoot\run-service-tests.ps1"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
if ($EngineTests) {
  & "$PSScriptRoot\run-engine-tests.ps1"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
& "$PSScriptRoot\demo-preflight.ps1"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& "$PSScriptRoot\smoke-demo.ps1"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& "$PSScriptRoot\demo-flow.ps1"
exit $LASTEXITCODE