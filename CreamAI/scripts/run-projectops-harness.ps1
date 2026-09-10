<#
.SYNOPSIS
    Run a ProjectOps verification harness for a task.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^task-[A-Za-z0-9][A-Za-z0-9._-]{0,63}$')]
    [string]$TaskId,

    [Parameter(Mandatory = $true)]
    [ValidateSet('preflight', 'implementation', 'test', 'review', 'rag', 'release')]
    [string]$Mode
)

$ErrorActionPreference = 'Stop'

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
try {
    [Console]::InputEncoding = $utf8NoBom
    [Console]::OutputEncoding = $utf8NoBom
    $global:OutputEncoding = $utf8NoBom
} catch {}

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $ProjectRoot

# CreamAI is a folder inside the repository, so package.json is one level up.
# Looking for it in $ProjectRoot made the test harness skip `npm test` silently.
$RepoRoot = if (Test-Path -LiteralPath (Join-Path $ProjectRoot 'package.json')) {
    $ProjectRoot
} else {
    Split-Path -Parent $ProjectRoot
}

$HarnessDir = Join-Path $ProjectRoot 'logs\harness'
$TestDir = Join-Path $ProjectRoot 'logs\test'
$CandidateDir = Join-Path $ProjectRoot 'memory\candidates'
$ReportsDir = Join-Path $ProjectRoot 'reports'
New-Item -ItemType Directory -Force -Path @(
    (Join-Path $ProjectRoot 'logs\events'),
    $HarnessDir,
    (Join-Path $ProjectRoot 'logs\integrations'),
    (Join-Path $ProjectRoot 'logs\postmortem'),
    (Join-Path $ProjectRoot 'logs\research'),
    (Join-Path $ProjectRoot 'logs\review'),
    $TestDir,
    (Join-Path $ProjectRoot 'memory\approved'),
    $CandidateDir,
    (Join-Path $ProjectRoot 'memory\rejected'),
    (Join-Path $ProjectRoot 'integrations'),
    (Join-Path $ProjectRoot 'evals\code_quality'),
    (Join-Path $ProjectRoot 'evals\prompts'),
    (Join-Path $ProjectRoot 'evals\rag'),
    (Join-Path $ProjectRoot 'evals\regression'),
    $ReportsDir
) | Out-Null

$Result = [ordered]@{
    task_id = $TaskId
    mode = $Mode
    timestamp = [DateTimeOffset]::Now.ToString('o')
    checks = @()
    commands = @()
    warnings = @()
    failed = $false
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

function Add-Check {
    param([string]$Name, [string]$Status, [string]$Detail = '')
    $Result.checks += [pscustomobject]@{
        name = $Name
        status = $Status
        detail = Mask-SecretText $Detail
    }
    if ($Status -eq 'FAIL') { $Result.failed = $true }
}

function Invoke-TrackedCommand {
    param([string]$Name, [string]$File, [string[]]$Arguments, [string]$WorkingDirectory)
    $commandText = ($File + ' ' + ($Arguments -join ' ')).Trim()
    Write-Host "[projectops] $commandText" -ForegroundColor Cyan
    $lines = @()
    $exitCode = 0
    $pushed = $false
    try {
        if ($WorkingDirectory -and (Test-Path -LiteralPath $WorkingDirectory)) {
            Push-Location -LiteralPath $WorkingDirectory
            $pushed = $true
        }
        $oldErrorActionPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            $output = & $File @Arguments 2>&1
            $exitCode = $LASTEXITCODE
            if ($null -eq $exitCode) { $exitCode = 0 }
            $lines = @($output | ForEach-Object { Mask-SecretText "$_" })
        } finally {
            $ErrorActionPreference = $oldErrorActionPreference
            if ($pushed) { Pop-Location }
        }
    } catch {
        $exitCode = 1
        $lines = @(Mask-SecretText $_.Exception.Message)
    }
    $tail = @($lines | Select-Object -Last 40)
    $Result.commands += [pscustomobject]@{
        name = $Name
        command = $commandText
        exit_code = $exitCode
        output_tail = $tail
    }
    if ($exitCode -ne 0) {
        $Result.failed = $true
        Add-Check $Name 'FAIL' "exit_code=$exitCode"
    } else {
        Add-Check $Name 'PASS' 'exit_code=0'
    }
}

