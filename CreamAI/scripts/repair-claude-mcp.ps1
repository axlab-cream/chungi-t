<#
.SYNOPSIS
    Repair Claude Code MCP configuration that causes startup /doctor warnings.

.DESCRIPTION
    Claude Code reads project MCP servers from project-root .mcp.json and keeps
    local/user MCP state in ~/.claude.json. Empty generated .mcp.json files,
    empty approval arrays, stale mcp-needs-auth-cache.json entries, and old
    project-local MCP servers can surface as "setup issue: MCP" at startup.

    This script backs up every file it changes and never prints secret values.

.EXAMPLES
    .\CreamAI\scripts\repair-claude-mcp.ps1
    .\CreamAI\scripts\repair-claude-mcp.ps1 -ResetAuthCache
    .\CreamAI\scripts\repair-claude-mcp.ps1 -ResetProjectLocalMcpServers
    .\CreamAI\scripts\repair-claude-mcp.ps1 -ResetUserMcpState -ResetAuthCache
#>
[CmdletBinding()]
param(
    [string] $ProjectPath = (Get-Location).Path,

    [switch] $ResetProjectLocalMcpServers,

    [switch] $ResetUserMcpState,

    [switch] $ResetAuthCache
)

$ErrorActionPreference = 'Stop'

function Get-Stamp {
    return (Get-Date -Format 'yyyyMMdd-HHmmss')
}

function Get-BackupRoot {
    $root = Join-Path $HOME '.claude\backups'
    $dir = Join-Path $root ('creamai-mcp-repair-' + (Get-Stamp))
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    return $dir
}

$BackupRoot = Get-BackupRoot
$Changed = New-Object System.Collections.Generic.List[string]

function Backup-File {
    param([Parameter(Mandatory = $true)][string] $Path)
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    $name = (Split-Path -Leaf $Path)
    $hash = [Math]::Abs($Path.GetHashCode())
    $dest = Join-Path $BackupRoot ($name + '.' + $hash + '.bak')
    Copy-Item -LiteralPath $Path -Destination $dest -Force
    return $dest
}

function Read-JsonObject {
    param([Parameter(Mandatory = $true)][string] $Path)
    if (-not (Test-Path -LiteralPath $Path)) { return [pscustomobject]@{} }
    $raw = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
    if (-not $raw.Trim()) { return [pscustomobject]@{} }
    return ($raw | ConvertFrom-Json -ErrorAction Stop)
}

