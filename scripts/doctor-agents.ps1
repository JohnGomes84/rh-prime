param(
    [switch]$VerboseChecks
)

$ErrorActionPreference = "Stop"

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "== $Title =="
}

function Show-PathStatus {
    param(
        [string]$Label,
        [string]$PathValue
    )

    if ([string]::IsNullOrWhiteSpace($PathValue)) {
        Write-Host "${Label}: <not set>"
        return
    }

    $exists = Test-Path -LiteralPath $PathValue
    $suffix = if ($exists) { "exists" } else { "missing" }
    Write-Host "${Label}: $PathValue [$suffix]"
}

function Read-CodexHomeFromConfig {
    $configPath = Join-Path $HOME ".codex\config.toml"
    if (-not (Test-Path -LiteralPath $configPath)) {
        return $null
    }

    $line = Get-Content -LiteralPath $configPath | Where-Object { $_ -match '^\s*home\s*=' } | Select-Object -First 1
    if (-not $line) {
        return $null
    }

    if ($line -match '^\s*home\s*=\s*"(.*)"\s*$') {
        return $Matches[1]
    }

    return $null
}

Write-Section "Agent Paths"

$defaultCodexHome = Join-Path $HOME ".codex"
$configuredCodexHome = Read-CodexHomeFromConfig
$effectiveCodexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } elseif ($configuredCodexHome) { $configuredCodexHome } else { $defaultCodexHome }
$claudeProjectDir = Join-Path (Get-Location) ".claude"
$userClaudeDir = Join-Path $HOME ".claude"

Show-PathStatus -Label "HOME" -PathValue $HOME
Show-PathStatus -Label "Default Codex home" -PathValue $defaultCodexHome
Show-PathStatus -Label "Configured Codex home" -PathValue $configuredCodexHome
Show-PathStatus -Label "Effective Codex home" -PathValue $effectiveCodexHome
Show-PathStatus -Label "Project Claude dir" -PathValue $claudeProjectDir
Show-PathStatus -Label "User Claude dir" -PathValue $userClaudeDir

if ($effectiveCodexHome -match "CodexSandboxOffline") {
    Write-Warning "Codex is pointing to a sandbox-only home. Use your normal user profile before running login or MCP setup."
}

Write-Section "Codex Health"

$codexCmd = Get-Command codex -ErrorAction SilentlyContinue
if (-not $codexCmd) {
    Write-Warning "codex command not found in PATH."
} else {
    Write-Host "codex executable: $($codexCmd.Source)"

    try {
        & $codexCmd.Source mcp list
    } catch {
        Write-Warning "Failed to run 'codex mcp list': $($_.Exception.Message)"
    }

    if ($VerboseChecks) {
        try {
            & $codexCmd.Source doctor
        } catch {
            Write-Warning "Failed to run 'codex doctor': $($_.Exception.Message)"
        }
    }
}

Write-Section "Project Recommendations"

Write-Host "1. Run Codex from the same Windows user profile every time."
Write-Host "2. Keep Codex auth and MCP config in the user home, not inside the repository."
Write-Host "3. Keep project-specific Claude settings under .claude/."
Write-Host "4. For Vercel MCP, use:"
Write-Host "   codex mcp add vercel --url https://mcp.vercel.com"
Write-Host "   codex mcp login vercel"
Write-Host "5. If Codex and Claude disagree about state, check the paths shown above first."
