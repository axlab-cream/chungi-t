<#
.SYNOPSIS
    Dispatch a research task to Antigravity CLI (Researcher Agent) following the
    contract in agents/researcher.md, and save the cleaned output to logs/research/.

.DESCRIPTION
    Wraps the agy CLI so that:
      1. agents/researcher.md is always prepended to the prompt (auto-load contract).
      2. A real ISO-8601 UTC timestamp and task-id are injected by the PM, not by the LLM.
      3. CLI noise lines (true color warning, ripgrep fallback, tool errors) are stripped
         from the captured output. Everything before the first Markdown H1 is dropped.
      4. The cleaned report is written to logs/research/<task-id>_<slug>.md.

.PARAMETER TaskId
    Backlog task identifier, e.g. "task-003".

.PARAMETER Slug
    Short kebab-case slug describing the research target, e.g. "electron-migration".

.PARAMETER PromptFile
    Path to the user-authored prompt body file (the [TASK] / [DELIVERABLE] block).

.PARAMETER Model
    Optional Antigravity model override. If omitted, uses agy default.

.EXAMPLE
    .\scripts\run-researcher.ps1 -TaskId task-003 -Slug node-pty-abi `
        -PromptFile .\logs\research\_prompt_task-003.txt
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
$contractPath  = Join-Path $projectRoot "agents\researcher.md"
$researchDir   = Join-Path $projectRoot "logs\research"
$outputPath    = Join-Path $researchDir ("{0}_{1}.md" -f $TaskId, $Slug)
$timestampUtc  = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

if (-not (Test-Path $contractPath)) {
    throw "Contract file not found: $contractPath"
}
if (-not (Test-Path $PromptFile)) {
    throw "Prompt file not found: $PromptFile"
}
if (-not (Test-Path $researchDir)) {
    New-Item -ItemType Directory -Path $researchDir -Force | Out-Null
}

$contract = Get-Content -Raw -Encoding UTF8 $contractPath
$body     = Get-Content -Raw -Encoding UTF8 $PromptFile

$header = @"
[FROM] Claude Code (PM) at creamai-cli
[TO] Antigravity CLI (Researcher Agent)
[TASK ID] $TaskId
[DISPATCHED AT] $timestampUtc

[CONTRACT — agents/researcher.md, follow exactly]
$contract

[PM INSTRUCTIONS]
- Use the [DISPATCHED AT] timestamp above as your "조사 시점"; do NOT invent a different one.
- Output ONLY the Markdown report described below. No preface, no closing remarks.
- Do not run shell commands or grep on this repository — work from the [CONTEXT] block alone.

[TASK BODY]
"@

$fullPrompt = $header + "`n" + $body

## ----------------------------------------------------------------------------
## Wrapper Guards (task-010 / task-013) — keep these guards in sync between
## run-researcher.ps1 and run-reviewer.ps1 even if the surrounding logic diverges.
##
## G1. CLI-arg compatibility (CLI-specific) — REVISED by task-007 (2026-09-14):
##     The prompt goes on stdin with NO `-p`/`--print` flag. The old `-p " "`
##     placeholder is DEAD: agy validates the -p value and exits 1 with
##     "Error: empty prompt" before reading stdin. The prompt cannot go in argv
##     either (PS 5.1 strips quotes from native arguments).
##     Guards: tests/unit/researcher-agy-invocation.test.js (static) and
##     CreamAI/evals/regression/agy-stdin-canary.ps1 (live).
## G2. Stderr isolation (PowerShell 5.1):
##     Do NOT use `2>&1` on native CLIs. PS 5.1 wraps each stderr line as a
##     NativeCommandError record; combined with $ErrorActionPreference = "Stop"
##     this aborts the script on benign warnings.
##     Stdout alone carries the model output.
## G3. Exit-code verification:
##     `$ErrorActionPreference = "Stop"` only escalates cmdlet errors, NOT a native
##     CLI's non-zero exit. Always check `$LASTEXITCODE` after the call so silent
##     CLI failures surface as wrapper failures.
## G4. UTF-8 console pipe (task-013):
##     Windows non-en-US hosts default to OEM codepage (e.g. cp949 on Korean
##     Windows). [Console]::InputEncoding / OutputEncoding / $OutputEncoding
##     only change how .NET-side PowerShell encodes strings; they do NOT change
##     the Win32 console codepage that child processes inherit. When agy.exe
##     writes Korean UTF-8 bytes, the Win32 console pipe transcodes via the
##     active console CP — characters absent in cp949 become '?'.
##     Fix: also change the actual Win32 console CP via SetConsoleCP /
##     SetConsoleOutputCP for the duration of the call, then restore.
## ----------------------------------------------------------------------------

