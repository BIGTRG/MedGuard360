# MedGuard360 - one-command Windows demo bring-up (demo subset).
param([switch]$SkipBuild, [switch]$Teardown)
$ErrorActionPreference = "Stop"
$env:Path += ";C:\Program Files\Docker\Docker\resources\bin"
Set-Location (Join-Path $PSScriptRoot "..")
$compose = "docker-compose.demo.yml"

if ($Teardown) {
  Write-Host "Tearing down demo stack..." -ForegroundColor Yellow
  docker compose -f $compose down -v
  exit 0
}

if (-not $SkipBuild) {
  Write-Host "Building demo images..." -ForegroundColor Cyan
  docker compose -f $compose build
}

Write-Host "Starting stack..." -ForegroundColor Cyan
docker compose -f $compose up -d
$ErrorActionPreference = 'Continue'
docker compose -f $compose run --rm kafka-init 2>&1 | Out-Null
$ErrorActionPreference = 'Stop'
docker compose -f $compose up -d --force-recreate nginx

Write-Host "Waiting for Postgres..." -ForegroundColor Cyan
for ($i = 0; $i -lt 60; $i++) {
  docker compose -f $compose exec -T postgres pg_isready -U medguard -d medguard360 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 1
}

Write-Host "Seeding demo data..." -ForegroundColor Cyan
# Idempotent — existing laptop volumes may predate newer service migrations.
Get-Content infrastructure\postgres\migrations\0015_pharmacy_schema.sql -Raw | docker compose -f $compose exec -T postgres psql -U medguard -d medguard360 2>&1 | Out-Null
docker compose -f $compose exec -T postgres psql -U medguard -d medguard360 -c "DROP INDEX IF EXISTS formulary_lookup; CREATE INDEX IF NOT EXISTS formulary_lookup ON formulary_entries(state_code, payer_id, ndc);" 2>&1 | Out-Null
Get-Content infrastructure\postgres\migrations\0017_hie_schema.sql -Raw | docker compose -f $compose exec -T postgres psql -U medguard -d medguard360 2>&1 | Out-Null
Get-Content infrastructure\postgres\migrations\0019_hie.sql -Raw | docker compose -f $compose exec -T postgres psql -U medguard -d medguard360 2>&1 | Out-Null
Get-Content infrastructure\postgres\migrations\0025_hets_enrollment.sql -Raw | docker compose -f $compose exec -T postgres psql -U medguard -d medguard360 2>&1 | Out-Null
Get-Content infrastructure\postgres\migrations\0026_community_engagement.sql -Raw | docker compose -f $compose exec -T postgres psql -U medguard -d medguard360 2>&1 | Out-Null
docker compose -f $compose cp infrastructure/postgres/migrations/0028_ehr_core.sql postgres:/tmp/0028_ehr_core.sql 2>&1 | Out-Null
docker compose -f $compose exec -T postgres psql -U medguard -d medguard360 -f /tmp/0028_ehr_core.sql 2>&1 | Out-Null
docker compose -f $compose cp infrastructure/postgres/migrations/0029_ehr_specialty.sql postgres:/tmp/0029_ehr_specialty.sql 2>&1 | Out-Null
docker compose -f $compose exec -T postgres psql -U medguard -d medguard360 -f /tmp/0029_ehr_specialty.sql 2>&1 | Out-Null
docker compose -f $compose cp infrastructure/postgres/migrations/0036_notification_logs_schema.sql postgres:/tmp/0036_notification_logs_schema.sql 2>&1 | Out-Null
docker compose -f $compose exec -T postgres psql -U medguard -d medguard360 -f /tmp/0036_notification_logs_schema.sql 2>&1 | Out-Null
Get-Content deploy\seed-demo.sql -Raw -Encoding UTF8 | docker compose -f $compose exec -T postgres psql -U medguard -d medguard360 | Out-Null

Write-Host "Waiting for portal..." -ForegroundColor Cyan
for ($i = 0; $i -lt 45; $i++) {
  try {
    if ((Invoke-WebRequest -Uri "http://localhost/" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200) { break }
  } catch { Start-Sleep -Seconds 2 }
}

& "$PSScriptRoot\smoke-demo.ps1"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& "$PSScriptRoot\demo-flow.ps1"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "MedGuard360 demo ready at http://localhost/" -ForegroundColor Green
Write-Host "Preflight: powershell -ExecutionPolicy Bypass -File deploy\demo-preflight.ps1" -ForegroundColor DarkGray