function Get-PackageScripts {
    $packagePath = Join-Path $RepoRoot 'package.json'
    if (-not (Test-Path -LiteralPath $packagePath)) { return @{} }
    try {
        $pkg = Get-Content -Raw -Encoding UTF8 -LiteralPath $packagePath | ConvertFrom-Json
        if ($pkg.scripts) { return $pkg.scripts.PSObject.Properties.Name }
    } catch {}
    return @()
}

function Test-SecretPatternsInTrackedFiles {
    $files = @()
    try {
        $files = & git diff --name-only HEAD 2>$null
        $untracked = & git ls-files --others --exclude-standard 2>$null
        $files = @($files) + @($untracked)
        if ($LASTEXITCODE -ne 0 -or $files.Count -eq 0) { $files = & git ls-files 2>$null }
    } catch {}
    $files = @($files | Where-Object {
        $_ -and
        $_ -notmatch '(^|/)(node_modules|release|dist|out|\.git|logs|memory/rejected)(/|$)' -and
        (Test-Path -LiteralPath (Join-Path $ProjectRoot $_))
    } | Select-Object -First 200)
    $hits = @()
    foreach ($rel in $files) {
        $abs = Join-Path $ProjectRoot $rel
        try {
            $m = Select-String -LiteralPath $abs -Pattern '-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----|authorization\s*[:=]\s*bearer\s+|api[_-]?key\s*[:=]|access[_-]?token\s*[:=]|refresh[_-]?token\s*[:=]|client[_-]?secret\s*[:=]|sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9_]{16,}|github_pat_[A-Za-z0-9_]{16,}' -Encoding UTF8 -ErrorAction SilentlyContinue |
                Select-Object -First 5
            foreach ($item in $m) { $hits += "${rel}:$($item.LineNumber)" }
        } catch {}
    }
    return $hits
}

