# Fail if deploy or docker init scripts were saved as UTF-16 (breaks bash/PowerShell).
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$bad = New-Object System.Collections.Generic.List[string]
$paths = @(
  (Join-Path $PWD "deploy")
  (Join-Path $PWD "infrastructure\docker")
)

foreach ($root in $paths) {
  if (-not (Test-Path $root)) { continue }
  Get-ChildItem -Path $root -Recurse -Include *.ps1,*.sh -File | ForEach-Object {
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    if ($bytes.Length -lt 2) { return }
    if ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
      $bad.Add($_.FullName) | Out-Null
      return
    }
    if ($bytes.Length -ge 2 -and $bytes[0] -eq 0x23 -and $bytes[1] -eq 0x00) {
      $bad.Add($_.FullName) | Out-Null
    }
  }
}

if ($bad.Count -gt 0) {
  Write-Host "UTF-16 encoding detected:" -ForegroundColor Red
  $bad | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
  Write-Host "Re-save as UTF-8 (see .gitattributes)." -ForegroundColor Yellow
  exit 1
}

Write-Host "Script encoding check passed." -ForegroundColor Green