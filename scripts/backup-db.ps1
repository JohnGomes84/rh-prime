# Backup do MySQL (Hostinger) via mysqldump em PowerShell.
# Uso:   .\scripts\backup-db.ps1 [-Dest C:\backups]
# Exige: mysqldump no PATH; DATABASE_URL em .env.local ou env do shell.
#
# Agendar via Task Scheduler do Windows:
#   schtasks /Create /SC DAILY /ST 03:00 /TN "RH Prime Backup" `
#     /TR "powershell -ExecutionPolicy Bypass -File C:\rh-prime\scripts\backup-db.ps1"

param(
  [string]$Dest = ".\backups"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Dest)) {
  New-Item -ItemType Directory -Path $Dest -Force | Out-Null
}

# Carrega DATABASE_URL de .env.local se não estiver no env
$dbUrl = $env:DATABASE_URL
if (-not $dbUrl -and (Test-Path ".env.local")) {
  Get-Content ".env.local" | ForEach-Object {
    if ($_ -match "^DATABASE_URL=(.+)$") {
      $dbUrl = $Matches[1].Trim('"').Trim("'")
    }
  }
}

if (-not $dbUrl) {
  Write-Error "DATABASE_URL não definido (.env.local ou env)"
  exit 1
}

if ($dbUrl -notmatch '^mysql://([^:]+):([^@]+)@([^:/]+)(?::(\d+))?/(.+)$') {
  Write-Error "DATABASE_URL não bate com formato mysql://user:pass@host:port/db"
  exit 1
}

$dbUser = $Matches[1]
$dbPass = $Matches[2]
$dbHost = $Matches[3]
$dbPort = if ($Matches[4]) { $Matches[4] } else { "3306" }
$dbName = $Matches[5]

$stamp = Get-Date -Format "yyyy-MM-dd-HHmm"
$outFile = Join-Path $Dest "rh-prime-$stamp.sql"

Write-Host "[backup] $(Get-Date) — dump de $dbName @ ${dbHost}:${dbPort} → $outFile.gz"

& mysqldump `
  -h $dbHost `
  -P $dbPort `
  -u $dbUser `
  "-p$dbPass" `
  --single-transaction `
  --quick `
  --no-tablespaces `
  --set-gtid-purged=OFF `
  --skip-lock-tables `
  --hex-blob `
  $dbName | Out-File -FilePath $outFile -Encoding utf8

if ($LASTEXITCODE -ne 0) {
  Write-Error "mysqldump falhou (exit $LASTEXITCODE)"
  exit 1
}

# gzip via tar (Windows 10+)
& tar -czf "$outFile.gz" -C $Dest (Split-Path -Leaf $outFile) | Out-Null
Remove-Item $outFile -Force

$size = (Get-Item "$outFile.gz").Length
Write-Host "[backup] OK — $([math]::Round($size/1024,1)) KB em $outFile.gz"

# Retenção: manter últimos 30 dumps
Get-ChildItem -Path $Dest -Filter "rh-prime-*.sql.gz" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip 30 |
  Remove-Item -Force

Write-Host "[backup] Concluído."
