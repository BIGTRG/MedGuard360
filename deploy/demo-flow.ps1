# MedGuard360 - NC DHHS demo flow API checks (all script stops)
$ErrorActionPreference = "Continue"
$env:Path += ";C:\Program Files\Docker\Docker\resources\bin"
Set-Location (Join-Path $PSScriptRoot "..")
$api = "http://localhost/api/v1"
$portal = "http://localhost"
$pass = "demo-Password!1"
$failures = New-Object System.Collections.Generic.List[string]

function Test-Ok($name, $cond, $detail = "") {
  if ($cond) { Write-Host "[OK] $name" -ForegroundColor Green }
  else { Write-Host "[FAIL] $name $detail" -ForegroundColor Red; $script:failures.Add($name) | Out-Null }
}

function Get-Token($email) {
  $login = Invoke-RestMethod -Uri "$api/auth/login" -Method POST -Body (@{ email = $email; password = $pass } | ConvertTo-Json) -ContentType "application/json"
  return $login.accessToken
}

function Test-PortalPage($path) {
  try {
    $r = Invoke-WebRequest -Uri "$portal$path" -UseBasicParsing -TimeoutSec 15
    return $r.StatusCode -eq 200
  } catch { return $false }
}

Write-Host "`n=== Stop 1-2: Platform admin ===" -ForegroundColor Cyan
$h = @{ Authorization = "Bearer $(Get-Token 'admin@demo.medguard360.com')" }
try {
  $nc = Invoke-RestMethod -Uri "$api/state-config/NC" -Headers $h
  Test-Ok "NC state config" ($null -ne $nc.state_code)
  $plans = Invoke-RestMethod -Uri "$api/state-config/plans" -Headers $h
  Test-Ok "pilot state plans" ($plans.states.Count -ge 1)
  Test-Ok "portal /admin" (Test-PortalPage "/admin")
  Test-Ok "portal /admin/pilot-states" (Test-PortalPage "/admin/pilot-states")
  Test-Ok "portal /admin/integrations" (Test-PortalPage "/admin/integrations")
  Test-Ok "portal /admin/nc-enterprise" (Test-PortalPage "/admin/nc-enterprise")
  Test-Ok "portal /admin/users" (Test-PortalPage "/admin/users")
} catch { Test-Ok "admin flow" $false $_.Exception.Message }

Write-Host "`n=== Stop 3: Fraud investigator ===" -ForegroundColor Cyan
$h = @{ Authorization = "Bearer $(Get-Token 'fraud@demo.medguard360.com')" }
try {
  $cases = Invoke-RestMethod -Uri "$api/fraud/cases?limit=5" -Headers $h
  Test-Ok "fraud queue has cases" ($cases.cases.Count -ge 1)
  Test-Ok "fraud case has score field" ($null -ne $cases.cases[0].score)
  $one = Invoke-RestMethod -Uri "$api/fraud/cases/$($cases.cases[0].id)" -Headers $h
  Test-Ok "fraud case detail" ($one.score -ge 0)
  Test-Ok "fraud detail has risk_score" ($null -ne $one.risk_score)
  $high = $cases.cases | Where-Object { $_.score -ge 80 } | Select-Object -First 1
  if ($high) {
    $ev = Invoke-RestMethod -Uri "$api/fraud/cases/$($high.id)/events" -Headers $h
    Test-Ok "fraud case timeline events" ($ev.events.Count -ge 1)
    Test-Ok "portal fraud case detail" (Test-PortalPage "/fraud/cases/$($high.id)")
    $note = Invoke-RestMethod -Uri "$api/fraud/cases/$($high.id)/events" -Method POST -Headers $h -Body (@{ eventType = 'note'; text = 'Demo-flow verification note.' } | ConvertTo-Json) -ContentType "application/json"
    Test-Ok "fraud investigator note" ($null -ne $note.id)
    $esc = Invoke-RestMethod -Uri "$api/fraud/cases/$($high.id)/escalate" -Method POST -Headers $h -Body (@{ target = 'OCPI'; notes = 'Demo-flow: escalate to NC DHHS OCPI for program integrity review.' } | ConvertTo-Json) -ContentType "application/json"
    Test-Ok "fraud escalate to OCPI" ($esc.escalation_target -eq 'OCPI' -or $esc.escalationTarget -eq 'OCPI')
  }
  Test-Ok "portal /fraud" (Test-PortalPage "/fraud")
} catch { Test-Ok "fraud flow" $false $_.Exception.Message }

