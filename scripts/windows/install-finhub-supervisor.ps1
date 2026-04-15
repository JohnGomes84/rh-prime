$ErrorActionPreference = "Stop"

$taskName = "FinhubSupervisor"
$workspace = "C:\Finhub"
$launcher = Join-Path $workspace "scripts\windows\run-finhub-supervisor.ps1"

if (-not (Test-Path $launcher)) {
  throw "Launcher script not found: $launcher"
}

$action = New-ScheduledTaskAction `
  -Execute "C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$launcher`""

$trigger = New-ScheduledTaskTrigger -AtStartup

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -StartWhenAvailable

$principal = New-ScheduledTaskPrincipal `
  -UserId "SYSTEM" `
  -RunLevel Highest `
  -LogonType ServiceAccount

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Force | Out-Null

Start-ScheduledTask -TaskName $taskName

Write-Host "Scheduled Task '$taskName' installed and started."
