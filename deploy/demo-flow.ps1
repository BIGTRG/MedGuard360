# MedGuard360 - NC demo flow API checks
$ErrorActionPreference = "Continue"
$env:Path += ";C:\Program Files\Docker\Docker\resources\bin"
Set-Location (Join-Path $PSScriptRoot "..")
$api = "http://localhost/api/v1"
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
Write-Host "`n=== Demo flow: Fraud investigator ===" -ForegroundColor Cyan
$h = @{ Authorization = "Bearer $(Get-Token 'fraud@demo.medguard360.com')" }
try {
  $cases = Invoke-RestMethod -Uri "$api/fraud/cases?limit=5" -Headers $h
  Test-Ok "fraud queue has cases" ($cases.cases.Count -ge 1)
  Test-Ok "fraud case has score field" ($null -ne $cases.cases[0].score)
  $one = Invoke-RestMethod -Uri "$api/fraud/cases/$($cases.cases[0].id)" -Headers $h
  Test-Ok "fraud case detail" ($one.score -ge 0)
} catch { Test-Ok "fraud flow" $false $_.Exception.Message }
Write-Host "`n=== Demo flow: PA specialist ===" -ForegroundColor Cyan
$h = @{ Authorization = "Bearer $(Get-Token 'pa@demo.medguard360.com')" }
try {
  $queue = Invoke-RestMethod -Uri "$api/prior-auth/pa-requests/queue" -Headers $h
  Test-Ok "PA queue has items" ($queue.count -ge 1)
  $detail = Invoke-RestMethod -Uri "$api/prior-auth/pa-requests/$($queue.requests[0].id)" -Headers $h
  Test-Ok "PA detail has criteria" ($detail.criteria.Count -ge 1)
} catch { Test-Ok "PA flow" $false $_.Exception.Message }
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
if ($failures.Count -eq 0) { Write-Host "All demo flow checks passed." -ForegroundColor Green; exit 0 }
Write-Host "$($failures.Count) failure(s)" -ForegroundColor Red; exit 1
