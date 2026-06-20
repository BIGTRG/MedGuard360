# MedGuard360 - quick pre-meeting checks (does not rebuild or reseed).
$ErrorActionPreference = "Continue"
$env:Path += ";C:\Program Files\Docker\Docker\resources\bin"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "MedGuard360 demo preflight" -ForegroundColor Cyan
$head = git rev-parse --short HEAD 2>$null
$tag = git rev-parse --short v1.0-demo 2>$null
Write-Host "Tag: v1.0-demo @ $head" -ForegroundColor DarkGray
if ($tag -and $head -and $tag -ne $head) {
  Write-Host "[WARN] v1.0-demo tag ($tag) differs from HEAD ($head)" -ForegroundColor Yellow
}

$failures = New-Object System.Collections.Generic.List[string]
function Test-Ok($name, $cond) {
  if ($cond) { Write-Host "[OK] $name" -ForegroundColor Green }
  else { Write-Host "[FAIL] $name" -ForegroundColor Red; $script:failures.Add($name) | Out-Null }
}
function Test-Warn($name, $cond, $hint) {
  if ($cond) { Write-Host "[OK] $name" -ForegroundColor Green }
  else { Write-Host "[WARN] $name - $hint" -ForegroundColor Yellow }
}

Test-Ok "docker available" ([bool](Get-Command docker -ErrorAction SilentlyContinue))
$running = @(docker compose -f docker-compose.demo.yml ps --services --filter "status=running" 2>$null)
Test-Ok "demo stack running" ($running.Count -ge 5)
Test-Ok "postgres healthy" ($running -contains "postgres")
Test-Ok "nginx running" ($running -contains "nginx")
Test-Ok "portals running" ($running -contains "portals")
Test-Warn "denial-predictor running" ($running -contains "denial-predictor") "run deploy\demo-up.ps1 -RefreshEngines"
Test-Warn "crisis-detector running" ($running -contains "crisis-detector") "run deploy\demo-up.ps1 -RefreshEngines"
Test-Warn "crisis-service running" ($running -contains "crisis-service") "free port 3014 if a local Node dev server is bound, then redeploy"

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
  Write-Host "Preflight passed - run deploy\smoke-demo.ps1 for full checks." -ForegroundColor Green
  exit 0
}
Write-Host "$($failures.Count) preflight failure(s). Run: deploy\demo-up.ps1" -ForegroundColor Yellow
exit 1