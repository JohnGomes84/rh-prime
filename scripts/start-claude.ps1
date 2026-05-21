param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$claudeUserHome = Join-Path $HOME ".claude"
$env:PROJECT_ROOT = $projectRoot

if (-not $env:CLAUDE_HOME) {
    $env:CLAUDE_HOME = $claudeUserHome
}

if (-not $env:CLAUDE_CONFIG_DIR) {
    $env:CLAUDE_CONFIG_DIR = $claudeUserHome
}

Write-Host "Project root: $projectRoot"
Write-Host "CLAUDE_HOME: $env:CLAUDE_HOME"
Write-Host "CLAUDE_CONFIG_DIR: $env:CLAUDE_CONFIG_DIR"

$claudeCmd = Get-Command claude -ErrorAction Stop
Push-Location $projectRoot
try {
    & $claudeCmd.Source @Args
} finally {
    Pop-Location
}
