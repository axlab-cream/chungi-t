# Project Agent Instructions

This project uses the CreamAI AIOS structure for multi-agent work.

## Operating Core

Before meaningful implementation, inspect and maintain:

- `goal.md`
- `ROADMAP.md`
- `rules.md`
- `plan.md`
- `tests.md`
- `status.md`

Preserve existing user work. Append operational history to `status.md`.
Follow `ROADMAP.md`: one Task at a time, then wait for `다음`, `진행`, or
`Continue` before starting the next Task.
Keep Claude hook commands in `.claude/settings.json` project-relative with
forward slashes, for example `.claude/hooks/validate-bash.ps1`.

## Agent Roles

- Claude: PM, implementation, integration, final decision.
- Codex: code review, defect analysis, verification support.
- Antigravity/Gemini: research and evidence gathering.

Use `CreamAI/workflows/run-team.md` for the full RUN TEAM workflow.

## Default Skills

Before substantial work, read `CreamAI/skills/default-cream-cli-skills.md` and
route the task through the matching `.claude/skills/*/SKILL.md` files. Use
`CreamAI/scripts/run-skill-pipeline.ps1` when you need an auditable ordered skill
plan.

## Web Design

For web design, frontend UI, landing pages, dashboards, app screens, redesign,
design systems, or visual QA, read `CreamAI/workflows/web-design-skills.md`
before implementation. The required local registries are:

- `.claude/skills/design-skill-snapshots/SKILL.md`
- `.claude/skills/frontend-design/SKILL.md`
- `.claude/skills/ui-ux-pro-max/SKILL.md`

## Knowledge Loop

If CreamWIKI/KMS is configured, search prior success and failure notes before implementation. Save verified reusable knowledge after verification.
