<#
.SYNOPSIS
    Append one sanitized ProjectOps task event to logs/events/<task-id>.jsonl.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^task-[A-Za-z0-9][A-Za-z0-9._-]{0,63}$')]
    [string]$TaskId,

    [ValidateSet('preflight', 'research', 'implementation', 'test', 'review', 'rag', 'release', 'postmortem', 'manual')]
    [string]$Phase = 'manual',

    [ValidateSet('claude', 'antigravity', 'codex', 'projectops', 'user', 'system')]
    [string]$Agent = 'projectops',

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z][A-Za-z0-9_.:-]{0,79}$')]
    [string]$Action,

    [string]$InputSummary = '',
    [string]$OutputSummary = '',
    [string[]]$FilesChanged = @(),
    [string[]]$CommandsRun = @(),

    [ValidateSet('success', 'failure', 'warning', 'skipped')]
    [string]$Result = 'success',

    [ValidateSet('', 'requirement_miss', 'context_loss', 'tool_error', 'test_fail', 'regression', 'security_risk', 'performance_issue', 'encoding_error', 'prompt_leak', 'deployment_fail')]
    [string]$FailureType = '',

    [ValidateSet('', 'surgical_fix', 'reusable_prompt', 'stable_command', 'migration_note', 'quality_gate', 'cost_save', 'latency_improve', 'reliability_improve')]
    [string]$SuccessPattern = '',

    [string]$Decision = '',
    [string]$ReusableRule = '',

    [switch]$RagCandidate,
    [ValidateSet('public', 'internal', 'confidential', 'secret')]
    [string]$PrivacyLevel = 'internal',
    [switch]$NeedsHumanReview
)

$ErrorActionPreference = 'Stop'

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
try {
    [Console]::InputEncoding = $utf8NoBom
    [Console]::OutputEncoding = $utf8NoBom
    $global:OutputEncoding = $utf8NoBom
} catch {}

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EventsDir = Join-Path $ProjectRoot 'logs\events'

function Convert-ToProjectRelativePath {
    param([string]$PathValue)
    if (-not $PathValue) { return '' }
    $clean = Mask-SecretText $PathValue
    try {
        $full = [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot $clean))
        $root = [System.IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\')
        if ($full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
            return $full.Substring($root.Length).TrimStart('\')
        }
    } catch {}
    if ([System.IO.Path]::IsPathRooted($clean)) {
        return '[OUTSIDE_PROJECT_PATH_REDACTED]'
    }
    return $clean
}

function Mask-SecretText {
    param([AllowNull()][string]$Text)
    if ($null -eq $Text) { return '' }
    $value = [string]$Text
    $value = [regex]::Replace($value, '(?is)-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----.*?-----END [A-Z0-9 ]*PRIVATE KEY-----', '[REDACTED_PRIVATE_KEY]')
    $value = [regex]::Replace($value, '(?i)(authorization\s*[:=]\s*bearer\s+)[A-Za-z0-9._~+/=-]+', '$1[REDACTED]')
    $value = [regex]::Replace($value, "(?i)\b(api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|passwd|pwd|secret|token)\b\s*[:=]\s*[""']?[^""',\s;]+", '$1=[REDACTED]')
    $value = [regex]::Replace($value, '\b(sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9_]{16,}|github_pat_[A-Za-z0-9_]{16,})\b', '[REDACTED_TOKEN]')
    $value = [regex]::Replace($value, '\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b', '[REDACTED_EMAIL]', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    $value = [regex]::Replace($value, '\b\d{3}-\d{2}-\d{4}\b', '[REDACTED_ID]')
    $value = [regex]::Replace($value, '\b\d{2,3}-\d{3,4}-\d{4}\b', '[REDACTED_PHONE]')
    return $value
}

function Convert-ToSafeArray {
    param([string[]]$Values, [switch]$AsPath)
    $safe = @()
    foreach ($item in ($Values | Select-Object -First 64)) {
        if ($AsPath) {
            $safe += (Convert-ToProjectRelativePath $item)
        } else {
            $safe += (Mask-SecretText $item)
        }
    }
    return $safe
}

New-Item -ItemType Directory -Force -Path $EventsDir | Out-Null

$safeRagCandidate = [bool]$RagCandidate
$safeNeedsHumanReview = [bool]$NeedsHumanReview
if ($PrivacyLevel -eq 'secret' -and $safeRagCandidate) {
    $safeRagCandidate = $false
    $safeNeedsHumanReview = $true
}

$event = [ordered]@{
    task_id = $TaskId
    timestamp = [DateTimeOffset]::Now.ToString('o')
    phase = $Phase
    agent = $Agent
    action = $Action
    input_summary = Mask-SecretText $InputSummary
    output_summary = Mask-SecretText $OutputSummary
    files_changed = Convert-ToSafeArray -Values $FilesChanged -AsPath
    commands_run = Convert-ToSafeArray -Values $CommandsRun
    result = $Result
    failure_type = $(if ($FailureType) { $FailureType } else { $null })
    success_pattern = $(if ($SuccessPattern) { $SuccessPattern } else { $null })
    decision = Mask-SecretText $Decision
    reusable_rule = Mask-SecretText $ReusableRule
    rag_candidate = $safeRagCandidate
    privacy_level = $PrivacyLevel
    needs_human_review = $safeNeedsHumanReview
}

$json = $event | ConvertTo-Json -Compress -Depth 6
$eventPath = Join-Path $EventsDir ($TaskId + '.jsonl')
[System.IO.File]::AppendAllText($eventPath, $json + [Environment]::NewLine, $utf8NoBom)

Write-Host "[projectops] event logged: $eventPath" -ForegroundColor Green
