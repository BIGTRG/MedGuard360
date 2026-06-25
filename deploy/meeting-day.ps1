# MedGuard360 - NC DHHS meeting-day check (fast preflight or full verify).
param(
  [switch]$Full
)
$ErrorActionPreference = "Stop"
$env:Path += ";C:\Program Files\Docker\Docker\resources\bin"

Write-Host "MedGuard360 meeting-day check" -ForegroundColor Cyan
& "$PSScriptRoot\check-script-encoding.ps1"
if (-not $?) { exit 1 }

if ($Full) {
  Write-Host "Running full verify (smoke + demo-flow)..." -ForegroundColor Cyan
  & "$PSScriptRoot\verify-demo.ps1"
} else {
  & "$PSScriptRoot\demo-preflight.ps1"
}
if (-not $?) { exit 1 }
exit 0