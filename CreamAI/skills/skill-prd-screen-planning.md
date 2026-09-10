---
skill: prd-screen-planning
category: default-cream-cli
inputs: [prd, planning_doc, task_context]
allowed-tools: [Read]
source-skill: .claude/skills/prd-screen-planning/SKILL.md
---

# Skill: prd-screen-planning

Default Cream CLI wrapper for `.claude/skills/prd-screen-planning/SKILL.md`.

## Trigger

Required when an initial PRD, planning document, feature brief, roadmap, screen
brief, IA, user flow, Page Brief, wireframe, or PRD-derived TASK must become
implementation-ready work.

## Runtime Rule

Read `.claude/skills/prd-screen-planning/SKILL.md` and its master reference
before implementing PRD-derived work. First perform the gap audit, then produce
screen, design, development, QA, analytics, admin-sync, SEO/AEO/GEO, and
Definition of Done instructions. If the TASK touches UI/design, run
`white-editorial-canvas` immediately after this skill.
