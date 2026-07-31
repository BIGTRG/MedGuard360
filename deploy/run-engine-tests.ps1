# MedGuard360 - pytest for demo-critical AI engines (matches GitHub CI).
# Uses Python 3.11 locally when available; otherwise Docker (see run-engine-tests-docker.ps1).
$ErrorActionPreference = "Stop"
$env:Path += ";C:\Program Files\Docker\Docker\resources\bin"
Set-Location (Join-Path $PSScriptRoot "..")

$useDocker = $true
try {
  & py -3.11 -c "import sys" 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $useDocker = $false }
} catch { }

if ($useDocker) {
  Write-Host "Python 3.11 not found - using Docker..." -ForegroundColor DarkGray
  & "$PSScriptRoot\run-engine-tests-docker.ps1"
  if (-not $?) { exit 1 }
  exit 0
}

$listPath = Join-Path $PSScriptRoot "ci-demo-engines.txt"
$engines = Get-Content $listPath | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') }
if ($engines.Count -ne 5) {
  throw "Expected 5 engines in ci-demo-engines.txt, found $($engines.Count)"
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