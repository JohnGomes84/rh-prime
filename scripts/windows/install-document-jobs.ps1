$ErrorActionPreference = "Stop"

$reconcileTaskName = "FinhubDocumentReconcile"
$cleanupTaskName = "FinhubDocumentCleanup"

$workspace = "C:\Finhub"
$powershellExe = "C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe"

$reconcileScript = Join-Path $workspace "scripts\windows\run-document-reconcile.ps1"
$cleanupScript = Join-Path $workspace "scripts\windows\run-document-cleanup.ps1"

$reconcileCommand = "`"$powershellExe`" -NoProfile -ExecutionPolicy Bypass -File `"$reconcileScript`""
$cleanupCommand = "`"$powershellExe`" -NoProfile -ExecutionPolicy Bypass -File `"$cleanupScript`""

schtasks /Create /TN $reconcileTaskName /TR $reconcileCommand /SC DAILY /ST 02:00 /RU SYSTEM /RL HIGHEST /F | Out-Null
schtasks /Create /TN $cleanupTaskName /TR $cleanupCommand /SC HOURLY /MO 1 /RU SYSTEM /RL HIGHEST /F | Out-Null

Write-Host "Scheduled Tasks '$reconcileTaskName' and '$cleanupTaskName' installed."
