<#
.SYNOPSIS
    Promote a sanitized memory candidate to approved ProjectOps knowledge.
#>
[CmdletBinding(DefaultParameterSetName = 'Approve')]
param(
    [Parameter(Mandatory = $true)]
    [ValidateLength(1, 220)]
    [string]$Candidate,

    [Parameter(Mandatory = $true, ParameterSetName = 'Approve')]
    [switch]$Approve,

    [Parameter(Mandatory = $true, ParameterSetName = 'Reject')]
    [switch]$Reject,

    [ValidateLength(0, 400)]
    [string]$Reason = ''
)

$ErrorActionPreference = 'Stop'

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
try {
    [Console]::OutputEncoding = $utf8NoBom
    $global:OutputEncoding = $utf8NoBom
} catch {}

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$CandidatesDir = Join-Path $ProjectRoot 'memory\candidates'
$ApprovedDir = Join-Path $ProjectRoot 'memory\approved'
$RejectedDir = Join-Path $ProjectRoot 'memory\rejected'
$KnowledgePath = Join-Path $ApprovedDir 'projectops_knowledge.md'

function Resolve-CandidatePath {
    param([string]$Value)
    $base = [System.IO.Path]::GetFullPath($CandidatesDir).TrimEnd('\')
    $candidatePath = if ([System.IO.Path]::IsPathRooted($Value)) {
        [System.IO.Path]::GetFullPath($Value)
    } else {
        [System.IO.Path]::GetFullPath((Join-Path $CandidatesDir $Value))
    }
    if (-not $candidatePath.StartsWith($base, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Candidate must be inside memory\candidates."
    }
    if (-not (Test-Path -LiteralPath $candidatePath)) {
        throw "Candidate not found: $candidatePath"
    }
    return $candidatePath
}

function Test-SensitiveText {
    param([string]$Text)
    $patterns = @(
        '(?is)-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----',
        '(?i)authorization\s*[:=]\s*bearer\s+[A-Za-z0-9._~+/=-]+',
        "(?i)\b(api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|passwd|pwd|secret|token)\b\s*[:=]\s*[""']?[^""',\s;]+",
        '\b(sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9_]{16,}|github_pat_[A-Za-z0-9_]{16,})\b',
        '(?im)^\s*privacy_level\s*:\s*secret\s*$'
    )
    foreach ($pattern in $patterns) {
        if ($Text -match $pattern) { return $true }
    }
    return $false
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
    return $value
}

New-Item -ItemType Directory -Force -Path $CandidatesDir, $ApprovedDir, $RejectedDir | Out-Null

$candidatePath = Resolve-CandidatePath $Candidate
$content = Get-Content -Raw -Encoding UTF8 -LiteralPath $candidatePath

if ($Approve) {
    if (Test-SensitiveText $content) {
        throw "Sensitive material detected. Refusing to promote. Redact the candidate first or reject it."
    }
    foreach ($required in @('task_id:', 'reuse_condition:', 'do_not_use_when:', 'should_promote_to_rag:', 'revalidation_command:')) {
        if ($content -notmatch [regex]::Escape($required)) {
            throw "Candidate missing required field: $required"
        }
    }

    $safeContent = Mask-SecretText $content
    $stamp = [DateTimeOffset]::Now.ToString('o')
    if (-not (Test-Path -LiteralPath $KnowledgePath)) {
        [System.IO.File]::WriteAllText($KnowledgePath, "# ProjectOps Approved Knowledge`r`n`r`n", $utf8NoBom)
    }
    $entry = "`r`n---`r`n`r`n<!-- promoted_at: $stamp source: $([System.IO.Path]::GetFileName($candidatePath)) -->`r`n`r`n" + $safeContent.Trim() + "`r`n"
    [System.IO.File]::AppendAllText($KnowledgePath, $entry, $utf8NoBom)
    Copy-Item -LiteralPath $candidatePath -Destination (Join-Path $ApprovedDir ([System.IO.Path]::GetFileName($candidatePath))) -Force
    Write-Host "[projectops] promoted: $KnowledgePath" -ForegroundColor Green
    exit 0
}

if ($Reject) {
    $stamp = [DateTimeOffset]::Now.ToString('o')
    $rejectedPath = Join-Path $RejectedDir ([System.IO.Path]::GetFileName($candidatePath))
    $body = "<!-- rejected_at: $stamp reason: $(Mask-SecretText $Reason) -->`r`n`r`n" + (Mask-SecretText $content)
    [System.IO.File]::WriteAllText($rejectedPath, $body, $utf8NoBom)
    Write-Host "[projectops] rejected: $rejectedPath" -ForegroundColor Yellow
    exit 0
}
