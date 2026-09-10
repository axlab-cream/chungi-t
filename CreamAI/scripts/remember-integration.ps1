<#
.SYNOPSIS
    Remember non-secret setup state for external CLI integrations.

.DESCRIPTION
    Records whether service CLIs such as Supabase, Vercel, GitHub, and Railway
    are already configured for this project. This avoids repeating login/setup
    prompts in future AIOps runs.

    Secrets are never stored. Output is masked and capped before it is written
    to integrations/state.json or logs/integrations/*.jsonl.

.EXAMPLES
    .\CreamAI\scripts\remember-integration.ps1 -Service supabase -Action ensure
    .\CreamAI\scripts\remember-integration.ps1 -Service vercel -Action check
    .\CreamAI\scripts\remember-integration.ps1 -Service github -Action mark -Notes "gh auth login completed"
    .\CreamAI\scripts\remember-integration.ps1 -Action list
#>
[CmdletBinding()]
param(
    [ValidatePattern('^(all|[a-z][a-z0-9_-]{0,31})$')]
    [string] $Service = 'all',

    [ValidateSet('ensure', 'check', 'mark', 'reset', 'list')]
    [string] $Action = 'ensure',

    [switch] $Verify,

    [string] $Notes = '',

    [string] $SetupCommand = '',

    [string] $AuthCheckCommand = '',

    [switch] $ExitProcess
)

$ErrorActionPreference = 'Stop'

function Get-CarrotcapRoot {
    $root = Split-Path -Parent $PSScriptRoot
    if ((Split-Path -Leaf $root) -ieq 'CreamAI') { return $root }
    return (Join-Path $root 'CreamAI')
}

$CarrotcapRoot = Get-CarrotcapRoot
$IntegrationsDir = Join-Path $CarrotcapRoot 'integrations'
$LogsDir = Join-Path $CarrotcapRoot 'logs\integrations'
$StatePath = Join-Path $IntegrationsDir 'state.json'

New-Item -ItemType Directory -Force -Path $IntegrationsDir, $LogsDir | Out-Null

$Known = @{
    supabase = @{
        display = 'Supabase'
        command = 'supabase'
        args = @('projects', 'list')
        setup = 'supabase login'
    }
    vercel = @{
        display = 'Vercel'
        command = 'vercel'
        args = @('whoami')
        setup = 'vercel login'
    }
    github = @{
        display = 'GitHub'
        command = 'gh'
        args = @('auth', 'status')
        setup = 'gh auth login'
    }
    railway = @{
        display = 'Railway'
        command = 'railway'
        args = @('whoami', '--json')
        setup = 'railway login'
    }
}

function ConvertTo-Hashtable {
    param($Value)
    if ($null -eq $Value) { return $null }
    if ($Value -is [System.Collections.IDictionary]) {
        $h = [ordered]@{}
        foreach ($key in $Value.Keys) { $h[$key] = ConvertTo-Hashtable $Value[$key] }
        return $h
    }
    if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
        $arr = @()
        foreach ($item in $Value) { $arr += ,(ConvertTo-Hashtable $item) }
        return $arr
    }
    if ($Value -is [pscustomobject]) {
        $h = [ordered]@{}
        foreach ($prop in $Value.PSObject.Properties) { $h[$prop.Name] = ConvertTo-Hashtable $prop.Value }
        return $h
    }
    return $Value
}

function New-State {
    return [ordered]@{
        version = 1
        updatedAt = ''
        services = [ordered]@{}
    }
}

function Read-State {
    if (-not (Test-Path -LiteralPath $StatePath)) { return (New-State) }
    try {
        $raw = Get-Content -LiteralPath $StatePath -Raw -Encoding UTF8
        if (-not $raw.Trim()) { return (New-State) }
        $state = ConvertTo-Hashtable ($raw | ConvertFrom-Json -ErrorAction Stop)
        if (-not $state.services) { $state.services = [ordered]@{} }
        return $state
    } catch {
        $backup = $StatePath + '.broken-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
        Copy-Item -LiteralPath $StatePath -Destination $backup -ErrorAction SilentlyContinue
        return (New-State)
    }
}

function Write-State {
    param([hashtable] $State)
    $State.updatedAt = (Get-Date).ToUniversalTime().ToString('o')
    ($State | ConvertTo-Json -Depth 8) | Set-Content -LiteralPath $StatePath -Encoding UTF8
}

function Mask-SecretText {
    param([string] $Value)
    if ($null -eq $Value) { return '' }
    $s = [string]$Value
    $s = [regex]::Replace($s, '(?i)(authorization\s*[:=]\s*bearer\s+)[A-Za-z0-9._~+/=-]+', '$1[REDACTED]')
    $s = [regex]::Replace($s, "(?i)\b(api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|passwd|pwd|secret|token)\b\s*[:=]\s*[""']?[^""',\s;]+", '$1=[REDACTED]')
    $s = [regex]::Replace($s, '\b(sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9_]{16,}|github_pat_[A-Za-z0-9_]{16,})\b', '[REDACTED_TOKEN]')
    if ($s.Length -gt 4000) { $s = $s.Substring($s.Length - 4000) }
    return $s
}

function Join-CommandParts {
    param([string] $Command, [object[]] $CommandArgs)
    if (-not $Command) { return '' }
    return ((@($Command) + @($CommandArgs)) -join ' ').Trim()
}

function Get-Definition {
    param([string] $Name)
    $lower = $Name.ToLowerInvariant()
    if ($Known.ContainsKey($lower)) { return ,$Known[$lower] }
    return ,@{
        display = $Name
        command = ''
        args = @()
        setup = $(if ($SetupCommand) { $SetupCommand } else { "$Name login" })
    }
}

function Split-CommandLine {
    param([string] $CommandLine)
    if (-not $CommandLine.Trim()) { return @() }
    return [regex]::Matches($CommandLine, '("(?:\\"|[^"])*"|''(?:''''|[^''])*''|\S+)') |
        ForEach-Object {
            $v = $_.Value
            if (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'"))) {
                $v = $v.Substring(1, $v.Length - 2)
            }
            $v
        }
}

function Invoke-IntegrationCheck {
    param([string] $Name)
    $def = Get-Definition $Name
    $command = [string]$def['command']
    $args = @($def['args'])
    if ($AuthCheckCommand.Trim()) {
        $parts = @(Split-CommandLine $AuthCheckCommand)
        if ($parts.Count -gt 0) {
            $command = $parts[0]
            $args = @($parts | Select-Object -Skip 1)
        }
    }
    if (-not $command) {
        return [ordered]@{
            ok = $false
            status = 'unknown'
            exitCode = 4
            command = ''
            output = 'No auth check command configured.'
        }
    }
    $cmdInfo = Get-Command $command -ErrorAction SilentlyContinue
    if (-not $cmdInfo) {
        return [ordered]@{
            ok = $false
            status = 'missing_cli'
            exitCode = 3
            command = Join-CommandParts -Command $command -CommandArgs $args
            output = "CLI command not found: $command"
        }
    }
    $global:LASTEXITCODE = 0
    $output = @()
    try {
        $output = & $command @args 2>&1 | ForEach-Object { Mask-SecretText "$_" }
        $exit = if ($null -ne $global:LASTEXITCODE) { [int]$global:LASTEXITCODE } else { 0 }
        return [ordered]@{
            ok = ($exit -eq 0)
            status = $(if ($exit -eq 0) { 'configured' } else { 'needs_setup' })
            exitCode = $exit
            command = Join-CommandParts -Command $command -CommandArgs $args
            output = (($output | Select-Object -Last 20) -join "`n")
        }
    } catch {
        return [ordered]@{
            ok = $false
            status = 'needs_setup'
            exitCode = 2
            command = Join-CommandParts -Command $command -CommandArgs $args
            output = Mask-SecretText $_.Exception.Message
        }
    }
}

function Append-IntegrationLog {
    param(
        [string] $Name,
        [string] $Event,
        [hashtable] $Record
    )
    $safeName = $Name.ToLowerInvariant()
    $logPath = Join-Path $LogsDir ($safeName + '.jsonl')
    $line = [ordered]@{
        ts = (Get-Date).ToUniversalTime().ToString('o')
        service = $safeName
        event = $Event
        status = $Record.status
        command = $Record.authCheck
        setupHint = $Record.setupHint
        notes = Mask-SecretText $Record.notes
        exitCode = $Record.lastCheckExitCode
    } | ConvertTo-Json -Compress -Depth 5
    Add-Content -LiteralPath $logPath -Encoding UTF8 -Value $line
}

function Set-ServiceRecord {
    param(
        [hashtable] $State,
        [string] $Name,
        [hashtable] $Patch
    )
    $key = $Name.ToLowerInvariant()
    $def = Get-Definition $key
    $old = if ($State.services.Contains($key)) { $State.services[$key] } else { [ordered]@{} }
    $now = (Get-Date).ToUniversalTime().ToString('o')
    $record = [ordered]@{
        service = $key
        display = $def['display']
        status = $(if ($old.status) { $old.status } else { 'unknown' })
        configuredAt = $old.configuredAt
        lastCheckedAt = $old.lastCheckedAt
        lastCheckExitCode = $old.lastCheckExitCode
        authCheck = $(if ($old.authCheck) { $old.authCheck } else { Join-CommandParts -Command ([string]$def['command']) -CommandArgs @($def['args']) })
        setupHint = $(if ($SetupCommand) { $SetupCommand } elseif ($old.setupHint) { $old.setupHint } else { $def['setup'] })
        notes = $(if ($old.notes) { $old.notes } else { '' })
        evidenceTail = $(if ($old.evidenceTail) { $old.evidenceTail } else { '' })
        updatedAt = $now
    }
    foreach ($k in $Patch.Keys) { $record[$k] = $Patch[$k] }
    if ($record.status -eq 'configured' -and -not $record.configuredAt) { $record.configuredAt = $now }
    $record.notes = Mask-SecretText $record.notes
    $record.evidenceTail = Mask-SecretText $record.evidenceTail
    $State.services[$key] = $record
    return $record
}

function Get-ServicesToProcess {
    if ($Service -ne 'all') { return @($Service.ToLowerInvariant()) }
    $state = Read-State
    $names = New-Object System.Collections.Generic.HashSet[string]
    foreach ($k in $Known.Keys) { [void]$names.Add($k) }
    foreach ($k in $state.services.Keys) { [void]$names.Add($k) }
    return @($names | Sort-Object)
}

function Show-Record {
    param([hashtable] $Record)
    $configuredAt = if ($Record.configuredAt) { $Record.configuredAt } else { '-' }
    $lastCheckedAt = if ($Record.lastCheckedAt) { $Record.lastCheckedAt } else { '-' }
    Write-Host ("{0,-10} {1,-12} configured={2} checked={3}" -f $Record.service, $Record.status, $configuredAt, $lastCheckedAt)
}

function Ensure-Service {
    param([string] $Name)
    $state = Read-State
    $key = $Name.ToLowerInvariant()
    $existing = if ($state.services.Contains($key)) { $state.services[$key] } else { $null }
    if ($existing -and $existing.status -eq 'configured' -and -not $Verify) {
        Write-Host ("[creamai] {0} already configured. Skipping setup." -f $key) -ForegroundColor Green
        Show-Record $existing
        return 0
    }
    $check = Invoke-IntegrationCheck $key
    $patch = [ordered]@{
        status = $check.status
        lastCheckedAt = (Get-Date).ToUniversalTime().ToString('o')
        lastCheckExitCode = $check.exitCode
        authCheck = $check.command
        notes = $(if ($Notes) { $Notes } elseif ($check.ok) { 'auth check passed' } else { 'auth check did not pass' })
        evidenceTail = $check.output
    }
    $record = Set-ServiceRecord -State $state -Name $key -Patch $patch
    Write-State $state
    Append-IntegrationLog -Name $key -Event 'ensure' -Record $record
    Show-Record $record
    if ($check.ok) {
        Write-Host ("[creamai] {0} configuration remembered." -f $key) -ForegroundColor Green
        return 0
    }
    Write-Host ("[creamai] {0} needs setup. Suggested command: {1}" -f $key, $record.setupHint) -ForegroundColor Yellow
    if ($check.output) { Write-Host $check.output -ForegroundColor DarkYellow }
    return $check.exitCode
}

function Check-Service {
    param([string] $Name)
    $script:Verify = $true
    return Ensure-Service $Name
}

function Mark-Service {
    param([string] $Name)
    $state = Read-State
    $patch = [ordered]@{
        status = 'configured'
        configuredAt = (Get-Date).ToUniversalTime().ToString('o')
        lastCheckedAt = (Get-Date).ToUniversalTime().ToString('o')
        lastCheckExitCode = 0
        notes = $(if ($Notes) { $Notes } else { 'marked configured manually' })
        evidenceTail = 'manual mark; no secret stored'
    }
    $record = Set-ServiceRecord -State $state -Name $Name -Patch $patch
    Write-State $state
    Append-IntegrationLog -Name $Name -Event 'mark' -Record $record
    Show-Record $record
    return 0
}

function Reset-Service {
    param([string] $Name)
    $state = Read-State
    $patch = [ordered]@{
        status = 'needs_setup'
        configuredAt = ''
        lastCheckedAt = (Get-Date).ToUniversalTime().ToString('o')
        lastCheckExitCode = 1
        notes = $(if ($Notes) { $Notes } else { 'reset manually' })
        evidenceTail = 'reset requested'
    }
    $record = Set-ServiceRecord -State $state -Name $Name -Patch $patch
    Write-State $state
    Append-IntegrationLog -Name $Name -Event 'reset' -Record $record
    Show-Record $record
    return 0
}

function List-Services {
    $state = Read-State
    $names = Get-ServicesToProcess
    foreach ($name in $names) {
        if ($state.services.Contains($name)) {
            Show-Record $state.services[$name]
        } else {
            $def = Get-Definition $name
            Show-Record ([ordered]@{
                service = $name
                status = 'unknown'
                configuredAt = ''
                lastCheckedAt = ''
                setupHint = $def['setup']
            })
        }
    }
    return 0
}

$exitCode = 0
if ($Action -eq 'list') {
    $exitCode = List-Services
} else {
    foreach ($name in (Get-ServicesToProcess)) {
        $code = 0
        if ($Action -eq 'ensure') { $code = Ensure-Service $name }
        elseif ($Action -eq 'check') { $code = Check-Service $name }
        elseif ($Action -eq 'mark') { $code = Mark-Service $name }
        elseif ($Action -eq 'reset') { $code = Reset-Service $name }
        if ($code -ne 0 -and $exitCode -eq 0) { $exitCode = $code }
    }
}

$global:LASTEXITCODE = $exitCode
if ($ExitProcess) { exit $exitCode }
