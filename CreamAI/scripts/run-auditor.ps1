<#
.SYNOPSIS
    Dispatch an audit task to Grok (Auditor Agent) following the contract in
    agents/auditor.md, and save the structured report to logs/audit/.

.DESCRIPTION
    Wraps the grok CLI so that:
      1. agents/auditor.md is always prepended to the prompt (auto-load contract).
      2. A real ISO-8601 UTC timestamp and task-id are injected by the PM, not by
         the LLM.
      3. grok runs single-turn with --cwd at the CODE root (the parent of the
         CreamAI scaffold, when there is one) so it can actually read the code
         it is auditing, not just the paperwork.
      4. The report is captured from stdout to logs/audit/<task-id>_<slug>.md,
         and the run fails if there is no report, or if the working tree moved.

    Grok has no `-o` flag, so unlike run-reviewer.ps1 the report comes back
    through the console pipe. That is the cp949 mojibake path (task-013), which
    is why G4 below forces UTF-8 and why agents/auditor.md requires English.

.PARAMETER TaskId
    Backlog task identifier, e.g. "task-003".

.PARAMETER Slug
    Short kebab-case slug describing the audit target, e.g. "ipc-validation".

.PARAMETER PromptFile
    Path to the user-authored prompt body file (the claims to audit).

.PARAMETER Model
    Optional Grok model override (passes through as -m).

.EXAMPLE
    .\scripts\run-auditor.ps1 -TaskId task-003 -Slug ipc-validation `
        -PromptFile .\logs\audit\_prompt_task-003.txt
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
# The contract and the logs live under the AIOps root; the code being audited
# does not. In a scaffolded project that root is <repo>/CreamAI, so pointing the
# CLI at $projectRoot gives it a view of the paperwork and none of the code —
# the first real run reported "Grep was scoped to CreamAI" and gave up.
$codeRoot      = if ((Split-Path -Leaf $projectRoot) -eq 'CreamAI') {
    Split-Path -Parent $projectRoot
} else {
    $projectRoot
}
$contractPath  = Join-Path $projectRoot "agents\auditor.md"
$auditDir      = Join-Path $projectRoot "logs\audit"
$outputPath    = Join-Path $auditDir ("{0}_{1}.md" -f $TaskId, $Slug)
$promptTmpPath = Join-Path $auditDir ("{0}_{1}.grok-prompt.txt" -f $TaskId, $Slug)
$timestampUtc  = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

if (-not (Test-Path $contractPath)) {
    throw "Contract file not found: $contractPath"
}
if (-not (Test-Path $PromptFile)) {
    throw "Prompt file not found: $PromptFile"
}
if (-not (Test-Path $auditDir)) {
    New-Item -ItemType Directory -Path $auditDir -Force | Out-Null
}

$contract = Get-Content -Raw -Encoding UTF8 $contractPath
$body     = Get-Content -Raw -Encoding UTF8 $PromptFile

$header = @"
[FROM] Claude Code (PM) at creamai-cli
[TO] Grok (Auditor Agent)
[TASK ID] $TaskId
[DISPATCHED AT] $timestampUtc

[CONTRACT - agents/auditor.md, follow exactly]
$contract

[PM INSTRUCTIONS]
- Use the [DISPATCHED AT] timestamp above as your audit time; do NOT invent one.
- Output ONLY the structured Markdown report described in the contract. No
  preface, no routing header, no closing remarks, no diff.
- Write the report in English.
- You may read files under the project root. Do NOT modify any file.

[TASK BODY]
"@

$fullPrompt = $header + "`n" + $body

# grok reads the prompt from a file rather than stdin: --prompt-file keeps a
# multi-KB contract off the command line, where Windows would truncate it.
Set-Content -Path $promptTmpPath -Value $fullPrompt -Encoding UTF8

$grokArgs = @(
    "--prompt-file", $promptTmpPath,
    "--cwd", $codeRoot,
    "--output-format", "plain",
    # dontAsk, not plan. Plan mode starves the auditor: on a real multi-file
    # audit it stopped after two sentences of preamble without reading anything.
    # An audit that cannot open files is worse than no audit, because it still
    # produces a file that looks like one.
    #
    # --deny is a hint only — grok accepts unknown rule names silently, so it
    # cannot be the guarantee. The guarantee is the working-tree check below:
    # if the auditor changed anything, the run fails and says what changed.
    "--permission-mode", "dontAsk",
    "--deny", "Write",
    "--deny", "Edit",
    "--no-subagents",
    # The default turn budget cuts a multi-file audit off after a few lines of
    # preamble. 60 is enough to read a change set and still bounded.
    "--max-turns", "60"
)

# Read-only is enforced, not requested: snapshot the working tree so a write
# cannot pass unnoticed. Non-git projects get a warning instead of a guarantee.
$isGitRepo = $false
$treeBefore = $null
Push-Location $codeRoot
try {
    & git rev-parse --is-inside-work-tree 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $isGitRepo = $true
        $treeBefore = (& git status --porcelain) -join "`n"
    }
} catch { $isGitRepo = $false }
finally { Pop-Location }
if (-not $isGitRepo) {
    Write-Host "[auditor] not a git repo — cannot verify the audit stayed read-only" -ForegroundColor Yellow
}
if ($Model) {
    $grokArgs += @("-m", $Model)
}

