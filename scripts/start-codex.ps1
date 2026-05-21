param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$codexHome = Join-Path $HOME ".codex"
$env:CODEX_HOME = $codexHome
$env:PROJECT_ROOT = $projectRoot

Write-Host "Project root: $projectRoot"
Write-Host "CODEX_HOME: $env:CODEX_HOME"

$codexCmd = Get-Command codex -ErrorAction Stop
Push-Location $projectRoot
try {
    & $codexCmd.Source --cd $projectRoot @Args
} finally {
    Pop-Location
}
