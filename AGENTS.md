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

## 사용자 공통 워크플로우 (2026-09-12)

`C:/Users/user/.codex/workflows/aios-small-slice-workflow.md`를 적용한다.
사용자가 연속 실행을 승인한 현재 작업은 단일 이슈를 검증·리뷰·기록한 뒤 다음 승인된 이슈로 이어간다.
위의 Task별 승인 대기는 새로운 제품 결정이나 승인 범위 밖 작업이 필요할 때 적용한다.
현재 결제 트랙은 보류한다. 운영 화면에는 실제 데이터만 표시한다.
T22의 스키마 생성은 중간 산출물이며 서버/API/사용자 흐름 검증 전 완료로 표시하지 않는다.