function Write-JsonObject {
    param(
        [Parameter(Mandatory = $true)][string] $Path,
        [Parameter(Mandatory = $true)][object] $Value
    )
    $parent = Split-Path -Parent $Path
    if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    ($Value | ConvertTo-Json -Depth 100) | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Get-Prop {
    param([object] $Object, [string] $Name)
    if (-not $Object) { return $null }
    return ($Object.PSObject.Properties | Where-Object { $_.Name -eq $Name } | Select-Object -First 1)
}

function Remove-Prop {
    param([object] $Object, [string] $Name)
    if (-not $Object) { return $false }
    $prop = Get-Prop -Object $Object -Name $Name
    if (-not $prop) { return $false }
    [void]$Object.PSObject.Properties.Remove($Name)
    return $true
}

function Get-ObjectPropertyNames {
    param([object] $Object)
    if (-not $Object) { return @() }
    return @($Object.PSObject.Properties | ForEach-Object { $_.Name })
}

function Test-EmptyArrayProperty {
    param([object] $Object, [string] $Name)
    $prop = Get-Prop -Object $Object -Name $Name
    if (-not $prop) { return $false }
    if ($null -eq $prop.Value) { return $true }
    return (@($prop.Value).Count -eq 0)
}

function Backup-And-RemoveFile {
    param([string] $Path, [string] $Reason)
    $backup = Backup-File -Path $Path
    Remove-Item -LiteralPath $Path -Force
    $Changed.Add("$Reason -> removed $(Split-Path -Leaf $Path), backup=$backup") | Out-Null
}

function Repair-ProjectMcpFile {
    param([string] $Root)
    $mcpPath = Join-Path $Root '.mcp.json'
    if (-not (Test-Path -LiteralPath $mcpPath)) { return @() }

    try {
        $mcp = Read-JsonObject -Path $mcpPath
    } catch {
        Backup-And-RemoveFile -Path $mcpPath -Reason 'invalid project .mcp.json'
        return @()
    }

    $serversProp = Get-Prop -Object $mcp -Name 'mcpServers'
    $serverNames = if ($serversProp) { Get-ObjectPropertyNames -Object $serversProp.Value } else { @() }
    if ($serverNames.Count -eq 0) {
        Backup-And-RemoveFile -Path $mcpPath -Reason 'empty project .mcp.json'
    }
    return $serverNames
}

function Repair-ProjectClaudeSettings {
    param([string] $Root, [string[]] $ProjectServerNames)
    $settingsPath = Join-Path $Root '.claude\settings.json'
    if (-not (Test-Path -LiteralPath $settingsPath)) { return }

    try {
        $settings = Read-JsonObject -Path $settingsPath
    } catch {
        $backup = Backup-File -Path $settingsPath
        $settings = [pscustomobject]@{
            '$schema' = 'https://json.schemastore.org/claude-code-settings.json'
        }
        Write-JsonObject -Path $settingsPath -Value $settings
        $Changed.Add("invalid .claude/settings.json -> reset to schema only, backup=$backup") | Out-Null
        return
    }

    $dirty = $false
    if ($ProjectServerNames.Count -eq 0) {
        foreach ($name in @('enabledMcpjsonServers', 'disabledMcpjsonServers')) {
            if (Test-EmptyArrayProperty -Object $settings -Name $name) {
                $dirty = (Remove-Prop -Object $settings -Name $name) -or $dirty
            }
        }
        $enableAll = Get-Prop -Object $settings -Name 'enableAllProjectMcpServers'
        if ($enableAll -and $enableAll.Value -eq $false) {
            $dirty = (Remove-Prop -Object $settings -Name 'enableAllProjectMcpServers') -or $dirty
        }
    }

    if ((Get-ObjectPropertyNames -Object $settings).Count -eq 0) {
        $settings | Add-Member -NotePropertyName '$schema' -NotePropertyValue 'https://json.schemastore.org/claude-code-settings.json' -Force
        $dirty = $true
    }

    if ($dirty) {
        $backup = Backup-File -Path $settingsPath
        Write-JsonObject -Path $settingsPath -Value $settings
        $Changed.Add("project .claude/settings.json MCP noise removed, backup=$backup") | Out-Null
    }
}

function Get-PathVariants {
    param([string] $Path)
    $resolved = (Resolve-Path -LiteralPath $Path).Path
    $forward = $resolved.Replace('\', '/')
    $variants = New-Object System.Collections.Generic.List[string]
    foreach ($candidate in @($resolved, $forward)) {
        if ($candidate -and (-not $variants.Contains($candidate))) {
            $variants.Add($candidate) | Out-Null
        }
    }
    return $variants.ToArray()
}

function Repair-ClaudeStateEntry {
    param(
        [object] $Entry,
        [switch] $RemoveLocalServers
    )

    $dirty = $false
    foreach ($name in @('mcpContextUris', 'enabledMcpjsonServers', 'disabledMcpjsonServers')) {
        if (Test-EmptyArrayProperty -Object $Entry -Name $name) {
            $dirty = (Remove-Prop -Object $Entry -Name $name) -or $dirty
        }
    }

    $serversProp = Get-Prop -Object $Entry -Name 'mcpServers'
    if ($serversProp) {
        $serverNames = Get-ObjectPropertyNames -Object $serversProp.Value
        if ($serverNames.Count -eq 0 -or $RemoveLocalServers) {
            $dirty = (Remove-Prop -Object $Entry -Name 'mcpServers') -or $dirty
        }
    }
    return $dirty
}

function Repair-ClaudeState {
    param(
        [string] $Root,
        [switch] $RemoveProjectLocalServers,
        [switch] $RemoveUserMcpState
    )

    $statePath = Join-Path $HOME '.claude.json'
    if (-not (Test-Path -LiteralPath $statePath)) { return }
    $state = Read-JsonObject -Path $statePath
    $dirty = $false

    foreach ($variant in (Get-PathVariants -Path $Root)) {
        $projectProp = Get-Prop -Object $state.projects -Name $variant
        if ($projectProp) {
            $dirty = (Repair-ClaudeStateEntry -Entry $projectProp.Value -RemoveLocalServers:$RemoveProjectLocalServers) -or $dirty
        }
    }

    if ($RemoveUserMcpState) {
        foreach ($name in @('mcpServers', 'enabledMcpjsonServers', 'disabledMcpjsonServers', 'mcpContextUris')) {
            if (Get-Prop -Object $state -Name $name) {
                $dirty = (Remove-Prop -Object $state -Name $name) -or $dirty
            }
        }
        foreach ($homeVariant in @($HOME, $HOME.Replace('\', '/'))) {
            $projectProp = Get-Prop -Object $state.projects -Name $homeVariant
            if ($projectProp) {
                $dirty = (Repair-ClaudeStateEntry -Entry $projectProp.Value -RemoveLocalServers) -or $dirty
            }
        }
    }

    if ($state.projects) {
        foreach ($projectProp in $state.projects.PSObject.Properties) {
            $dirty = (Repair-ClaudeStateEntry -Entry $projectProp.Value) -or $dirty
        }
    }

    if ($dirty) {
        $backup = Backup-File -Path $statePath
        Write-JsonObject -Path $statePath -Value $state
        $Changed.Add("~/.claude.json MCP state repaired, backup=$backup") | Out-Null
    }
}

function Repair-McpAuthCache {
    $cachePath = Join-Path $HOME '.claude\mcp-needs-auth-cache.json'
    if (-not (Test-Path -LiteralPath $cachePath)) { return }
    $backup = Backup-File -Path $cachePath
    Remove-Item -LiteralPath $cachePath -Force
    $Changed.Add("stale mcp-needs-auth-cache.json removed, backup=$backup") | Out-Null
}

$resolvedProject = (Resolve-Path -LiteralPath $ProjectPath).Path
$serverNames = Repair-ProjectMcpFile -Root $resolvedProject
Repair-ProjectClaudeSettings -Root $resolvedProject -ProjectServerNames $serverNames
Repair-ClaudeState -Root $resolvedProject -RemoveProjectLocalServers:$ResetProjectLocalMcpServers -RemoveUserMcpState:$ResetUserMcpState
if ($ResetAuthCache) { Repair-McpAuthCache }

Write-Host '[creamai] Claude MCP repair complete.' -ForegroundColor Green
Write-Host ('[creamai] Project: ' + $resolvedProject)
Write-Host ('[creamai] Backup folder: ' + $BackupRoot)
if ($Changed.Count -eq 0) {
    Write-Host '[creamai] No changes were needed.' -ForegroundColor Green
} else {
    foreach ($item in $Changed) {
        Write-Host ('[creamai] ' + $item) -ForegroundColor Yellow
    }
}
