$ErrorActionPreference = "Stop"

$workspace = "C:\Finhub"
Set-Location $workspace

$nodeExe = "C:\Program Files\nodejs\node.exe"
if (-not (Test-Path $nodeExe)) {
  $nodeExe = "node"
}

& $nodeExe --import tsx ".\scripts\run-document-cleanup.mjs"
exit $LASTEXITCODE
