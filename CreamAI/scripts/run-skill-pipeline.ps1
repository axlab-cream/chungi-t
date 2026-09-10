<#
.SYNOPSIS
    Resolve and sequence a set of CreamAI skills into an ordered execution plan.
.DESCRIPTION
    task-027 (Phase 7-4). Skills are markdown contracts under CreamAI/skills/.
    This runner validates that each requested skill exists, reads its front-matter
    (category, inputs, allowed-tools), and emits an ordered pipeline manifest that
    the PM executes step-by-step. It performs the deterministic parts — existence,
    ordering, manifest — and leaves the actual per-skill work to the PM (a skill is
    an instruction set for the model, not a standalone executable).
.PARAMETER Skills
    Ordered skill names (without the 'skill-' prefix or with it), e.g.
    quick-refactor,add-test,security-audit
.PARAMETER Target
    The file/scope the pipeline operates on (recorded in the manifest).
.EXAMPLE
    ./run-skill-pipeline.ps1 -Skills quick-refactor,add-test,security-audit -Target main.js
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string[]]$Skills,
    [string]$Target = ''
)

$ErrorActionPreference = 'Stop'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
try { [Console]::OutputEncoding = $utf8NoBom; $global:OutputEncoding = $utf8NoBom } catch {}

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$SkillsDir = Join-Path $ProjectRoot 'skills'

function Get-FrontMatterValue {
    param([string]$Text, [string]$Key)
    $m = [regex]::Match($Text, ("(?im)^\s*{0}\s*:\s*(.+?)\s*$" -f [regex]::Escape($Key)))
    if ($m.Success) { return $m.Groups[1].Value.Trim() } else { return '' }
}

$steps = @()
$stepNo = 0
foreach ($name in $Skills) {
    $stepNo++
    $bare = $name.Trim() -replace '^skill-', ''
    $file = Join-Path $SkillsDir ("skill-{0}.md" -f $bare)
    if (-not (Test-Path -LiteralPath $file)) {
        Write-Host ("[skill-pipeline] MISSING skill: {0} (expected {1})" -f $bare, $file) -ForegroundColor Red
        $steps += [ordered]@{ order = $stepNo; skill = $bare; status = 'missing'; category = ''; contract = '' }
        continue
    }
    $content = Get-Content -Raw -Encoding UTF8 -LiteralPath $file
    $category = Get-FrontMatterValue $content 'category'
    $steps += [ordered]@{
        order = $stepNo
        skill = $bare
        status = 'ready'
        category = $category
        contract = "skills/skill-$bare.md"
    }
    Write-Host ("[skill-pipeline] {0}. {1} [{2}] -> {3}" -f $stepNo, $bare, $category, "skills/skill-$bare.md") -ForegroundColor Cyan
}

$missing = @($steps | Where-Object { $_.status -eq 'missing' }).Count
$manifest = [ordered]@{
    generated_at = [DateTimeOffset]::Now.ToString('o')
    target = $Target
    step_count = $steps.Count
    missing = $missing
    rollback_policy = 'On a failing step, stop the pipeline and revert that step''s edits before continuing.'
    steps = $steps
}
$outDir = Join-Path $ProjectRoot 'reports'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$manifestPath = Join-Path $outDir 'skill-pipeline.json'
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

Write-Host "[skill-pipeline] manifest: $manifestPath" -ForegroundColor Green
if ($missing -gt 0) { Write-Host ("[skill-pipeline] {0} skill(s) missing — fix names before running" -f $missing) -ForegroundColor Yellow; exit 1 }
Write-Host ("[skill-pipeline] {0} steps ready for target '{1}'" -f $steps.Count, $Target) -ForegroundColor Green
