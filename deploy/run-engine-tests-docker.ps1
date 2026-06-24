# MedGuard360 - pytest for demo AI engines inside Python 3.11 Docker (matches CI).
# Use when local Python is not 3.11 (e.g. Windows with Python 3.14 only).
$ErrorActionPreference = "Stop"
$env:Path += ";C:\Program Files\Docker\Docker\resources\bin"
Set-Location (Join-Path $PSScriptRoot "..")
$root = (Get-Location).Path

$listPath = Join-Path $PSScriptRoot "ci-demo-engines.txt"
$engines = Get-Content $listPath | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') }
if ($engines.Count -ne 4) {
  throw "Expected 4 engines in ci-demo-engines.txt, found $($engines.Count)"
}

Write-Host "MedGuard360 demo AI engine tests via Docker (Python 3.11, $($engines.Count) engines)" -ForegroundColor Cyan
$failures = New-Object System.Collections.Generic.List[string]

foreach ($engine in $engines) {
  Write-Host "  $engine" -ForegroundColor DarkGray
  docker run --rm `
    -v "${root}:/w" `
    -w "/w/ai-engines/$engine" `
    -e SKIP_WARMUP=1 `
    python:3.11-slim `
    bash -lc "pip install -q -r requirements.txt && pytest -q"
  if ($LASTEXITCODE -ne 0) { $failures.Add($engine) | Out-Null }
}

Write-Host ""
if ($failures.Count -eq 0) {
  Write-Host "All $($engines.Count) demo engine test suites passed." -ForegroundColor Green
  exit 0
}

Write-Host "$($failures.Count) engine test suite(s) failed:" -ForegroundColor Red
$failures | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
exit 1