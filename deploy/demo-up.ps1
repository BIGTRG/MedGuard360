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
docker compose -f $compose run --rm kafka-init 2>$null | Out-Null
docker compose -f $compose up -d --force-recreate nginx

Write-Host "Waiting for Postgres..." -ForegroundColor Cyan
for ($i = 0; $i -lt 60; $i++) {
  docker compose -f $compose exec -T postgres pg_isready -U medguard -d medguard360 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 1
}

Write-Host "Seeding demo data..." -ForegroundColor Cyan
Get-Content deploy\seed-demo.sql -Raw | docker compose -f $compose exec -T postgres psql -U medguard -d medguard360 | Out-Null

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