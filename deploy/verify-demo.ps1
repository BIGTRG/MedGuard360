# MedGuard360 - full demo verification (preflight + smoke + demo-flow).
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
  $useDocker = $true
  try {
    & py -3.11 -c "import sys" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $useDocker = $false }
  } catch { }
  if ($useDocker) {
    Write-Host "Python 3.11 not found - running engine tests via Docker..." -ForegroundColor DarkGray
    & "$PSScriptRoot\run-engine-tests-docker.ps1"
  } else {
    & "$PSScriptRoot\run-engine-tests.ps1"
  }
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
& "$PSScriptRoot\demo-preflight.ps1"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& "$PSScriptRoot\smoke-demo.ps1"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& "$PSScriptRoot\demo-flow.ps1"
exit $LASTEXITCODE