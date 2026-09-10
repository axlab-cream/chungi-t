<#
.SYNOPSIS
    Boot an interactive Claude Code session pre-loaded with the Supervisor (PM)
    role contract from agents/supervisor.md, with Researcher and Reviewer
    registered as background agents available via /agents.

.DESCRIPTION
    Replaces the previous pipe-to-claude approach that failed with
    "InputObjectNotBound,claude" whenever the routed AOR shell had loaded the
    `claude` wrapper function from claude-integration.ps1 (the wrapper used to
    have no pipeline-accepting parameter — see task-018 for the fix).

    Current strategy:
      1. Force UTF-8 on console + PowerShell streams BEFORE touching any path.
         Korean folder paths (e.g., "C:\Users\<user>\OneDrive\바탕 화면\...")
         survive cleanly through args, prompts, and error messages.
      2. Write the supervisor contract to CreamAI/logs/supervisor-system-prompt.md
         and pass only a short single-line file pointer via --append-system-prompt.
         Multi-KB CJK text never rides the command line (task-021: .cmd shim
         newline splitting leaked the prompt into the terminal as mojibake).
      3. Write agents/researcher.md and agents/reviewer.md into
         .claude/agents/*.md so Claude Code auto-loads them as project agents.
      4. Start Claude in interactive mode without an initial model request by
         default. This avoids a blank-looking terminal while Claude is doing
         first-turn file reads or permission checks. Use -Kickoff to send the
         old READY prompt explicitly.

.PARAMETER Role
    Role label injected into the kickoff prompt header. Default: "CreamAI PM / Supervisor".

.PARAMETER ContractPath
    Path to the supervisor contract markdown. Default: "agents\supervisor.md"
    relative to repo root.

.PARAMETER NoAgents
    Skip --agents registration (use if a project doesn't ship the agents/
    folder, or for debugging the system-prompt path in isolation).

.PARAMETER Dangerous
    Pass --dangerously-skip-permissions through to claude. Off by default.

.PARAMETER Kickoff
    Send a tiny READY prompt as the first user message. Off by default so the
    Claude TUI appears immediately and the user can type the task directly.

.PARAMETER NoPermissionAuto
    Do not pass --permission-mode auto. By default the supervisor starts in
    Claude Code auto permission mode, matching the AIOps RUN TEAM workflow.

.EXAMPLE
    .\scripts\start-supervisor.ps1

.EXAMPLE
    .\scripts\start-supervisor.ps1 -Dangerous
#>
[CmdletBinding()]
param(
    [string] $Role         = "CreamAI PM / Supervisor",
    [string] $ContractPath = "",
    [switch] $NoAgents,
    [switch] $Dangerous,
    [switch] $Kickoff,
    [switch] $NoPermissionAuto
)

$ErrorActionPreference = "Stop"

# --- UTF-8 fortification ---------------------------------------------------
# Must run before any Get-Content / arg-passing / console write touches a
# Korean path. Idempotent: if the routed AOR shell already set this up,
# re-applying is a no-op. If this script was invoked from a vanilla
# PowerShell (e.g., a fresh Run dialog), we set it ourselves.
try {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [Console]::InputEncoding  = $utf8NoBom
    [Console]::OutputEncoding = $utf8NoBom
    $global:OutputEncoding    = $utf8NoBom
    if (-not $env:__AOR_CHCP_DONE) {
        & chcp.com 65001 2>&1 | Out-Null
        $env:__AOR_CHCP_DONE = '1'
    }
} catch {}

function Get-ClaudeOauthState {
    $state = [ordered]@{
        Found            = $false
        IsExpired        = $false
        ExpiresAt        = [long]0
        SubscriptionType = 'unknown'
    }
    $globalCreds = Join-Path $HOME '.claude\.credentials.json'
    if (-not (Test-Path -LiteralPath $globalCreds)) { return $state }
    try {
        $raw = Get-Content -LiteralPath $globalCreds -Raw -Encoding UTF8 -ErrorAction Stop
        if (-not $raw.Trim()) { return $state }
        $creds = $raw | ConvertFrom-Json -ErrorAction Stop
        $oauthProp = $creds.PSObject.Properties | Where-Object { $_.Name -eq 'claudeAiOauth' } | Select-Object -First 1
        if (-not $oauthProp -or -not $oauthProp.Value) { return $state }
        $oauth = $oauthProp.Value
        $accessProp = $oauth.PSObject.Properties | Where-Object { $_.Name -eq 'accessToken' } | Select-Object -First 1
        if (-not $accessProp -or -not $accessProp.Value) { return $state }
        $state.Found = $true
        $expiresProp = $oauth.PSObject.Properties | Where-Object { $_.Name -eq 'expiresAt' } | Select-Object -First 1
        if ($expiresProp -and $expiresProp.Value) {
            $expiresMs = [long]$expiresProp.Value
            $state.ExpiresAt = $expiresMs
            $state.IsExpired = ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() -gt $expiresMs)
        }
        $subProp = $oauth.PSObject.Properties | Where-Object { $_.Name -eq 'subscriptionType' } | Select-Object -First 1
        if ($subProp -and $subProp.Value) { $state.SubscriptionType = [string]$subProp.Value }
    } catch {}
    return $state
}

function Stop-IfClaudeAuthUnavailable {
    $auth = Get-ClaudeOauthState
    if ($auth.Found -and -not $auth.IsExpired) { return }
    Write-Host ''
    if (-not $auth.Found) {
        Write-Host '[CreamAI] Claude Code 로그인 정보가 없습니다.' -ForegroundColor Yellow
    } else {
        Write-Host '[CreamAI] Claude Code OAuth 토큰이 만료되었습니다.' -ForegroundColor Yellow
    }
    Write-Host '[CreamAI] 먼저 이 터미널에서 아래 명령을 실행해 로그인/재인증을 완료하세요.' -ForegroundColor Yellow
    Write-Host '  claude' -ForegroundColor Cyan
    Write-Host '[CreamAI] 인증이 끝난 뒤 AIOps 버튼을 다시 누르면 RUN TEAM이 시작됩니다.' -ForegroundColor Yellow
    exit 2
}

# --- Path resolution -------------------------------------------------------
$creamaiRoot = Split-Path -Parent $PSScriptRoot
if ((Split-Path -Leaf $creamaiRoot) -ieq 'CreamAI') {
    $projectRoot = Split-Path -Parent $creamaiRoot
} else {
    $projectRoot = $creamaiRoot
}
Set-Location -LiteralPath $projectRoot
Stop-IfClaudeAuthUnavailable

if (-not $ContractPath) {
    $ContractPath = Join-Path $creamaiRoot "agents\supervisor.md"
}
if (-not (Test-Path -LiteralPath $ContractPath)) {
    throw "Contract file not found: $ContractPath"
}

$contract = Get-Content -Raw -Encoding UTF8 -LiteralPath $ContractPath
$claudeMdPath = Join-Path $creamaiRoot "CLAUDE.md"
$claudeMd = ""
if (Test-Path -LiteralPath $claudeMdPath) {
    $claudeMd = Get-Content -Raw -Encoding UTF8 -LiteralPath $claudeMdPath
}

# --- Build the system prompt (contract + role framing) ---------------------
$systemPrompt = @"
You are the CreamAI supervisor session.
Role: $Role
Project root: $projectRoot
CreamAI root: $creamaiRoot

Before acting on the user's terminal work instruction, compare the selected
Project root above with the requested project/service/context in the
instruction. If they appear different, stop and ask exactly:
프로젝트가 다릅니다. 그대로 진행하시겠습니까?

ONE_TASK_GATE:
- If the user asks for multiple fixes, phases, or "do everything", convert the
  request into a visible Task queue/backlog first.
- Execute exactly one implementation Task in the current run: choose the first
  actionable Task, finish it or mark it blocked, then stop.
- Do not start the next Task until the user explicitly types `다음`, `진행`, or
  `Continue`.
- If the session is resumed after an unexpected Claude exit, inspect the last
  Task state first and continue only that one Task. Do not recreate a broad
  multi-Task batch.

At the end of every Task or blocked handoff, read
CreamAI/workflows/task-completion-brief.md and print its checkbox
`Task 완료 브리핑` in the terminal before asking the user to approve the next
step. Mark `[x]` only for stages actually performed in that Task.

The following file is your role contract. Treat it as system context and
apply it to every user request in this session.

--- agents/supervisor.md ---
$contract
--- end contract ---

The following CreamAI CLAUDE.md rules are project-local operating context.

--- CreamAI/CLAUDE.md ---
$claudeMd
--- end CLAUDE.md ---

Use /agents to dispatch `researcher` for external/API/version research and
`reviewer` for important or security-sensitive code changes. Keep all AIOps
state and logs under the AIOps workspace folder.
"@

# --- Register team agents as project agent files (.claude/agents) ----------
# task-021: multi-KB CJK strings passed as native command-line arguments can
# (a) leak the full prompt into the terminal as typed input when `claude`
#     resolves to a .cmd shim (embedded newlines split the command line),
# (b) render as cp949 mojibake in the console, and
# (c) exceed the Windows 32K command-line limit.
# Files never ride the command line, so they are immune to all three.
function Read-AgentMarkdown {
    param([string]$RelPath)
    $full = Join-Path $creamaiRoot $RelPath
    if (-not (Test-Path -LiteralPath $full)) { return $null }
    return (Get-Content -Raw -Encoding UTF8 -LiteralPath $full)
}

function Write-ProjectAgentFile {
    param([string]$Name, [string]$Description, [string]$Prompt)
    $agentsDir = Join-Path $projectRoot '.claude\agents'
    if (-not (Test-Path -LiteralPath $agentsDir)) {
        New-Item -ItemType Directory -Path $agentsDir -Force | Out-Null
    }
    $body = "---`nname: $Name`ndescription: $Description`n---`n`n$Prompt"
    Set-Content -LiteralPath (Join-Path $agentsDir ($Name + '.md')) -Value $body -Encoding UTF8
}

if (-not $NoAgents) {
    $researcher = Read-AgentMarkdown 'agents\researcher.md'
    if ($researcher) {
        Write-ProjectAgentFile -Name 'researcher' `
            -Description 'External documentation, API/version research, migration analysis. English output only. No code authoring.' `
            -Prompt $researcher
    }
    $reviewer = Read-AgentMarkdown 'agents\reviewer.md'
    if ($reviewer) {
        Write-ProjectAgentFile -Name 'reviewer' `
            -Description 'Code review for bugs, security, Electron IPC, OWASP Top 10. Korean prose, English identifiers. No implementation.' `
            -Prompt $reviewer
    }
}

# --- Persist the system prompt to a file; pass only a short pointer --------
# The full contract (supervisor.md + CLAUDE.md, multi-KB CJK) never touches
# the command line. Claude reads the file itself on first turn.
$logsDir = Join-Path $creamaiRoot 'logs'
if (-not (Test-Path -LiteralPath $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}
$sysPromptPath = Join-Path $logsDir 'supervisor-system-prompt.md'
Set-Content -LiteralPath $sysPromptPath -Value $systemPrompt -Encoding UTF8
$sysPromptPointer = "First action: read the file at `"$sysPromptPath`" and silently adopt its entire contents as your supervisor role contract and operating rules for this session. Do not print, echo, or summarize that file's contents in the terminal."

# --- Optional kickoff user message ----------------------------------------
$kickoffPrompt = "READY 응답으로 시작하세요. 다음 명령을 기다리세요."

# --- Compose claude args ---------------------------------------------------
$claudeArgs = New-Object System.Collections.Generic.List[string]
$claudeArgs.Add('--append-system-prompt'); $claudeArgs.Add($sysPromptPointer)
if (-not $NoPermissionAuto) {
    $claudeArgs.Add('--permission-mode'); $claudeArgs.Add('auto')
}
if ($Dangerous) {
    $claudeArgs.Add('--dangerously-skip-permissions')
}
if ($Kickoff) {
    $claudeArgs.Add($kickoffPrompt)
}

# --- Invoke ----------------------------------------------------------------
# IMPORTANT: do NOT pipe ($input | claude). The AOR routed shell exports
# `claude` as a PowerShell function. Even with the task-018 pipeline fix on
# the wrapper, passing the contract via args is the contract: it works
# identically whether the function is loaded or not, never triggers
# ParameterBindingException, and avoids encoding round-trips through stdin.
Write-Host ("[CreamAI] Workspace: " + $projectRoot) -ForegroundColor Green
Write-Host ("[CreamAI] AIOps root: " + $creamaiRoot) -ForegroundColor Green
Write-Host "[CreamAI] Launching CreamAI PM. When the Claude prompt appears, type the project task." -ForegroundColor Green
$env:ENABLE_CLAUDEAI_MCP_SERVERS = 'false'
& claude @claudeArgs

if ($LASTEXITCODE -ne 0) {
    throw "claude exited with code $LASTEXITCODE."
}