function Update-ProcessPathFromRegistry {
    $pathParts = @()
    foreach ($scope in @('Machine', 'User', 'Process')) {
        try {
            $value = [System.Environment]::GetEnvironmentVariable('Path', $scope)
            if ($value) { $pathParts += ($value -split [System.IO.Path]::PathSeparator) }
        } catch {}
    }

    $extraCandidates = @()
    if ($env:LOCALAPPDATA) {
        $extraCandidates += @(
            (Join-Path $env:LOCALAPPDATA 'Programs\Google\Antigravity\bin'),
            (Join-Path $env:LOCALAPPDATA 'Google\Antigravity\bin'),
            (Join-Path $env:LOCALAPPDATA 'antigravity\bin'),
            (Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps')
        )
    }
    if ($env:USERPROFILE) {
        $extraCandidates += @(
            (Join-Path $env:USERPROFILE '.antigravity\bin'),
            (Join-Path $env:USERPROFILE '.local\bin')
        )
    }
    foreach ($candidate in $extraCandidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) { $pathParts += $candidate }
    }

    $seen = @{}
    $clean = @()
    foreach ($part in $pathParts) {
        if (-not $part) { continue }
        $trimmed = $part.Trim()
        if (-not $trimmed) { continue }
        $key = $trimmed.TrimEnd('\').ToLowerInvariant()
        if ($seen.ContainsKey($key)) { continue }
        $seen[$key] = $true
        $clean += $trimmed
    }
    if ($clean.Count -gt 0) {
        [System.Environment]::SetEnvironmentVariable('Path', ($clean -join [System.IO.Path]::PathSeparator), 'Process')
    }
}

function Find-AntigravityCommand {
    $cmd = Get-Command agy -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd }

    Update-ProcessPathFromRegistry
    $cmd = Get-Command agy -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd }

    $fileCandidates = @()
    if ($env:LOCALAPPDATA) {
        $fileCandidates += @(
            (Join-Path $env:LOCALAPPDATA 'Programs\Google\Antigravity\bin\agy.exe'),
            (Join-Path $env:LOCALAPPDATA 'Google\Antigravity\bin\agy.exe'),
            (Join-Path $env:LOCALAPPDATA 'antigravity\bin\agy.exe'),
            (Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\agy.exe'),
            (Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\agy.cmd')
        )
    }
    if ($env:USERPROFILE) {
        $fileCandidates += @(
            (Join-Path $env:USERPROFILE '.antigravity\bin\agy.exe'),
            (Join-Path $env:USERPROFILE '.antigravity\bin\agy.cmd'),
            (Join-Path $env:USERPROFILE '.local\bin\agy'),
            (Join-Path $env:USERPROFILE '.local\bin\agy.cmd')
        )
    }

    foreach ($candidate in $fileCandidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) {
            try { return Get-Command $candidate -ErrorAction Stop } catch {}
        }
    }
    return $null
}

function Install-AntigravityCli {
    $isWindowsHost = ($env:OS -eq 'Windows_NT') -or (-not $PSVersionTable.ContainsKey('Platform')) -or ($PSVersionTable.Platform -eq 'Win32NT')
    Write-Host "[researcher] Antigravity CLI (agy) not found; installing Google Antigravity CLI..." -ForegroundColor Yellow

    if ($isWindowsHost) {
        $installUri = 'https://antigravity.google/cli/install.ps1'
        try {
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls11 -bor [System.Net.SecurityProtocolType]::Tls
        } catch {}
        $installScript = Invoke-RestMethod -Uri $installUri -UseBasicParsing
        if ([string]::IsNullOrWhiteSpace($installScript)) {
            throw "Downloaded Antigravity installer was empty: $installUri"
        }
        Invoke-Expression $installScript
    } else {
        $bash = Get-Command bash -ErrorAction SilentlyContinue
        $curl = Get-Command curl -ErrorAction SilentlyContinue
        if (-not $bash -or -not $curl) {
            throw "Antigravity CLI command 'agy' was not found, and auto-install on this OS requires bash and curl."
        }
        & $bash.Source -lc 'curl -fsSL https://antigravity.google/cli/install.sh | bash'
        if ($LASTEXITCODE -ne 0) {
            throw "Antigravity CLI install.sh exited with code $LASTEXITCODE."
        }
    }

    Update-ProcessPathFromRegistry
}

