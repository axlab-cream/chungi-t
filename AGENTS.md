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
승인/실행 정책은 `rules.md` §6 (SSOT) 을 따른다. 본 문서는 참조만 하며
정책을 중복 기술하지 않는다.
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

## 사용자 공통 워크플로우 (2026-09-12, §6 이관 2026-09-17)

승인/실행 정책은 `rules.md` §6 이 유일한 정본이다. 이전에 이 절에 있던
"Task별 승인 대기" 정책 본문은 §6.1 무중단 연속 실행으로 대체되어 삭제했다.

작업 절차 참조: `C:/Users/user/.codex/workflows/aios-small-slice-workflow.md`
(requirements -> PRD -> one vertical slice -> tests -> review -> KMS -> next issue)

제품 제약(정책 아님):
- 현재 결제 트랙은 보류한다.
- 운영 화면에는 실제 데이터만 표시한다.
- T22의 스키마 생성은 중간 산출물이며 서버/API/사용자 흐름 검증 전 완료로 표시하지 않는다.
