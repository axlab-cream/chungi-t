<#
.SYNOPSIS
    Dispatch a code review task to the Reviewer Agent following the contract in
    agents/reviewer.md, and save the structured report to logs/review/.
    Default CLI is grok (rules.md 6.6); codex and claude remain as fallbacks.

.DESCRIPTION
    Wraps the codex CLI so that:
      1. agents/reviewer.md is always prepended to the prompt (auto-load contract).
      2. A real ISO-8601 UTC timestamp and task-id are injected by the PM, not by the LLM.
      3. Codex runs with --skip-git-repo-check --sandbox read-only and -C set to the
         project root, so it can read source files but cannot mutate them.
      4. The structured "last message" is written via -o to logs/review/<task-id>_<slug>.md.
         Codex's verbose stdout (model header, token counts) is captured separately to
         logs/review/<task-id>_<slug>.codex-stdout.log for debugging.
      5. Reviewer chain: grok -> codex -> claude(opus). Each link is tried only if
         the previous one is missing or exits non-zero, and the saved report is
         marked with a role-fallback comment whenever the primary did not run.
         grok has no -o flag, so its report comes back through the console pipe
         (see G4); codex writes the file itself via -o.

.PARAMETER TaskId
    Backlog task identifier, e.g. "task-003".

.PARAMETER Slug
    Short kebab-case slug describing the review target, e.g. "ipc-validation".

.PARAMETER PromptFile
    Path to the user-authored prompt body file (the [FOCUS AREAS] / [DELIVERABLE] block).

.PARAMETER Model
    Optional model override (passes through as -m to whichever CLI runs).

.PARAMETER Cli
    Reviewer CLI to use: auto (default, grok -> codex -> claude), grok, codex, or claude.

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

    [string] $Model = "",

    [ValidateSet('auto', 'grok', 'codex', 'claude')]
    [string] $Cli = 'auto'
)

$ErrorActionPreference = "Stop"

$projectRoot   = Split-Path -Parent $PSScriptRoot
# The contract and the logs live under the AIOps root; the code being reviewed
# does not. In a scaffolded project that root is <repo>/CreamAI, so pointing a
# reviewer CLI at $projectRoot would show it the paperwork and none of the code.
$codeRoot      = if ((Split-Path -Leaf $projectRoot) -eq 'CreamAI') {
    Split-Path -Parent $projectRoot
} else {
    $projectRoot
}
$contractPath  = Join-Path $projectRoot "agents\reviewer.md"
$reviewDir     = Join-Path $projectRoot "logs\review"
$outputPath    = Join-Path $reviewDir ("{0}_{1}.md" -f $TaskId, $Slug)
$stdoutLogPath = Join-Path $reviewDir ("{0}_{1}.reviewer-stdout.log" -f $TaskId, $Slug)
$promptTmpPath = Join-Path $reviewDir ("{0}_{1}.reviewer-prompt.txt" -f $TaskId, $Slug)
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

# Reviewer chain (rules.md 6.6): grok is the default reviewer; codex is kept as a
# fallback because it is rate limited, and Claude (Opus) is the last resort so the
# review step never silently disappears. A report produced by anything other than
# the requested primary carries a role-fallback marker on its first line.
function Find-ReviewerCommand {
    param([string[]] $Names)
    foreach ($name in $Names) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if ($cmd) { return $cmd }
    }
    return $null
}

$grokNames   = @('grok', 'grok.cmd', 'grok.exe')
$codexNames  = @('codex', 'codex.cmd', 'codex.exe')
$claudeNames = @('claude', 'claude.cmd', 'claude.exe', 'dsclaude')

$chain = switch ($Cli) {
    'grok'   { @('grok') }
    'codex'  { @('codex') }
    'claude' { @('claude') }
    default  { @('grok', 'codex', 'claude') }
}

# G4: snapshot + force UTF-8 console encodings.
$origConsoleIn  = [Console]::InputEncoding
$origConsoleOut = [Console]::OutputEncoding
$origPSOutput   = $OutputEncoding
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$utf8Bom   = New-Object System.Text.UTF8Encoding($true)
[Console]::InputEncoding  = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding           = $utf8NoBom