function Resolve-AntigravityCommand {
    $cmd = Find-AntigravityCommand
    if ($cmd) { return $cmd }

    Install-AntigravityCli

    $cmd = Find-AntigravityCommand
    if ($cmd) {
        Write-Host "[researcher] Antigravity CLI ready: $($cmd.Source)" -ForegroundColor Green
        return $cmd
    }

    throw "Antigravity CLI installation finished, but 'agy' was still not found in PATH. Open a new shell or add the Antigravity bin folder to PATH, then run this script again."
}

# G4: snapshot + force UTF-8 across both .NET Console wrappers AND Win32 console CP.
# Note (task-013 finding): on this shell context the underlying mojibake of
# Korean characters originates UPSTREAM of this wrapper (AOR routing layer
# inheriting cp949 console). G4 still defends against the simpler "PS pipe
# transcodes via $OutputEncoding" pitfall, but full Korean fidelity also
# requires invoking this wrapper from a non-AOR-routed shell — see
# backlog/task-013.md "Residual Risk" section.
if (-not ([System.Management.Automation.PSTypeName]'Cos.Win32Console').Type) {
    Add-Type -Namespace 'Cos' -Name 'Win32Console' -MemberDefinition @'
[System.Runtime.InteropServices.DllImport("kernel32.dll")]
public static extern uint GetConsoleCP();
[System.Runtime.InteropServices.DllImport("kernel32.dll")]
public static extern uint GetConsoleOutputCP();
[System.Runtime.InteropServices.DllImport("kernel32.dll")]
public static extern bool SetConsoleCP(uint cp);
[System.Runtime.InteropServices.DllImport("kernel32.dll")]
public static extern bool SetConsoleOutputCP(uint cp);
'@
}
$origConsoleIn  = [Console]::InputEncoding
$origConsoleOut = [Console]::OutputEncoding
$origPSOutput   = $OutputEncoding
$origWin32In    = [Cos.Win32Console]::GetConsoleCP()
$origWin32Out   = [Cos.Win32Console]::GetConsoleOutputCP()
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding  = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding           = $utf8NoBom
[Cos.Win32Console]::SetConsoleCP(65001)       | Out-Null
[Cos.Win32Console]::SetConsoleOutputCP(65001) | Out-Null
try {
    $agyCommand = Resolve-AntigravityCommand
    # G1+G2: prompt on stdin with NO -p/--print, no `2>&1`.
    #   agy validates the -p/--print value and exits 1 with "Error: empty prompt" before it
    #   reads stdin, so the old `-p " "` placeholder made every research run fail (task-007,
    #   same defect CARROTCAP fixed on 2026-09-04). The whole prompt cannot go in argv either:
    #   Windows PowerShell 5.1 strips quotes from native arguments.
    #   Guarded by tests/unit/researcher-agy-invocation.test.js.
    $rawLines = $fullPrompt | & $agyCommand.Source | ForEach-Object { "$_" }
    # G3: explicit exit-code check.
    if ($LASTEXITCODE -ne 0) {
        throw "agy exited with code $LASTEXITCODE. Raw stdout (for diagnosis):`n$($rawLines -join "`n")"
    }
} finally {
    # G4: always restore console encodings (.NET + Win32) even on throw.
    [Console]::InputEncoding  = $origConsoleIn
    [Console]::OutputEncoding = $origConsoleOut
    $OutputEncoding           = $origPSOutput
    [Cos.Win32Console]::SetConsoleCP($origWin32In)        | Out-Null
    [Cos.Win32Console]::SetConsoleOutputCP($origWin32Out) | Out-Null
}

# Strip leading noise: drop everything before the first Markdown H1.
$startIdx = -1
for ($i = 0; $i -lt $rawLines.Count; $i++) {
    if ($rawLines[$i] -match "^# ") { $startIdx = $i; break }
}
if ($startIdx -lt 0) {
    Write-Warning "No Markdown H1 found in Antigravity output — saving raw."
    $cleaned = $rawLines
} else {
    $cleaned = $rawLines[$startIdx..($rawLines.Count - 1)]
}

# Write UTF-8 with BOM (per global encoding rule for .md files).
$utf8Bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($outputPath, ($cleaned -join "`r`n"), $utf8Bom)

Write-Host "[researcher] saved: $outputPath" -ForegroundColor Green
Write-Host "[researcher] task-id: $TaskId  dispatched-at: $timestampUtc"
