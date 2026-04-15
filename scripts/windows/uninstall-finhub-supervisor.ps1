$ErrorActionPreference = "Stop"

$taskName = "FinhubSupervisor"

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host "Scheduled Task '$taskName' removed."
} else {
  Write-Host "Scheduled Task '$taskName' not found."
}
