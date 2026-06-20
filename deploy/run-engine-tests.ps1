# MedGuard360 - pytest for demo-critical AI engines (matches GitHub CI).
# Requires Python 3.11 (matches CI). On Windows use Docker or: py -3.11 deploy/run-engine-tests.ps1
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$listPath = Join-Path $PSScriptRoot "ci-demo-engines.txt"
$engines = Get-Content $listPath | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') }
if ($engines.Count -ne 4) {
  throw "Expected 4 engines in ci-demo-engines.txt, found $($engines.Count)"
}

Write-Host "MedGuard360 demo AI engine tests ($($engines.Count) engines)" -ForegroundColor Cyan
$env:SKIP_WARMUP = "1"
$failures = New-Object System.Collections.Generic.List[string]

foreach ($engine in $engines) {
  Write-Host "  $engine" -ForegroundColor DarkGray
  Push-Location "ai-engines\$engine"
  pip install -r requirements.txt -q
  if ($LASTEXITCODE -ne 0) { $failures.Add("$engine (pip)") | Out-Null; Pop-Location; continue }
  cmd /c "pytest -q >nul 2>&1"
  if ($LASTEXITCODE -ne 0) { $failures.Add($engine) | Out-Null }
  Pop-Location
}

Write-Host ""
if ($failures.Count -eq 0) {
  Write-Host "All $($engines.Count) demo engine test suites passed." -ForegroundColor Green
  exit 0
}

Write-Host "$($failures.Count) engine test suite(s) failed:" -ForegroundColor Red
$failures | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
exit 1