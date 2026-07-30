# Pre-sandbox NCTracks checklist — runs stub E2E and prints live-mode env requirements.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "`n=== NCTracks stub E2E ===" -ForegroundColor Cyan
Push-Location "integrations/nctracks"
npx jest src/e2e-stub.test.ts --forceExit
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

Write-Host "`n=== Live-mode env checklist ===" -ForegroundColor Cyan
$required = @(
  "NCTRACKS_MODE=live",
  "NCTRACKS_TPID",
  "NCTRACKS_SUBMITTER_ID",
  "NCTRACKS_RECEIVER_ID",
  "NCTRACKS_REALTIME_ELIGIBILITY_URL",
  "NCTRACKS_REALTIME_CLAIMSTATUS_URL",
  "NCTRACKS_CLIENT_CERT",
  "NCTRACKS_CLIENT_KEY",
  "NCTRACKS_BATCH_SFTP_HOST",
  "NCTRACKS_BATCH_SFTP_USER",
  "NCTRACKS_SFTP_PRIVATE_KEY"
)
foreach ($key in $required) {
  if ($key -match "=") {
    Write-Host "  [ ] $key" -ForegroundColor Yellow
  } elseif ($env:$key) {
    Write-Host "  [x] $key" -ForegroundColor Green
  } else {
    Write-Host "  [ ] $key (unset)" -ForegroundColor DarkYellow
  }
}

Write-Host "`nOptional pollers:" -ForegroundColor Cyan
Write-Host "  NCTRACKS_POLL_INTERVAL_MS=300000"
Write-Host "  NCTRACKS_X12_ARCHIVE_INTERVAL_MS=86400000"
Write-Host "`nStub E2E green. Forward TPA to NCMMIS_EDI_Support@gdit.com for sandbox creds.`n" -ForegroundColor Green