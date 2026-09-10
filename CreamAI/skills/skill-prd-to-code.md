---
skill: prd-to-code
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/prd-to-code/SKILL.md
---

# Skill: prd-to-code

Default Cream CLI wrapper for `.claude/skills/prd-to-code/SKILL.md`.

## Trigger

Convert PRD requirements into a scoped implementation plan and verified code
changes after `prd-screen-planning` has audited the PRD and produced
implementation-ready screen, design, development, QA, and Definition of Done
instructions.

## Runtime Rule

Read `.claude/skills/prd-screen-planning/SKILL.md` first, then read
`.claude/skills/prd-to-code/SKILL.md`. Do not implement directly from a thin PRD
or planning doc.


