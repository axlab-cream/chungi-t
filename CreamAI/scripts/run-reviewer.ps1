<#
.SYNOPSIS
    Dispatch a code review task to Codex (Reviewer Agent) following the
    contract in agents/reviewer.md, and save the structured report to logs/review/.

.DESCRIPTION
    Wraps the codex CLI so that:
      1. agents/reviewer.md is always prepended to the prompt (auto-load contract).
      2. A real ISO-8601 UTC timestamp and task-id are injected by the PM, not by the LLM.
      3. Codex runs with --skip-git-repo-check --sandbox read-only and -C set to the
         project root, so it can read source files but cannot mutate them.
      4. The structured "last message" is written via -o to logs/review/<task-id>_<slug>.md.
         Codex's verbose stdout (model header, token counts) is captured separately to
         logs/review/<task-id>_<slug>.codex-stdout.log for debugging.
      5. Role fallback: if codex is not connected (missing or failing), Claude CLI
         substitutes as the Reviewer on the Opus model (best-reasoning check) and
         the report is marked accordingly.

.PARAMETER TaskId
    Backlog task identifier, e.g. "task-003".

.PARAMETER Slug
    Short kebab-case slug describing the review target, e.g. "ipc-validation".

.PARAMETER PromptFile
    Path to the user-authored prompt body file (the [FOCUS AREAS] / [DELIVERABLE] block).

.PARAMETER Model
    Optional Codex model override (passes through as -m).

.EXAMPLE
    .\scripts\run-reviewer.ps1 -TaskId task-003 -Slug ipc-validation `
        -PromptFile .\logs\review\_prompt_task-003.txt
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $TaskId,

    [Parameter(Mandatory = $true)]
    [string] $Slug,

    [Parameter(Mandatory = $true)]
    [string] $PromptFile,

    [string] $Model = ""
)

$ErrorActionPreference = "Stop"

$projectRoot   = Split-Path -Parent $PSScriptRoot
$contractPath  = Join-Path $projectRoot "agents\reviewer.md"
$reviewDir     = Join-Path $projectRoot "logs\review"
$outputPath    = Join-Path $reviewDir ("{0}_{1}.md" -f $TaskId, $Slug)
$stdoutLogPath = Join-Path $reviewDir ("{0}_{1}.codex-stdout.log" -f $TaskId, $Slug)
$timestampUtc  = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

if (-not (Test-Path $contractPath)) {
    throw "Contract file not found: $contractPath"
}
if (-not (Test-Path $PromptFile)) {
    throw "Prompt file not found: $PromptFile"
}
if (-not (Test-Path $reviewDir)) {
    New-Item -ItemType Directory -Path $reviewDir -Force | Out-Null
}

$contract = Get-Content -Raw -Encoding UTF8 $contractPath
$body     = Get-Content -Raw -Encoding UTF8 $PromptFile

$header = @"
[FROM] Claude Code (PM) at creamai-cli
[TO] Codex (Reviewer Agent)
[TASK ID] $TaskId
[DISPATCHED AT] $timestampUtc

[CONTRACT — agents/reviewer.md, follow exactly]
$contract

[PM INSTRUCTIONS]
- Use the [DISPATCHED AT] timestamp above as your "리뷰 시점"; do NOT invent a different one.
- Output ONLY the structured Markdown report described in the [TASK BODY]. No preface, no closing remarks, no diff.
- You may read source files in the project root (read-only sandbox). Do NOT modify any file.

[TASK BODY]
"@

$fullPrompt = $header + "`n" + $body

$codexArgs = @(
    "exec",
    "--skip-git-repo-check",
    "--sandbox", "read-only",
    "-C", $projectRoot,
    "-o", $outputPath
)
if ($Model) {
    $codexArgs += @("-m", $Model)
}
# Trailing "-" tells codex to read the prompt from stdin.
$codexArgs += "-"

## ----------------------------------------------------------------------------
## Wrapper Guards (task-010 / task-013) — keep these guards in sync between
## run-researcher.ps1 and run-reviewer.ps1 even if the surrounding logic diverges.
##
## G1. CLI-arg compatibility (CLI-specific):
##     codex uses positional `exec` + trailing `-` for stdin, so the -p empty-string
##     trap that antigravity has does not apply here. Nothing to add.
## G2. Stderr isolation (PowerShell 5.1):
##     Do NOT use `2>&1` on native CLIs. PS 5.1 wraps each stderr line as a
##     NativeCommandError record; combined with $ErrorActionPreference = "Stop"
##     this aborts the script on benign warnings. codex's stderr now goes to
##     console; stdout is captured via Tee-Object for debugging.
## G3. Exit-code verification:
##     `$ErrorActionPreference = "Stop"` only escalates cmdlet errors, NOT a native
##     CLI's non-zero exit. Always check `$LASTEXITCODE` after the call so silent
##     CLI failures surface as wrapper failures.
## G4. UTF-8 console pipe (task-013):
##     Windows non-en-US hosts default to OEM codepage (e.g. cp949 on Korean
##     Windows). The review file goes via codex's `-o` flag (UTF-8 by codex),
##     but the Tee-Object stdout debug log is captured through the PS pipe and
##     would otherwise mojibake any Korean diagnostic lines. Force UTF-8 on
##     the console for the native call and restore in `finally`.
## ----------------------------------------------------------------------------