Write-Host "`n=== Stop 4: PA specialist ===" -ForegroundColor Cyan
$h = @{ Authorization = "Bearer $(Get-Token 'pa@demo.medguard360.com')" }
try {
  $queue = Invoke-RestMethod -Uri "$api/prior-auth/pa-requests/queue" -Headers $h
  Test-Ok "PA queue has items" ($queue.count -ge 1)
  $paId = $queue.requests[0].id
  $detail = Invoke-RestMethod -Uri "$api/prior-auth/pa-requests/$paId" -Headers $h
  $criteria = if ($detail.criteriaEvaluations) { $detail.criteriaEvaluations } else { $detail.criteria }
  Test-Ok "PA detail has criteria" ($criteria.Count -ge 3)
  if ($criteria.Count -ge 1 -and $criteria[0].id) {
    $ov = Invoke-RestMethod -Uri "$api/prior-auth/pa-requests/$paId/criteria/$($criteria[0].id)/override" -Method PUT -Headers $h -Body (@{ outcome = 'met' } | ConvertTo-Json) -ContentType "application/json"
    Test-Ok "PA criterion override" ($null -ne $ov.id)
  }
  Test-Ok "portal /pa-queue" (Test-PortalPage "/pa-queue")
  Test-Ok "portal PA evidence" (Test-PortalPage "/pa-queue/$paId/evidence")
} catch { Test-Ok "PA flow" $false $_.Exception.Message }

Write-Host "`n=== Stop 5: Provider workflow ===" -ForegroundColor Cyan
$h = @{ Authorization = "Bearer $(Get-Token 'provider@demo.medguard360.com')" }
try {
  $claims = Invoke-RestMethod -Uri "$api/claims?limit=10" -Headers $h
  Test-Ok "provider sees own claims" ($claims.count -ge 1)
  if ($claims.claims.Count -ge 1) {
    $claimId = $claims.claims[0].id
    $claim = Invoke-RestMethod -Uri "$api/claims/$claimId" -Headers $h
    Test-Ok "provider claim detail" ($null -ne $claim.claim.id)
    Test-Ok "provider claim has lines" ($claim.lines.Count -ge 1)
    Test-Ok "portal provider claim detail" (Test-PortalPage "/provider/claims/$claimId")
  }
  $patients = Invoke-RestMethod -Uri "$api/patients?limit=5" -Headers $h
  Test-Ok "provider sees patients" ($patients.count -ge 1)
  Test-Ok "portal /provider/workflow" (Test-PortalPage "/provider/workflow")
  Test-Ok "portal /provider/claims" (Test-PortalPage "/provider/claims")
} catch { Test-Ok "provider flow" $false $_.Exception.Message }

Write-Host "`n=== Stop 6: Patient portal ===" -ForegroundColor Cyan
$h = @{ Authorization = "Bearer $(Get-Token 'patient@demo.medguard360.com')" }
try {
  $me = Invoke-RestMethod -Uri "$api/patients/me" -Headers $h
  Test-Ok "patient /me profile" ($null -ne $me.first_name)
  $cov = Invoke-RestMethod -Uri "$api/patients/me/coverages" -Headers $h
  Test-Ok "patient coverages" ($cov.coverages.Count -ge 1)
  $crisis = Invoke-RestMethod -Uri "$api/patients/me/crisis-plan" -Headers $h
  Test-Ok "patient crisis plan" ($crisis.warning_signs.Count -ge 1)
  $memberClaims = Invoke-RestMethod -Uri "$api/patients/me/claims" -Headers $h
  Test-Ok "patient claims" ($memberClaims.count -ge 1)
  $appts = Invoke-RestMethod -Uri "$api/patients/me/appointments" -Headers $h
  Test-Ok "patient appointments" ($appts.count -ge 1)
  Test-Ok "portal /patient" (Test-PortalPage "/patient")
} catch { Test-Ok "patient flow" $false $_.Exception.Message }

