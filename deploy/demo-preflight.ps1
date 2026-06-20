# MedGuard360 — quick pre-meeting checks (does not rebuild or reseed).
$ErrorActionPreference = "Continue"
$env:Path += ";C:\Program Files\Docker\Docker\resources\bin"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "MedGuard360 demo preflight" -ForegroundColor Cyan
Write-Host "Tag: v1.0-demo @ $(git rev-parse --short HEAD 2>$null)" -ForegroundColor DarkGray

$failures = New-Object System.Collections.Generic.List[string]
function Test-Ok($name, $cond) {
  if ($cond) { Write-Host "[OK] $name" -ForegroundColor Green }
  else { Write-Host "[FAIL] $name" -ForegroundColor Red; $script:failures.Add($name) | Out-Null }
}

Test-Ok "docker available" ([bool](Get-Command docker -ErrorAction SilentlyContinue))
$running = @(docker compose -f docker-compose.demo.yml ps --services --filter "status=running" 2>$null)
Test-Ok "demo stack running" ($running.Count -ge 5)
Test-Ok "postgres healthy" ($running -contains "postgres")
Test-Ok "nginx running" ($running -contains "nginx")
Test-Ok "portals running" ($running -contains "portals")

try {
  $r = Invoke-WebRequest -Uri "http://localhost/" -UseBasicParsing -TimeoutSec 10
  Test-Ok "portal HTTP 200" ($r.StatusCode -eq 200)
} catch { Test-Ok "portal HTTP 200" $false }

try {
  $login = Invoke-RestMethod -Uri "http://localhost/api/v1/auth/login" -Method POST `
    -Body (@{ email = "admin@demo.medguard360.com"; password = "demo-Password!1" } | ConvertTo-Json) `
    -ContentType "application/json" -TimeoutSec 10
  Test-Ok "auth login" ([bool]$login.accessToken)
} catch { Test-Ok "auth login" $false }

Write-Host ""
if ($failures.Count -eq 0) {
  Write-Host "Preflight passed — run deploy\smoke-demo.ps1 for full checks." -ForegroundColor Green
  exit 0
}
Write-Host "$($failures.Count) preflight failure(s). Run: deploy\demo-up.ps1" -ForegroundColor Yellow
exit 1