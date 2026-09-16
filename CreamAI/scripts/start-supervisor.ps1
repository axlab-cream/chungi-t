<#
.SYNOPSIS
    Boot an interactive Claude Code session pre-loaded with the Supervisor (PM)
    role contract from agents/supervisor.md, with Researcher, Reviewer and
    Auditor registered as background agents available via /agents.

.DESCRIPTION
    Replaces the previous pipe-to-claude approach that failed with
    "InputObjectNotBound,claude" whenever the routed AOR shell had loaded the
    `claude` wrapper function from claude-integration.ps1 (the wrapper used to
    have no pipeline-accepting parameter — see task-018 for the fix).

    Current strategy:
      1. Force UTF-8 on console + PowerShell streams BEFORE touching any path.
         Korean folder paths (e.g., "C:\Users\<user>\OneDrive\바탕 화면\...")
         survive cleanly through args, prompts, and error messages.
      2. Compose the supervisor contract as an --append-system-prompt argument
         (no stdin pipe — works whether `claude` is the AOR wrapper or the raw
         native exe).
      3. Read agents/researcher.md, agents/reviewer.md and agents/auditor.md, package them as
         `claude --agents <json>` so the supervisor can dispatch them as
         background agents at the right time.
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

The audit before a completion report belongs to Grok, not to you and not to a
subagent of yours. Call CreamAI/scripts/run-auditor.ps1. The registered
`auditor` entry carries the contract text for reference; it is not a substitute
for the other engine, and an audit you performed on yourself is not an audit.
"@

# --- Native-argument escaping (Windows PowerShell 5.1) ---------------------
# Windows PowerShell 5.1 (and PowerShell 7.0-7.2, and 7.3+ under Legacy mode)
# builds a native command line by wrapping an argument that contains spaces in
# quotes WITHOUT escaping the quotes already inside it. A 6KB --agents payload
# therefore reaches claude.exe as shredded JSON and the CLI dies with
# "Invalid --agents configuration: invalid JSON: JSON Parse error: Expected '}'".
# The AOR pane runs powershell.exe 5.1, so this is the default path, not a
# corner case. PowerShell 7.3+ in Standard/Windows mode escapes correctly on
# its own; escaping there too would double the backslashes.
$script:NeedsNativeArgEscape = $true
if (Test-Path variable:PSNativeCommandArgumentPassing) {
    if ($PSNativeCommandArgumentPassing -ne 'Legacy') { $script:NeedsNativeArgEscape = $false }
}

function Test-LegacyWouldQuote {
    # Windows PowerShell 5.1 decides for itself whether to wrap a native
    # argument in quotes, and this is the rule it uses: count every " in the
    # string -- escaped or not -- and return true only if some whitespace lands
    # while that count is even. Reimplemented here because the whole escaping
    # scheme depends on which branch the host takes.
    param([string]$Value)
    $quotes = 0
    foreach ($ch in $Value.ToCharArray()) {
        if ($ch -eq [char]34) { $quotes++ }
        elseif ([char]::IsWhiteSpace($ch) -and (($quotes % 2) -eq 0)) { return $true }
    }
    return $false
}

function ConvertTo-NativeArg {
    # ONLY for arguments whose leading whitespace carries no meaning: a JSON
    # payload or prompt text. Never a path -- this may prepend a space.
    param([string]$Value)
    if (-not $script:NeedsNativeArgEscape) { return $Value }
    if ([string]::IsNullOrEmpty($Value)) { return $Value }
    # CommandLineToArgvW rules: a run of backslashes before a quote must be
    # doubled and the quote escaped.
    $escaped = [regex]::Replace($Value, '(\\*)"', '$1$1\"')

    if (-not (Test-LegacyWouldQuote $escaped)) {
        if ($escaped -notmatch '\s') {
            # No whitespace, so the host passes it unquoted and nothing can
            # split it. A bare \" outside quotes already reads as a literal ",
            # and a trailing backslash is literal too. Send it as is.
            return $escaped
        }
        # This is the case that made the first fix pass by luck. The host counts
        # every " in the string, escaped or not, and ignores whitespace that
        # lands inside an odd count -- so whether a JSON payload gets wrapped in
        # quotes comes down to how many quotes happen to precede its first
        # space. Unwrapped, the argument splits at that space and claude sees
        # shredded JSON again. A single leading space sits at quote count zero
        # and forces the wrap. Leading whitespace is insignificant in JSON and
        # in prompt text, which is the whole contract of this function.
        $escaped = ' ' + $escaped
    }

    # Wrapped by the host: double a trailing backslash run so it escapes itself
    # instead of the closing quote the host is about to append.
    return [regex]::Replace($escaped, '(\\+)$', '$1$1')
}