$ranWith  = $null
$attempts = @()
try {
    foreach ($candidate in $chain) {
        switch ($candidate) {
            'grok' {
                $grokCommand = Find-ReviewerCommand $grokNames
                if (-not $grokCommand) { $attempts += 'grok:not-found'; break }
                # grok reads the prompt from a file: a multi-KB contract would be
                # truncated on the Windows command line. --cwd points at the CODE
                # root, not the CreamAI scaffold, or the reviewer can only see the
                # paperwork (the same defect run-auditor.ps1 hit).
                Set-Content -Path $promptTmpPath -Value $fullPrompt -Encoding UTF8
                $grokArgs = @(
                    '--prompt-file', $promptTmpPath,
                    '--cwd', $codeRoot,
                    '--output-format', 'plain',
                    '--permission-mode', 'dontAsk',
                    '--deny', 'Write',
                    '--deny', 'Edit',
                    '--no-subagents',
                    '--max-turns', '60'
                )
                if ($Model) { $grokArgs += @('-m', $Model) }
                # G1+G2: prompt via file, no 2>&1.
                $grokOut = & $grokCommand.Source @grokArgs
                # G3: explicit exit-code check before trusting the captured report.
                if ($LASTEXITCODE -ne 0) {
                    Write-Warning "[reviewer] grok exited with code $LASTEXITCODE - trying the next reviewer."
                    $attempts += "grok:exit-$LASTEXITCODE"
                    break
                }
                $grokText = ($grokOut -join [Environment]::NewLine).Trim()
                if (-not $grokText) {
                    Write-Warning '[reviewer] grok produced no output - trying the next reviewer.'
                    $attempts += 'grok:empty'
                    break
                }
                # grok has no -o flag, so the wrapper writes the report file itself.
                [System.IO.File]::WriteAllText($outputPath, $grokText, $utf8Bom)
                [System.IO.File]::WriteAllText($stdoutLogPath, $grokText, $utf8NoBom)
                $ranWith = 'grok'
            }
            'codex' {
                $codexCommand = Find-ReviewerCommand $codexNames
                if (-not $codexCommand) { $attempts += 'codex:not-found'; break }
                # G1+G2: trailing - for stdin, no 2>&1.
                $fullPrompt | & $codexCommand.Source @codexArgs | Tee-Object -FilePath $stdoutLogPath | Out-Null
                # G3: non-zero exit (not installed properly, not logged in, rate
                # limited, network down) demotes codex and moves down the chain.
                if ($LASTEXITCODE -ne 0) {
                    Write-Warning "[reviewer] codex exited with code $LASTEXITCODE - trying the next reviewer. See $stdoutLogPath."
                    $attempts += "codex:exit-$LASTEXITCODE"
                    break
                }
                $ranWith = 'codex'
            }
            'claude' {
                $claudeCommand = Find-ReviewerCommand $claudeNames
                if (-not $claudeCommand) { $attempts += 'claude:not-found'; break }
                # The last-resort review always runs on the best reasoning model
                # unless -Model pins something else.
                $fallbackModel = if ($Model) { $Model } else { 'opus' }
                Write-Host "[reviewer] Claude ($fallbackModel) is substituting as Reviewer." -ForegroundColor Yellow
                $rawLines = $fullPrompt | & $claudeCommand.Source -p --model $fallbackModel | ForEach-Object { "$_" }
                if ($LASTEXITCODE -ne 0) {
                    $attempts += "claude:exit-$LASTEXITCODE"
                    throw "claude (Reviewer fallback) exited with code $LASTEXITCODE. See $stdoutLogPath."
                }
                $claudeText = $rawLines -join [Environment]::NewLine
                [System.IO.File]::WriteAllText($outputPath, $claudeText, $utf8Bom)
                [System.IO.File]::WriteAllText($stdoutLogPath, $claudeText, $utf8NoBom)
                $ranWith = "claude ($fallbackModel)"
            }
        }
        if ($ranWith) { break }
    }
} finally {
    # G4: always restore console encodings even on throw.
    [Console]::InputEncoding  = $origConsoleIn
    [Console]::OutputEncoding = $origConsoleOut
    $OutputEncoding           = $origPSOutput
}

if (-not $ranWith) {
    throw "No reviewer CLI could run (requested: $Cli). Attempts: $($attempts -join ', ')."
}

# The report must say who actually wrote it. The primary for -Cli auto is grok;
# anything else is a fallback and is marked, so the PM cannot mistake an Opus
# self-review for an independent one.
$primary = if ($Cli -eq 'auto') { 'grok' } else { $Cli }
if ($ranWith -ne $primary -and (Test-Path $outputPath)) {
    $marker = "<!-- role-fallback: $ranWith substituted for $primary at $timestampUtc (tried: $($attempts -join ', ')) -->"
    $existing = [System.IO.File]::ReadAllText($outputPath)
    [System.IO.File]::WriteAllText($outputPath, $marker + [Environment]::NewLine + $existing, $utf8Bom)
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
