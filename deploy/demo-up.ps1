# MedGuard360 - one-command Windows demo bring-up (demo subset).
param(
  [switch]$SkipBuild,
  [switch]$RebuildPortals,
  [switch]$RefreshEngines,
  [switch]$Teardown,
  [switch]$VerifyOnly,
  [switch]$SkipVerify
)
$ErrorActionPreference = "Stop"
$env:Path += ";C:\Program Files\Docker\Docker\resources\bin"
Set-Location (Join-Path $PSScriptRoot "..")
$compose = "docker-compose.demo.yml"

if ($VerifyOnly) {
  & "$PSScriptRoot\verify-demo.ps1"
  exit $LASTEXITCODE
}

if ($Teardown) {
  Write-Host "Tearing down demo stack..." -ForegroundColor Yellow
  docker compose -f $compose down -v
  exit 0
}

if ($RebuildPortals) {
  Write-Host "Rebuilding portals image..." -ForegroundColor Cyan
  docker compose -f $compose build portals
} elseif ($RefreshEngines) {
  Write-Host "Rebuilding demo AI engines + dependent Node services..." -ForegroundColor Cyan
  docker compose -f $compose build denial-predictor crisis-detector denial-service crisis-service prior-auth-service
  docker compose -f $compose up -d denial-predictor crisis-detector denial-service crisis-service prior-auth-service
  Write-Host "MedGuard360 demo engines refreshed. Run deploy\demo-up.ps1 -VerifyOnly for full checks." -ForegroundColor Green
  exit 0
} elseif (-not $SkipBuild) {
  Write-Host "Building demo images..." -ForegroundColor Cyan
  docker compose -f $compose build
}

Write-Host "Starting infrastructure..." -ForegroundColor Cyan
docker compose -f $compose up -d postgres redis kafka minio
Write-Host "Waiting for Postgres..." -ForegroundColor Cyan
for ($i = 0; $i -lt 60; $i++) {
  docker compose -f $compose exec -T postgres pg_isready -U medguard -d medguard360 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 1
}

Write-Host "Running bootstrap (migrations + MinIO + seed)..." -ForegroundColor Cyan
$ErrorActionPreference = 'Continue'
docker compose -f $compose run --rm bootstrap 2>&1 | Out-Null
$ErrorActionPreference = 'Stop'

Write-Host "Applying demo patches (idempotent on older volumes)..." -ForegroundColor Cyan
& "$PSScriptRoot\apply-demo-patches.ps1" $compose

Write-Host "Starting services..." -ForegroundColor Cyan
docker compose -f $compose up -d
$ErrorActionPreference = 'Continue'
docker compose -f $compose run --rm kafka-init 2>&1 | Out-Null
$ErrorActionPreference = 'Stop'
docker compose -f $compose up -d --force-recreate nginx portals

Write-Host "Waiting for portal..." -ForegroundColor Cyan
for ($i = 0; $i -lt 45; $i++) {
  try {
    if ((Invoke-WebRequest -Uri "http://localhost/" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200) { break }
  } catch { Start-Sleep -Seconds 2 }
}

if (-not $SkipVerify) {
  & "$PSScriptRoot\verify-demo.ps1"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "MedGuard360 demo ready at http://localhost/" -ForegroundColor Green
Write-Host "Preflight: powershell -ExecutionPolicy Bypass -File deploy\demo-preflight.ps1" -ForegroundColor DarkGray
