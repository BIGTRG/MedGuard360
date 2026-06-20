# MedGuard360 — run the same Node service unit tests as GitHub Actions CI.
param(
  [switch]$SkipSharedBuild
)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$listPath = Join-Path $PSScriptRoot "ci-node-services.txt"
$services = Get-Content $listPath | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') }
if ($services.Count -ne 20) {
  throw "Expected 20 services in ci-node-services.txt, found $($services.Count)"
}

Write-Host "MedGuard360 Node service unit tests ($($services.Count) services)" -ForegroundColor Cyan

if (-not $SkipSharedBuild) {
  Write-Host "Building packages/shared..." -ForegroundColor DarkGray
  Push-Location packages/shared
  npm run build *> $null
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
  Pop-Location
}

$env:JWT_SECRET = "test-secret-min-32-chars-1234567890ab"
$failures = New-Object System.Collections.Generic.List[string]

foreach ($svc in $services) {
  Write-Host "  $svc" -ForegroundColor DarkGray
  Push-Location "services\$svc"
  cmd /c "npm test >nul 2>&1"
  if ($LASTEXITCODE -ne 0) { $failures.Add($svc) | Out-Null }
  Pop-Location
}

Write-Host ""
if ($failures.Count -eq 0) {
  Write-Host "All $($services.Count) service test suites passed." -ForegroundColor Green
  exit 0
}

Write-Host "$($failures.Count) service test suite(s) failed:" -ForegroundColor Red
$failures | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
exit 1