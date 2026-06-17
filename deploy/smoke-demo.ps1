# MedGuard360 demo stack smoke tests (Windows-friendly)
$ErrorActionPreference = "Continue"
$env:Path += ";C:\Program Files\Docker\Docker\resources\bin"
Set-Location (Join-Path $PSScriptRoot "..")
$base = "http://localhost"
$api = "$base/api/v1"
$failures = New-Object System.Collections.Generic.List[string]
function Test-Ok($name, $cond, $detail = "") {
  if ($cond) { Write-Host "[OK] $name" -ForegroundColor Green }
  else { Write-Host "[FAIL] $name $detail" -ForegroundColor Red; $script:failures.Add($name) | Out-Null }
}
Write-Host "`n=== Phase 1: HTTP surfaces ===" -ForegroundColor Cyan
$portalOk = $false
try { $r = Invoke-WebRequest -Uri "$base/" -UseBasicParsing -TimeoutSec 15; $portalOk = ($r.StatusCode -eq 200) } catch { $portalOk = $false }
if (-not $portalOk) {
  Write-Host "Portal unreachable — recreating nginx..." -ForegroundColor Yellow
  docker compose -f docker-compose.demo.yml up -d --force-recreate nginx 2>$null | Out-Null
  Start-Sleep -Seconds 5
  try { $r = Invoke-WebRequest -Uri "$base/" -UseBasicParsing -TimeoutSec 15; $portalOk = ($r.StatusCode -eq 200) } catch { $portalOk = $false }
}
Test-Ok "nginx portal" $portalOk
try { $r = Invoke-WebRequest -Uri "$base/login" -UseBasicParsing -TimeoutSec 10; Test-Ok "portal /login" ($r.StatusCode -eq 200) } catch { Test-Ok "portal /login" $false }
Write-Host "`n=== Phase 2: Auth + API via nginx ===" -ForegroundColor Cyan
$loginBody = @{ email = "admin@demo.medguard360.com"; password = "demo-Password!1" } | ConvertTo-Json
$token = $null
try { $login = Invoke-RestMethod -Uri "$api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"; $token = $login.accessToken; Test-Ok "POST /auth/login" ([bool]$token) } catch { Test-Ok "POST /auth/login" $false }
if ($token) {
  $headers = @{ Authorization = "Bearer $token" }
  $amp = [char]38
  $urls = @(
    @{ n = "GET /patients"; u = "$api/patients?limit=1" }
    @{ n = "GET /prior-auth/pa-requests"; u = "$api/prior-auth/pa-requests?limit=5" }
    @{ n = "GET /claims"; u = "$api/claims?limit=5" }
    @{ n = "GET /fraud/cases"; u = "$api/fraud/cases?limit=5" }
    @{ n = "GET /state-config/NC"; u = "$api/state-config/NC" }
    @{ n = "GET /reporting/rollups"; u = "$api/reporting/reports/rollups?stateCode=NC${amp}metric=claims_submitted${amp}fromDay=2026-05-15${amp}toDay=2026-06-12" }
    @{ n = "GET /audit/search"; u = "$api/audit/search?limit=5" }
  )
  foreach ($ep in $urls) {
    try { $r = Invoke-WebRequest -Uri $ep.u -Headers $headers -UseBasicParsing; Test-Ok "$($ep.n) ($($r.StatusCode))" ($r.StatusCode -lt 300) } catch { Test-Ok $ep.n $false }
  }
  $portalPaths = @("/compliance", "/compliance/hets", "/reporting", "/fraud/cases", "/fraud/rings", "/state/claims", "/state/credentialing", "/admin/users", "/provider/pa", "/pa-queue/decided", "/provider/encounters", "/credentialing", "/dme", "/nemt", "/responder", "/pharmacy", "/pharmacy/drug-pa", "/hie", "/biometric")
  foreach ($p in $portalPaths) {
    try { $r = Invoke-WebRequest -Uri "$base$p" -UseBasicParsing -TimeoutSec 10; Test-Ok "portal $p" ($r.StatusCode -eq 200) } catch { Test-Ok "portal $p" $false }
  }
}
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
if ($failures.Count -eq 0) { Write-Host "All smoke tests passed." -ForegroundColor Green; exit 0 }
Write-Host "$($failures.Count) failure(s)" -ForegroundColor Red; exit 1
