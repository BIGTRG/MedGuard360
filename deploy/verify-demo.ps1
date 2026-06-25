# MedGuard360 - full demo verification (preflight + smoke + demo-flow).
param(
  [switch]$UnitTests,
  [switch]$EngineTests
)
$ErrorActionPreference = "Stop"
$env:Path += ";C:\Program Files\Docker\Docker\resources\bin"

& "$PSScriptRoot\check-script-encoding.ps1"
if (-not $?) { exit 1 }

if ($UnitTests) {
  & "$PSScriptRoot\run-service-tests.ps1"
  if (-not $?) { exit 1 }
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
  if (-not $?) { exit 1 }
}

& "$PSScriptRoot\demo-preflight.ps1"
if (-not $?) { exit 1 }
& "$PSScriptRoot\smoke-demo.ps1"
if (-not $?) { exit 1 }
& "$PSScriptRoot\demo-flow.ps1"
if (-not $?) { exit 1 }
exit 0