param(
  [string]$BackupRoot = 'portable-backup'
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message"
}

function Test-DockerVolume([string]$Name) {
  $volumes = docker volume ls --format '{{.Name}}'
  return $volumes -contains $Name
}

function Export-DockerVolume([string]$Name, [string]$TargetPath) {
  if (-not (Test-DockerVolume $Name)) {
    Write-Host "   - volume $Name not found, skipping"
    return
  }

  $fileName = Split-Path $TargetPath -Leaf
  docker run --rm `
    -v "${Name}:/volume" `
    -v "$(Split-Path $TargetPath -Parent):/backup" `
    alpine sh -lc "cd /volume && tar -czf /backup/$fileName ."

  if ($LASTEXITCODE -ne 0) {
    throw "Failed to export volume $Name"
  }
}

function Invoke-DockerComposeQuiet([string[]]$Arguments) {
  $process = Start-Process -FilePath 'docker' -ArgumentList $Arguments -NoNewWindow -PassThru -Wait `
    -RedirectStandardOutput ([System.IO.Path]::GetTempFileName()) `
    -RedirectStandardError ([System.IO.Path]::GetTempFileName())

  if ($process.ExitCode -ne 0) {
    throw "docker $($Arguments -join ' ') failed with exit code $($process.ExitCode)"
  }
}

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$composeFile = Join-Path $root 'docker-compose.dockerized.yml'
$backupRootPath = Join-Path $root $BackupRoot
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$sessionPath = Join-Path $backupRootPath $stamp
$filesPath = Join-Path $sessionPath 'files'
$volumesPath = Join-Path $sessionPath 'volumes'

New-Item -ItemType Directory -Force -Path $filesPath, $volumesPath | Out-Null

Write-Step "Saving project files"

$fileCopies = @(
  @{ Source = Join-Path $root 'backend\zaptalk.db'; Target = Join-Path $filesPath 'backend-zaptalk.db' },
  @{ Source = Join-Path $root 'backend\.env'; Target = Join-Path $filesPath 'backend.env' },
  @{ Source = Join-Path $root '.env'; Target = Join-Path $filesPath 'root.env' }
)

foreach ($item in $fileCopies) {
  if (Test-Path $item.Source) {
    Copy-Item -LiteralPath $item.Source -Destination $item.Target -Force
  }
}

if (Test-Path $composeFile) {
  docker compose -f $composeFile config | Out-File -FilePath (Join-Path $sessionPath 'compose.config.txt') -Encoding utf8
}

$manifest = [ordered]@{
  created_at = (Get-Date).ToString('o')
  project = 'zaptalk'
  git_commit = $(git rev-parse --short HEAD 2>$null)
  compose_file = 'docker-compose.dockerized.yml'
  files = @(
    'backend/zaptalk.db',
    'backend/.env',
    '.env'
  )
  volumes = @(
    'zaptalk_evolution_instances',
    'zaptalk_evolution_store',
    'zaptalk_evolution_postgres_data',
    'zaptalk_evolution_redis_data'
  )
}

$manifest | ConvertTo-Json -Depth 6 | Out-File -FilePath (Join-Path $sessionPath 'manifest.json') -Encoding utf8

Write-Step "Pausing Docker stack"
if (Test-Path $composeFile) {
  Invoke-DockerComposeQuiet @('compose', '-f', $composeFile, 'stop')
}

Write-Step "Exporting Docker volumes"
$volumes = @(
  'zaptalk_evolution_instances',
  'zaptalk_evolution_store',
  'zaptalk_evolution_postgres_data',
  'zaptalk_evolution_redis_data'
)

foreach ($volume in $volumes) {
  $archivePath = Join-Path $volumesPath "$volume.tar.gz"
  Write-Host "   - $volume"
  Export-DockerVolume -Name $volume -TargetPath $archivePath
}

Write-Step "Restarting stack"
if (Test-Path $composeFile) {
  $existingContainers = @(docker ps -a --format '{{.Names}}')
  $preferred = @('zaptalk_evolution', 'zaptalk_backend', 'zaptalk_frontend')
  $toStart = $preferred | Where-Object { $existingContainers -contains $_ }

  if ($toStart.Count -gt 0) {
    docker start @toStart *> $null
  }

  if ($toStart.Count -eq 0) {
    Invoke-DockerComposeQuiet @('compose', '-f', $composeFile, 'up', '-d')
  }
}

Write-Host ""
Write-Host "Backup ready:"
Write-Host "  $sessionPath"
