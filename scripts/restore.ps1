param(
  [string]$BackupPath = ''
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message"
}

function Import-DockerVolume([string]$Name, [string]$ArchivePath) {
  if (-not (Test-Path $ArchivePath)) {
    Write-Host "   - archive for $Name not found, skipping"
    return
  }

  docker volume create $Name *> $null

  $archiveName = Split-Path $ArchivePath -Leaf
  docker run --rm `
    -v "${Name}:/volume" `
    -v "$(Split-Path $ArchivePath -Parent):/backup" `
    alpine sh -lc "find /volume -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true; cd /volume && tar -xzf /backup/$archiveName"

  if ($LASTEXITCODE -ne 0) {
    throw "Failed to restore volume $Name"
  }
}

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$composeFile = Join-Path $root 'docker-compose.dockerized.yml'
$portableRoot = Join-Path $root 'portable-backup'

if ([string]::IsNullOrWhiteSpace($BackupPath)) {
  $latest = Get-ChildItem -Path $portableRoot -Directory -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $latest) {
    throw "No backup folder found in $portableRoot"
  }

  $BackupPath = $latest.FullName
}

$BackupPath = (Resolve-Path $BackupPath).Path
$filesPath = Join-Path $BackupPath 'files'
$volumesPath = Join-Path $BackupPath 'volumes'

Write-Step "Stopping compose stack"
if (Test-Path $composeFile) {
  docker compose -f $composeFile down --remove-orphans *> $null
}

Write-Step "Restoring project files"
$projectFiles = @(
  @{ Source = Join-Path $filesPath 'backend-zaptalk.db'; Target = Join-Path $root 'backend\zaptalk.db' },
  @{ Source = Join-Path $filesPath 'backend.env'; Target = Join-Path $root 'backend\.env' },
  @{ Source = Join-Path $filesPath 'root.env'; Target = Join-Path $root '.env' }
)

foreach ($item in $projectFiles) {
  if (Test-Path $item.Source) {
    Copy-Item -LiteralPath $item.Source -Destination $item.Target -Force
  }
}

Write-Step "Restoring Docker volumes"
$volumes = @(
  'zaptalk_evolution_instances',
  'zaptalk_evolution_store',
  'zaptalk_evolution_postgres_data',
  'zaptalk_evolution_redis_data'
)

foreach ($volume in $volumes) {
  $archivePath = Join-Path $volumesPath "$volume.tar.gz"
  Write-Host "   - $volume"
  Import-DockerVolume -Name $volume -ArchivePath $archivePath
}

Write-Step "Starting stack"
if (Test-Path $composeFile) {
  docker compose -f $composeFile up -d --build
}

Write-Host ""
Write-Host "Restore completed from:"
Write-Host "  $BackupPath"
