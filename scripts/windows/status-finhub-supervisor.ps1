$ErrorActionPreference = "Stop"

$taskName = "FinhubSupervisor"
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if (-not $task) {
  Write-Host "Scheduled Task '$taskName' not found."
  exit 1
}

$info = Get-ScheduledTaskInfo -TaskName $taskName

[PSCustomObject]@{
  TaskName = $task.TaskName
  State = $task.State
  LastRunTime = $info.LastRunTime
  LastTaskResult = $info.LastTaskResult
  NextRunTime = $info.NextRunTime
} | Format-List
