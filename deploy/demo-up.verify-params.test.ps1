# Regression test for demo-up.ps1 verifier parameter forwarding.
param()
$ErrorActionPreference = "Stop"

function Assert-Equal {
  param(
    [object]$Actual,
    [object]$Expected,
    [string]$Message
  )

  if ($Actual -ne $Expected) {
    throw "$Message Expected '$Expected', got '$Actual'."
  }
}

function Invoke-DemoUpVerifyOnly {
  param(
    [string[]]$Arguments
  )

  $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString("N"))
  $deployDir = Join-Path $tempRoot "deploy"
  New-Item -ItemType Directory -Path $deployDir | Out-Null

  try {
    Copy-Item -Path (Join-Path $PSScriptRoot "demo-up.ps1") -Destination (Join-Path $deployDir "demo-up.ps1")

    @'
param(
  [switch]$UnitTests,
  [switch]$EngineTests
)
$result = [pscustomobject]@{
  UnitTests = $UnitTests.IsPresent
  EngineTests = $EngineTests.IsPresent
  ExtraArgumentCount = $args.Count
}
$result | ConvertTo-Json | Set-Content -Path (Join-Path $PSScriptRoot "verify-call.json") -Encoding UTF8
exit 0
'@ | Set-Content -Path (Join-Path $deployDir "verify-demo.ps1") -Encoding UTF8

    $powerShellPath = (Get-Process -Id $PID).Path
    & $powerShellPath -NoProfile -ExecutionPolicy Bypass -File (Join-Path $deployDir "demo-up.ps1") @Arguments | Out-Null
    Assert-Equal -Actual $LASTEXITCODE -Expected 0 -Message "demo-up.ps1 exited unsuccessfully."

    $callPath = Join-Path $deployDir "verify-call.json"
    if (-not (Test-Path $callPath)) {
      throw "verify-demo.ps1 was not called."
    }

    return Get-Content -Raw -Path $callPath | ConvertFrom-Json
  } finally {
    Remove-Item -Recurse -Force -Path $tempRoot -ErrorAction SilentlyContinue
  }
}

$noTestFlags = Invoke-DemoUpVerifyOnly -Arguments @("-VerifyOnly", "-SkipBuild")
Assert-Equal -Actual $noTestFlags.UnitTests -Expected $false -Message "UnitTests should not be forwarded when unset."
Assert-Equal -Actual $noTestFlags.EngineTests -Expected $false -Message "EngineTests should not be forwarded when unset."
Assert-Equal -Actual $noTestFlags.ExtraArgumentCount -Expected 0 -Message "Unsupported demo-up switches should not reach verify-demo.ps1."

$withTestFlags = Invoke-DemoUpVerifyOnly -Arguments @("-VerifyOnly", "-SkipBuild", "-UnitTests", "-EngineTests")
Assert-Equal -Actual $withTestFlags.UnitTests -Expected $true -Message "UnitTests should be forwarded when set."
Assert-Equal -Actual $withTestFlags.EngineTests -Expected $true -Message "EngineTests should be forwarded when set."
Assert-Equal -Actual $withTestFlags.ExtraArgumentCount -Expected 0 -Message "Only verifier switches should reach verify-demo.ps1."

Write-Host "demo-up verifier parameter tests passed."
