<#
.SYNOPSIS
    Search approved ProjectOps memory with secret-safe, simple string matching.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateLength(1, 160)]
    [string]$Query,

    [switch]$IncludeCandidates,

    [ValidateRange(1, 50)]
    [int]$Limit = 12
)

$ErrorActionPreference = 'Stop'

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
try {
    [Console]::OutputEncoding = $utf8NoBom
    $global:OutputEncoding = $utf8NoBom
} catch {}

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$SearchRoots = @(Join-Path $ProjectRoot 'memory\approved')
if ($IncludeCandidates) {
    $SearchRoots += (Join-Path $ProjectRoot 'memory\candidates')
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

function Convert-ToProjectRelativePath {
    param([string]$PathValue)
    $full = [System.IO.Path]::GetFullPath($PathValue)
    $root = [System.IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\')
    if ($full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $full.Substring($root.Length).TrimStart('\')
    }
    return '[OUTSIDE_PROJECT_PATH_REDACTED]'
}

$results = @()
foreach ($root in $SearchRoots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    $files = Get-ChildItem -LiteralPath $root -Recurse -File -Include *.md,*.json,*.jsonl -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        if ($results.Count -ge $Limit) { break }
        try {
            $matches = Select-String -LiteralPath $file.FullName -SimpleMatch -Pattern $Query -Encoding UTF8 -ErrorAction Stop |
                Select-Object -First 3
            foreach ($m in $matches) {
                if ($results.Count -ge $Limit) { break }
                $results += [pscustomobject]@{
                    file = Convert-ToProjectRelativePath $file.FullName
                    line = $m.LineNumber
                    text = Mask-SecretText $m.Line.Trim()
                }
            }
        } catch {}
    }
}

if ($results.Count -eq 0) {
    Write-Host '[projectops] no memory hits' -ForegroundColor Yellow
    exit 0
}

$results | Format-Table -AutoSize