# Role-fallback policy (task-023): if Codex is not connected, Claude substitutes
# as the Reviewer and the review runs on the Opus model (best-reasoning check).
# The saved report is marked with a role-fallback comment so the PM can tell who ran.
function Find-CodexCommand {
    foreach ($name in @('codex', 'codex.cmd', 'codex.exe')) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if ($cmd) { return $cmd }
    }
    return $null
}
function Find-ClaudeCommand {
    foreach ($name in @('claude', 'claude.cmd', 'claude.exe', 'dsclaude')) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if ($cmd) { return $cmd }
    }
    return $null
}

# G4: snapshot + force UTF-8 console encodings.
$origConsoleIn  = [Console]::InputEncoding
$origConsoleOut = [Console]::OutputEncoding
$origPSOutput   = $OutputEncoding
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding  = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding           = $utf8NoBom
$usedClaudeFallback = $false
try {
    $codexCommand = Find-CodexCommand
    if ($codexCommand) {
        # G1+G2: trailing `-` for stdin, no `2>&1`.
        $fullPrompt | & $codexCommand.Source @codexArgs | Tee-Object -FilePath $stdoutLogPath | Out-Null
        # G3: explicit exit-code check. Non-zero exit (not installed properly,
        # not logged in, network down) demotes codex and triggers the fallback.
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "[reviewer] codex exited with code $LASTEXITCODE — falling back to Claude (Opus) as Reviewer. See $stdoutLogPath."
            $codexCommand = $null
        }
    }
    if (-not $codexCommand) {
        $claudeCommand = Find-ClaudeCommand
        if (-not $claudeCommand) {
            throw "Neither Codex nor Claude CLI is available for the Reviewer role. Install one of them and re-run."
        }
        # 코드리뷰 폴백은 항상 최고 추론 모델(Opus)로 체크한다. -Model이 명시되면 그 값을 따른다.
        $fallbackModel = if ($Model) { $Model } else { 'opus' }
        Write-Host "[reviewer] Codex not connected — Claude ($fallbackModel) is substituting as Reviewer." -ForegroundColor Yellow
        $usedClaudeFallback = $true
        $rawLines = $fullPrompt | & $claudeCommand.Source -p --model $fallbackModel | ForEach-Object { "$_" }
        if ($LASTEXITCODE -ne 0) {
            throw "claude (Reviewer fallback) exited with code $LASTEXITCODE. Raw stdout (for diagnosis):`n$($rawLines -join "`n")"
        }
        $reportText = "<!-- role-fallback: claude ($fallbackModel) substituted for codex at $timestampUtc -->`r`n" + ($rawLines -join "`r`n")
        $utf8BomFallback = New-Object System.Text.UTF8Encoding($true)
        [System.IO.File]::WriteAllText($outputPath, $reportText, $utf8BomFallback)
        [System.IO.File]::WriteAllText($stdoutLogPath, ($rawLines -join "`r`n"), $utf8NoBom)
    }
} finally {
    # G4: always restore console encodings even on throw.
    [Console]::InputEncoding  = $origConsoleIn
    [Console]::OutputEncoding = $origConsoleOut
    $OutputEncoding           = $origPSOutput
}

if (-not (Test-Path $outputPath)) {
    throw "Reviewer did not produce output file: $outputPath. See $stdoutLogPath."
}

# Re-write output as UTF-8 with BOM (per global encoding rule for .md files).
$content = Get-Content -Raw -Encoding UTF8 $outputPath
$utf8Bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($outputPath, $content, $utf8Bom)

Write-Host "[reviewer] saved: $outputPath" -ForegroundColor Green
if ($usedClaudeFallback) {
    Write-Host "[reviewer] role-fallback: Claude (Opus) ran the Reviewer role (codex unavailable)." -ForegroundColor Yellow
}
Write-Host "[reviewer] stdout log: $stdoutLogPath" -ForegroundColor DarkGray
Write-Host "[reviewer] task-id: $TaskId  dispatched-at: $timestampUtc"
