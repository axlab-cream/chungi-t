param(
  [string]$EnvFile = (Join-Path $PSScriptRoot "nexus.env")
)

$ErrorActionPreference = "Stop"

function Read-EnvFile {
  param([string]$Path)
  if (!(Test-Path -LiteralPath $Path)) {
    throw "환경 파일이 없습니다: $Path. deploy/nexus.env.example을 deploy/nexus.env로 복사한 뒤 값을 채워주세요."
  }

  $values = @{}
  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if (!$line -or $line.StartsWith("#")) { return }
    $parts = $line.Split("=", 2)
    if ($parts.Count -eq 2) {
      $values[$parts[0].Trim()] = $parts[1].Trim()
    }
  }
  return $values
}

function Require-Value {
  param([hashtable]$Values, [string]$Name)
  if (!$Values.ContainsKey($Name) -or [string]::IsNullOrWhiteSpace($Values[$Name])) {
    throw "$Name 값을 deploy/nexus.env에 입력해주세요."
  }
  return $Values[$Name]
}

$root = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$envValues = Read-EnvFile -Path $EnvFile

$hostName = Require-Value $envValues "NEXUS_HOST"
$userName = Require-Value $envValues "NEXUS_USER"
$appDir = Require-Value $envValues "NEXUS_APP_DIR"
$sshPort = if ($envValues["NEXUS_PORT"]) { $envValues["NEXUS_PORT"] } else { "22" }
$serviceName = if ($envValues["NEXUS_SERVICE_NAME"]) { $envValues["NEXUS_SERVICE_NAME"] } else { "umsh-video-pipeline" }
$appPort = if ($envValues["NEXUS_PORT_APP"]) { $envValues["NEXUS_PORT_APP"] } else { "4177" }
$nodeEnv = if ($envValues["NEXUS_NODE_ENV"]) { $envValues["NEXUS_NODE_ENV"] } else { "production" }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archive = Join-Path $env:TEMP "umsh-video-pipeline-$stamp.tar.gz"
$remote = "$userName@$hostName"
$remoteArchive = "/tmp/umsh-video-pipeline-$stamp.tar.gz"

Write-Output "압축 생성: $archive"
Push-Location -LiteralPath $root
try {
  tar `
    --exclude "./deploy/nexus.env" `
    --exclude "./node_modules" `
    --exclude "./.git" `
    -czf $archive .
} finally {
  Pop-Location
}

Write-Output "넥서스 폴더 준비: ${remote}:$appDir"
ssh -p $sshPort $remote "mkdir -p '$appDir'"

Write-Output "업로드: $remoteArchive"
scp -P $sshPort $archive "${remote}:$remoteArchive"

$serviceFile = @"
[Unit]
Description=UMSH Video Pipeline
After=network.target

[Service]
Type=simple
WorkingDirectory=$appDir
Environment=NODE_ENV=$nodeEnv
Environment=PORT=$appPort
ExecStart=/usr/bin/env npm start
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
"@

$encodedService = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($serviceFile))
$remoteCommand = @"
set -e
tar -xzf '$remoteArchive' -C '$appDir'
cd '$appDir'
npm install --omit=dev
mkdir -p "`$HOME/.config/systemd/user" .run logs
echo '$encodedService' | base64 -d > "`$HOME/.config/systemd/user/$serviceName.service"
if systemctl --user daemon-reload && systemctl --user enable --now $serviceName; then
  systemctl --user restart $serviceName
  systemctl --user status $serviceName --no-pager
else
  if [ -f .run/app.pid ] && kill -0 "`$(cat .run/app.pid)" 2>/dev/null; then
    kill "`$(cat .run/app.pid)"
  fi
  nohup env NODE_ENV='$nodeEnv' PORT='$appPort' npm start > logs/app.log 2>&1 &
  echo "`$!" > .run/app.pid
  sleep 2
  if ! kill -0 "`$(cat .run/app.pid)" 2>/dev/null; then
    cat logs/app.log
    exit 1
  fi
  echo "started with nohup pid=`$(cat .run/app.pid)"
fi
"@

Write-Output "서버 설치 및 실행"
ssh -p $sshPort $remote $remoteCommand

Write-Output "완료: http://$hostName`:$appPort"
