<#
.SYNOPSIS
    Dispatch a code review task to Codex (Reviewer Agent) following the
    contract in agents/reviewer.md, and save the structured report to logs/review/.

.DESCRIPTION
    Wraps the codex CLI so that:
      1. agents/reviewer.md is always prepended to the prompt (auto-load contract).
      2. A real ISO-8601 UTC timestamp and task-id are injected by the PM, not by the LLM.
      3. Codex runs with --skip-git-repo-check --sandbox read-only and -C set to the
         CODE root (the parent of the CreamAI scaffold, when there is one), so it can
         read the source it is reviewing but cannot mutate it.
      4. The structured "last message" is written via -o to logs/review/<task-id>_<slug>.md.
         Codex's verbose stdout (model header, token counts) is captured separately to
         logs/review/<task-id>_<slug>.codex-stdout.log for debugging.

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
# The contract and the logs live under the AIOps root; the code being reviewed
# does not. In a scaffolded project that root is <repo>/CreamAI, so -C $projectRoot
# gave codex a read-only sandbox containing the paperwork and none of the source.
# Every review run that way was blind to the change it was reviewing.
$codeRoot      = if ((Split-Path -Leaf $projectRoot) -eq 'CreamAI') {
    Split-Path -Parent $projectRoot
} else {
    $projectRoot
}
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
    "-C", $codeRoot,
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

# G4: snapshot + force UTF-8 console encodings.
$origConsoleIn  = [Console]::InputEncoding
$origConsoleOut = [Console]::OutputEncoding
$origPSOutput   = $OutputEncoding
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding  = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding           = $utf8NoBom
try {
    # G1+G2: trailing `-` for stdin, no `2>&1`.
    $fullPrompt | & codex @codexArgs | Tee-Object -FilePath $stdoutLogPath | Out-Null
    # G3: explicit exit-code check before downstream output validation.
    if ($LASTEXITCODE -ne 0) {
        throw "codex exited with code $LASTEXITCODE. See $stdoutLogPath for full output."
    }
} finally {
    # G4: always restore console encodings even on throw.
    [Console]::InputEncoding  = $origConsoleIn
    [Console]::OutputEncoding = $origConsoleOut
    $OutputEncoding           = $origPSOutput
}

if (-not (Test-Path $outputPath)) {
    throw "Codex did not produce output file: $outputPath. See $stdoutLogPath."
}

# Re-write output as UTF-8 with BOM (per global encoding rule for .md files).
$content = Get-Content -Raw -Encoding UTF8 $outputPath
$utf8Bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($outputPath, $content, $utf8Bom)

Write-Host "[reviewer] saved: $outputPath" -ForegroundColor Green
Write-Host "[reviewer] stdout log: $stdoutLogPath" -ForegroundColor DarkGray
Write-Host "[reviewer] task-id: $TaskId  dispatched-at: $timestampUtc"
