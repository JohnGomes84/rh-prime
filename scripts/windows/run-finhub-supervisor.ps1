$ErrorActionPreference = "Stop"

$workspace = "C:\Finhub"
$logsDir = Join-Path $workspace "logs"
$combinedLog = Join-Path $logsDir "finhub-supervisor.log"
$pnpmCmd = "C:\Users\WINDOWS\AppData\Roaming\npm\pnpm.cmd"

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
Set-Location $workspace

if (-not (Test-Path $pnpmCmd)) {
  throw "pnpm executable not found: $pnpmCmd"
}

"[$([DateTime]::Now.ToString("s"))] Starting Finhub supervisor" | Out-File -FilePath $combinedLog -Append
& $pnpmCmd start *>> $combinedLog
exit $LASTEXITCODE
