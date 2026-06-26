# MedGuard360 - full demo completion gate (CI parity + live stack verify).
# Run before NC DHHS meetings or after major changes. Expect ~20-25 minutes.
$ErrorActionPreference = "Stop"
& "$PSScriptRoot\verify-demo.ps1" -UnitTests -EngineTests
if (-not $?) { exit 1 }
Write-Host ""
Write-Host "DEMO COMPLETE - NC DHHS laptop demo ready." -ForegroundColor Green
Write-Host "Portal: http://localhost/  Password: demo-Password!1" -ForegroundColor DarkGray
Write-Host "Walkthrough: sales\NC-DHHS-DEMO-SCRIPT.md" -ForegroundColor DarkGray
exit 0