# --- Build the --agents JSON registry --------------------------------------
function Read-AgentMarkdown {
    param([string]$RelPath)
    $full = Join-Path $creamaiRoot $RelPath
    if (-not (Test-Path -LiteralPath $full)) { return $null }
    return (Get-Content -Raw -Encoding UTF8 -LiteralPath $full)
}

function Build-AgentEntryJson {
    # Per-leaf-string ConvertTo-Json + manual assembly — the only PS 5.1 path
    # that survives multi-KB CJK strings. See claude-integration.ps1
    # `Build-AorClaudeAgentsJson` for the underlying perf trap rationale.
    param([string]$Name, [string]$Description, [string]$Prompt)
    $n = $Name        | ConvertTo-Json -Compress
    $d = $Description | ConvertTo-Json -Compress
    $p = $Prompt      | ConvertTo-Json -Compress
    return ($n + ':{"description":' + $d + ',"prompt":' + $p + '}')
}

$agentsJson = $null
if (-not $NoAgents) {
    $researcher = Read-AgentMarkdown 'agents\researcher.md'
    $reviewer   = Read-AgentMarkdown 'agents\reviewer.md'
    $auditor    = Read-AgentMarkdown 'agents\auditor.md'
    $parts      = New-Object System.Collections.Generic.List[string]
    if ($researcher) {
        $parts.Add((Build-AgentEntryJson `
            -Name 'researcher' `
            -Description 'External documentation, API/version research, migration analysis. English output only. No code authoring.' `
            -Prompt $researcher))
    }
    if ($reviewer) {
        $parts.Add((Build-AgentEntryJson `
            -Name 'reviewer' `
            -Description 'Code review for bugs, security, Electron IPC, OWASP Top 10. Korean prose, English identifiers. No implementation.' `
            -Prompt $reviewer))
    }
    if ($auditor) {
        # Registered so the contract travels with the session. The real audit is
        # a different engine — run-auditor.ps1 — because the point of the gate is
        # that the agent who wrote the report is not the one who clears it.
        $parts.Add((Build-AgentEntryJson `
            -Name 'auditor' `
            -Description 'Audits completion claims against evidence. English output only. The real audit runs through CreamAI/scripts/run-auditor.ps1 (Grok); this entry only carries the contract. No implementation, no code-quality re-review.' `
            -Prompt $auditor))
    }
    if ($parts.Count -gt 0) {
        $agentsJson = '{' + ($parts -join ',') + '}'
    }
}

# --- Optional kickoff user message ----------------------------------------
$kickoffPrompt = "READY 응답으로 시작하세요. 다음 명령을 기다리세요."

# --- Compose claude args ---------------------------------------------------
$claudeArgs = New-Object System.Collections.Generic.List[string]
$claudeArgs.Add('--name'); $claudeArgs.Add('CreamAI PM')
$claudeArgs.Add('--append-system-prompt'); $claudeArgs.Add((ConvertTo-NativeArg $systemPrompt))
if ($agentsJson) {
    $claudeArgs.Add('--agents'); $claudeArgs.Add((ConvertTo-NativeArg $agentsJson))
}
if (-not $NoPermissionAuto) {
    $claudeArgs.Add('--permission-mode'); $claudeArgs.Add('auto')
}
if ($Dangerous) {
    $claudeArgs.Add('--dangerously-skip-permissions')
}
if ($Kickoff) {
    $claudeArgs.Add((ConvertTo-NativeArg $kickoffPrompt))
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