## ----------------------------------------------------------------------------
## Wrapper Guards (task-010 / task-013) — keep these guards in sync with
## run-researcher.ps1 and run-reviewer.ps1 even if the surrounding logic diverges.
##
## G1. CLI-arg compatibility (CLI-specific):
##     grok takes the prompt via --prompt-file, so there is no stdin `-` and no
##     empty-string -p trap. The prompt file is written next to the report.
## G2. Stderr isolation (PowerShell 5.1):
##     Do NOT use `2>&1` on native CLIs. PS 5.1 wraps each stderr line as a
##     NativeCommandError record; with $ErrorActionPreference = "Stop" that
##     aborts the script on benign warnings. grok's stderr goes to the console.
## G3. Exit-code verification:
##     `$ErrorActionPreference = "Stop"` does not escalate a native CLI's
##     non-zero exit. Check $LASTEXITCODE before trusting the output.
## G4. UTF-8 console pipe (task-013):
##     The report itself comes through this pipe — grok has no -o. On a Korean
##     Windows host the console is cp949 and would mangle every non-ASCII
##     character in the report, not just a debug log. Force UTF-8 and restore
##     in `finally`.
## ----------------------------------------------------------------------------

# G4: snapshot + force UTF-8 console encodings.
$origConsoleIn  = [Console]::InputEncoding
$origConsoleOut = [Console]::OutputEncoding
$origPSOutput   = $OutputEncoding
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding  = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding           = $utf8NoBom
try {
    # G1+G2: prompt via file, no `2>&1`.
    $report = & grok @grokArgs
    # G3: explicit exit-code check before trusting the captured report.
    if ($LASTEXITCODE -ne 0) {
        throw "grok exited with code $LASTEXITCODE. No audit report written."
    }
} finally {
    # G4: always restore console encodings even on throw.
    [Console]::InputEncoding  = $origConsoleIn
    [Console]::OutputEncoding = $origConsoleOut
    $OutputEncoding           = $origPSOutput
}

$reportText = ($report -join "`n").Trim()
if (-not $reportText) {
    throw "grok produced no output. No audit report written."
}

# The contract says "no preface", and grok still opens with a sentence about
# what it is about to read — sometimes glued to the heading with no newline
# ("...not the claims.# Audit Report"). A line-anchored ^# does not find that,
# so cut at the heading text itself and fall back to any H1. If neither is
# present the agent ignored the format; keep the text whole rather than
# guessing, and let the PM see what came back.
$cut = [regex]::Match($reportText, '#+\s*Audit Report')
if (-not $cut.Success) {
    $cut = [regex]::Match($reportText, '(?m)^#\s')
}
if ($cut.Success -and $cut.Index -gt 0) {
    Write-Host ("[auditor] trimmed {0} chars of preface before the heading" -f $cut.Index) -ForegroundColor DarkGray
    $reportText = $reportText.Substring($cut.Index).Trim()
}

# No heading means no report. grok exits 0 after emitting only "I'll audit the
# three commits..." and nothing else, and saving that as an audit is the exact
# unverified-claim failure this agent exists to catch. Fail instead, and keep
# the stub next to the prompt so the operator can see what came back.
if (-not $cut.Success) {
    $stubPath = Join-Path $auditDir ("{0}_{1}.no-report.txt" -f $TaskId, $Slug)
    [System.IO.File]::WriteAllText($stubPath, $reportText, $utf8NoBom)
    throw "grok returned no audit report (no heading found). Raw output kept at $stubPath. Do NOT treat the claims as audited."
}

# Enforce read-only: compare the working tree to the snapshot taken before the run.
if ($isGitRepo) {
    Push-Location $codeRoot
    try { $treeAfter = (& git status --porcelain) -join "`n" } finally { Pop-Location }
    if ($treeAfter -ne $treeBefore) {
        $stubPath = Join-Path $auditDir ("{0}_{1}.tainted.md" -f $TaskId, $Slug)
        [System.IO.File]::WriteAllText($stubPath, $reportText, $utf8NoBom)
        throw "The auditor modified the working tree. The audit is void; report kept at $stubPath. Inspect `git status` and revert before trusting anything."
    }
}

# Per the global encoding rule, .md files are UTF-8 with BOM.
$utf8Bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($outputPath, $reportText + "`n", $utf8Bom)

# The prompt file carries the whole contract and the PM's claims. It is useful
# while debugging a bad audit and useless afterwards; keep it, but keep it
# obviously derived so nobody mistakes it for a report.
Write-Host "[auditor] saved: $outputPath" -ForegroundColor Green
Write-Host "[auditor] prompt: $promptTmpPath" -ForegroundColor DarkGray
Write-Host "[auditor] task-id: $TaskId  dispatched-at: $timestampUtc"
