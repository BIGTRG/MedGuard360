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
Write-Host "`n=== Phase 1b: AI engine health ===" -ForegroundColor Cyan
try {
  $dp = Invoke-RestMethod -Uri "http://localhost:8007/health" -TimeoutSec 5
  Test-Ok "denial-predictor /health" ($dp.status -eq "ok")
} catch { Test-Ok "denial-predictor /health" $false }
try {
  $cd = Invoke-RestMethod -Uri "http://localhost:8009/health" -TimeoutSec 5
  Test-Ok "crisis-detector /health" ($cd.status -eq "ok")
} catch { Test-Ok "crisis-detector /health" $false }
try {
  $fd = Invoke-RestMethod -Uri "http://localhost:8004/health" -TimeoutSec 5
  Test-Ok "fraud-detection /health" ($fd.status -eq "ok")
} catch { Test-Ok "fraud-detection /health" $false }
try {
  $pa = Invoke-RestMethod -Uri "http://localhost:8006/health" -TimeoutSec 5
  Test-Ok "pa-nlp-matcher /health" ($pa.status -eq "ok")
} catch { Test-Ok "pa-nlp-matcher /health" $false }
try {
  $fr = Invoke-RestMethod -Uri "http://localhost:8005/health" -TimeoutSec 5
  Test-Ok "fraud-ring-gnn /health" ($fr.status -eq "ok")
} catch { Test-Ok "fraud-ring-gnn /health" $false }
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
    @{ n = "GET /state-config/plans"; u = "$api/state-config/plans" }
    @{ n = "GET /providers/directory/export"; u = "$api/providers/directory/export?stateCode=NC${amp}limit=1" }
    @{ n = "GET /clinical-doc/ehr/chart"; u = "$api/clinical-doc/ehr/10000000-0000-0000-0000-000000000001" }
    @{ n = "GET /hie/referrals"; u = "$api/hie/referrals?limit=5" }
    @{ n = "GET /reporting/rollups"; u = "$api/reporting/reports/rollups?stateCode=NC${amp}metric=claims_submitted${amp}fromDay=2026-05-15${amp}toDay=2026-06-12" }
    @{ n = "GET /audit/search"; u = "$api/audit/search?limit=5" }
    @{ n = "GET /notifications/logs"; u = "$api/notifications/logs?limit=5" }
  )
  foreach ($ep in $urls) {
    try { $r = Invoke-WebRequest -Uri $ep.u -Headers $headers -UseBasicParsing; Test-Ok "$($ep.n) ($($r.StatusCode))" ($r.StatusCode -lt 300) } catch { Test-Ok $ep.n $false }
  }
  $portalPaths = @(
    "/admin", "/admin/pilot-states", "/admin/integrations", "/admin/nc-enterprise", "/admin/users",
    "/compliance", "/compliance/hets", "/compliance/audit-search", "/audit", "/reporting", "/billing",
    "/fraud", "/fraud/cases", "/fraud/rings", "/fraud/cases/60000000-0000-0000-0000-000000000002",
    "/pa-queue", "/pa-queue/decided", "/pa-queue/40000000-0000-0000-0000-000000000001/evidence",
    "/provider", "/provider/workflow", "/provider/pa", "/provider/claims", "/provider/encounters",
    "/provider/patients", "/provider/chart/10000000-0000-0000-0000-000000000001",
    "/credentialing", "/credentialing/workflow", "/dme", "/dme/workflow", "/nemt", "/nemt/workflow",
    "/pharmacy", "/pharmacy/drug-pa", "/pharmacy/workflow", "/hie", "/responder", "/biometric",
    "/patient", "/patient/benefits", "/patient/engagement",
    "/state", "/state/claims", "/state/credentialing", "/state/fraud", "/state/perm",
    "/state/engagement", "/state/mco-admin", "/federal-cms",
    "/school", "/school/students", "/school/services", "/school/lea-agreement", "/school/claims",
    "/denials", "/denials/workflow", "/denials/70000000-0000-0000-0000-000000000001"
  )
  foreach ($p in $portalPaths) {
    try { $r = Invoke-WebRequest -Uri "$base$p" -UseBasicParsing -TimeoutSec 10; Test-Ok "portal $p" ($r.StatusCode -eq 200) } catch { Test-Ok "portal $p" $false }
  }
}
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
if ($failures.Count -eq 0) { Write-Host "All smoke tests passed." -ForegroundColor Green; exit 0 }
Write-Host "$($failures.Count) failure(s)" -ForegroundColor Red; exit 1