Write-Host "`n=== Stop 7: Compliance + denials ===" -ForegroundColor Cyan
$h = @{ Authorization = "Bearer $(Get-Token 'compliance@demo.medguard360.com')" }
try {
  $audit = Invoke-RestMethod -Uri "$api/audit/search?limit=5" -Headers $h
  Test-Ok "audit search has events" ($audit.count -ge 5)
  Test-Ok "portal /compliance" (Test-PortalPage "/compliance")
  Test-Ok "portal /audit" (Test-PortalPage "/audit")
  Test-Ok "portal /admin/integrations" (Test-PortalPage "/admin/integrations")
} catch { Test-Ok "compliance flow" $false $_.Exception.Message }

Write-Host "`n=== State dashboard ===" -ForegroundColor Cyan
$h = @{ Authorization = "Bearer $(Get-Token 'state@demo.medguard360.com')" }
try {
  $nc = Invoke-RestMethod -Uri "$api/state-config/NC" -Headers $h
  Test-Ok "state NC config" ($nc.state_code -eq 'NC')
  Test-Ok "portal /state" (Test-PortalPage "/state")
} catch { Test-Ok "state flow" $false $_.Exception.Message }

$h = @{ Authorization = "Bearer $(Get-Token 'denial@demo.medguard360.com')" }
try {
  $denials = Invoke-RestMethod -Uri "$api/denials?limit=5" -Headers $h
  Test-Ok "denials list" ($denials.denials.Count -ge 1)
  if ($denials.denials.Count -ge 1) {
    $denId = $denials.denials[0].id
    $den = Invoke-RestMethod -Uri "$api/denials/$denId" -Headers $h
    Test-Ok "denial detail" ($null -ne $den.id)
    Test-Ok "denial AI appeal draft" ($den.appeals.Count -ge 1)
    Test-Ok "denial appeal has subject" ($den.appeals[0].subject.Length -gt 5)
    Test-Ok "portal denial detail" (Test-PortalPage "/denials/$denId")
  }
  Test-Ok "portal /denials" (Test-PortalPage "/denials")
} catch { Test-Ok "denial flow" $false $_.Exception.Message }

Write-Host "`n=== Reporting rollups ===" -ForegroundColor Cyan
$h = @{ Authorization = "Bearer $(Get-Token 'admin@demo.medguard360.com')" }
try {
  $rollups = Invoke-RestMethod -Uri "$api/reporting/reports/rollups?stateCode=NC&metric=claims_submitted&fromDay=2026-05-15&toDay=2026-06-15" -Headers $h
  Test-Ok "reporting rollups" ($rollups.rollups.Count -ge 1)
  Test-Ok "portal /reporting" (Test-PortalPage "/reporting")
  Test-Ok "portal quick PA evidence" (Test-PortalPage "/pa-queue/40000000-0000-0000-0000-000000000001/evidence")
  Test-Ok "portal quick fraud case" (Test-PortalPage "/fraud/cases/60000000-0000-0000-0000-000000000002")
  Test-Ok "portal /fraud/cases index" (Test-PortalPage "/fraud/cases")
  Test-Ok "portal /state/claims" (Test-PortalPage "/state/claims")
  $runBody = @{ stateCode = 'NC'; kind = 'claims_volume'; from = (Get-Date).AddDays(-30).ToUniversalTime().ToString('o'); to = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json
  try {
    $run = Invoke-RestMethod -Uri "$api/reporting/reports/run" -Method POST -Headers $h -Body $runBody -ContentType "application/json"
    Test-Ok "reporting run claims_volume" ($null -ne $run.jobId)
  } catch { Test-Ok "reporting run claims_volume" $false $_.Exception.Message }
  try {
    $dec = Invoke-RestMethod -Uri "$api/prior-auth/pa-requests/decided" -Headers $h
    Test-Ok "PA decided endpoint" ($dec.count -ge 0)
  } catch { Test-Ok "PA decided endpoint" $false }
} catch { Test-Ok "reporting flow" $false $_.Exception.Message }

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
if ($failures.Count -eq 0) { Write-Host "All demo flow checks passed." -ForegroundColor Green; exit 0 }
Write-Host "$($failures.Count) failure(s)" -ForegroundColor Red; exit 1
