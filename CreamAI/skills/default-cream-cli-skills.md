# Default Cream CLI Skills

CreamAI CLI treats this file as the project-local default skill router.

## Default Sources

- Desktop design skill snapshots:
  `C:\Users\USER\MCP\바탕화면\디자인스킬 md`
- Desktop skill source folder:
  `C:\Users\USER\MCP\바탕화면\SKILL`
- Imported source manifest:
  `CreamAI/skills/imported/SOURCE-MANIFEST.md`

## Required Default Gate

Before substantial implementation, route the task to the relevant skill set:

- Project context check: compare the selected FOLDER/project root with the
  terminal work instruction. If the folder appears to be project A but the
  instruction asks for project B, stop and ask:
  `프로젝트가 다릅니다. 그대로 진행하시겠습니까?`
- Task completion brief: at every Task completion or blocked handoff, read
  `CreamAI/workflows/task-completion-brief.md` and print the checkbox
  `Task 완료 브리핑` in the terminal before asking for next-step approval.
- PRD/planning/roadmap/screen brief/PRD-derived TASK:
  `.claude/skills/prd-screen-planning/SKILL.md` first, then
  `.claude/skills/prd-to-code/SKILL.md` only after the PRD gap audit and TASK
  brief exist
- Coding, review, or refactor: `.claude/skills/karpathy-guidelines/SKILL.md`
- Multi-step work: `.claude/skills/writing-plans/SKILL.md`
- Bugs or failed tests: `.claude/skills/systematic-debugging/SKILL.md`
- Feature/bugfix implementation: `.claude/skills/test-driven-development/SKILL.md`
- Completion claims: `.claude/skills/verification-before-completion/SKILL.md`
- Web/frontend/UI: `.claude/skills/white-editorial-canvas/SKILL.md` first
  when no stronger visual direction is provided, then
  `.claude/skills/design-skill-snapshots/SKILL.md`,
  `.claude/skills/frontend-design/SKILL.md`,
  `.claude/skills/ui-ux-pro-max/SKILL.md`, and
  `CreamAI/workflows/web-design-skills.md`
- Korean text polishing: `.claude/skills/humanizer/SKILL.md`
- Video analysis: `.claude/skills/watch/SKILL.md`
- Codebase understanding: `.claude/skills/understand/SKILL.md`

## PRD Screen Planning Gate

When an initial PRD or planning document arrives, compare it against
`.claude/skills/prd-screen-planning/references/prd-screen-planning-master.md`
before creating implementation tasks. Missing IA, Page Brief, CTA, state,
alert, admin-front sync, legal/privacy, FAQ, SEO/AEO/GEO, analytics, QA, or
Definition of Done items must become explicit `보완 필요`, assumptions, blockers,
or acceptance criteria. Do not silently fill product gaps with guessed features.

## CreamAI Skill Pipeline

Every Claude skill with a `SKILL.md` also has a `CreamAI/skills/skill-*.md`
wrapper so `CreamAI/scripts/run-skill-pipeline.ps1` can sequence it.

Use wrappers for planning and audit trails; use `.claude/skills/*/SKILL.md` as
the authoritative execution instructions.