switch ($Mode) {
    'preflight' {
        $backlogPath = Join-Path $ProjectRoot ("backlog\{0}.md" -f $TaskId)
        if (Test-Path -LiteralPath $backlogPath) {
            Add-Check 'backlog exists' 'PASS' $backlogPath
        } else {
            Add-Check 'backlog exists' 'WARN' "Missing backlog\$TaskId.md"
            $Result.warnings += "Create backlog\$TaskId.md if this task will continue."
        }
        foreach ($dir in @('logs\events', 'logs\harness', 'logs\integrations', 'logs\test', 'integrations', 'memory\candidates', 'memory\approved', 'evals\rag', 'reports')) {
            $path = Join-Path $ProjectRoot $dir
            if (Test-Path -LiteralPath $path) { Add-Check "dir $dir" 'PASS' '' } else { Add-Check "dir $dir" 'FAIL' 'missing' }
        }
        $searchScript = Join-Path $PSScriptRoot 'search-project-memory.ps1'
        if (Test-Path -LiteralPath $searchScript) {
            $memory = & $searchScript -Query $TaskId -IncludeCandidates 2>&1 | ForEach-Object { Mask-SecretText "$_" }
            $Result.commands += [pscustomobject]@{ name = 'memory search'; command = 'search-project-memory'; exit_code = 0; output_tail = @($memory | Select-Object -Last 20) }
            Add-Check 'memory search' 'PASS' 'completed'
        }
    }
    'implementation' {
        $hits = Test-SecretPatternsInTrackedFiles
        if ($hits.Count -gt 0) {
            Add-Check 'secret scan changed files' 'FAIL' ($hits -join ', ')
        } else {
            Add-Check 'secret scan changed files' 'PASS' 'no obvious secret patterns'
        }
        try {
            $status = & git status --short 2>$null | Select-Object -First 80
            $Result.commands += [pscustomobject]@{ name = 'git status'; command = 'git status --short'; exit_code = 0; output_tail = @($status) }
            Add-Check 'git status available' 'PASS' ''
        } catch {
            Add-Check 'git status available' 'WARN' 'git unavailable'
        }
    }
    'test' {
        foreach ($file in @('main.js', 'preload.js', 'renderer.js')) {
            if (Test-Path -LiteralPath (Join-Path $ProjectRoot $file)) {
                Invoke-TrackedCommand -Name "node --check $file" -File 'node' -Arguments @('--check', $file)
            }
        }
        $scripts = @(Get-PackageScripts)
        if ($scripts -contains 'prebuild-check') {
            Invoke-TrackedCommand -Name 'npm run prebuild-check' -File 'npm' -Arguments @('run', 'prebuild-check') -WorkingDirectory $RepoRoot
        }
        if ($scripts -contains 'test') {
            Invoke-TrackedCommand -Name 'npm test' -File 'npm' -Arguments @('test') -WorkingDirectory $RepoRoot
        } else {
            Add-Check 'npm test script' 'WARN' 'package.json has no test script'
        }
        $testLog = Join-Path $TestDir ("{0}_test-summary.json" -f $TaskId)
        $Result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $testLog -Encoding UTF8
    }
    'review' {
        $reviewDir = Join-Path $ProjectRoot 'logs\review'
        $reports = @()
        if (Test-Path -LiteralPath $reviewDir) {
            $reports = @(Get-ChildItem -LiteralPath $reviewDir -Filter "$TaskId*.md" -File -ErrorAction SilentlyContinue)
        }
        if ($reports.Count -gt 0) {
            Add-Check 'Codex review report' 'PASS' ($reports[0].FullName)
        } else {
            Add-Check 'Codex review report' 'WARN' "No logs\review\$TaskId*.md found"
        }
    }
    'rag' {
        $candidatePath = Join-Path $CandidateDir ("{0}_memory.md" -f $TaskId)
        if (-not (Test-Path -LiteralPath $candidatePath)) {
            $template = @"
# ProjectOps Memory Candidate

task_id: $TaskId
date: $([DateTimeOffset]::Now.ToString('yyyy-MM-dd'))
case_type:
failure_type:
success_pattern:
problem:
solution:
root_cause:
why_it_worked:
reuse_condition:
do_not_use_when:
related_files:
recommended_prompt:
recommended_command:
revalidation_command:
expires_at:
privacy_level: internal
should_promote_to_rag: false

## Evidence
- tests:
- review:
- commands:

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
"@
            [System.IO.File]::WriteAllText($candidatePath, $template, $utf8NoBom)
            Add-Check 'memory candidate created' 'PASS' $candidatePath
        } else {
            Add-Check 'memory candidate exists' 'PASS' $candidatePath
        }
    }
    'release' {
        $reportPath = Join-Path $ReportsDir ("{0}_final.md" -f $TaskId)
        $changed = @()
        try { $changed = & git diff --name-only HEAD 2>$null } catch {}
        $report = @"
# ProjectOps Final Report

task_id: $TaskId
date: $([DateTimeOffset]::Now.ToString('yyyy-MM-dd'))

## Definition of Done
- backlog_goal_met:
- scope_contained:
- tests_passed:
- codex_review_done:
- critical_major_resolved:
- memory_candidate:
- sensitive_data_stored: false

## Changed Files
$(@($changed | ForEach-Object { "- $_" }) -join "`r`n")

## Risks
-

## Next Actions
-
"@
        [System.IO.File]::WriteAllText($reportPath, $report, $utf8NoBom)
        Add-Check 'release report created' 'PASS' $reportPath
    }
}

$harnessPath = Join-Path $HarnessDir ("{0}_{1}.json" -f $TaskId, $Mode)
$Result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $harnessPath -Encoding UTF8

$collector = Join-Path $PSScriptRoot 'collect-task-event.ps1'
if (Test-Path -LiteralPath $collector) {
    $eventResult = if ($Result.failed) { 'failure' } else { 'success' }
    & $collector -TaskId $TaskId -Phase $Mode -Agent 'projectops' -Action "harness_$Mode" -InputSummary "Run ProjectOps $Mode harness" -OutputSummary "Harness result written to logs\harness" -FilesChanged @($harnessPath) -CommandsRun @("scripts/run-projectops-harness.ps1 -TaskId $TaskId -Mode $Mode") -Result $eventResult -PrivacyLevel 'internal' | Out-Null
}

Write-Host "[projectops] harness result: $harnessPath" -ForegroundColor Green
if ($Result.failed) { exit 1 }
