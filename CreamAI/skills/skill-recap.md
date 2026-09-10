---
skill: recap
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/recap/SKILL.md
---

# Skill: recap

Default Cream CLI wrapper for `.claude/skills/recap/SKILL.md`.

## Trigger

Summarize the last N agent sessions for the current project, grouped by date, with highlight observations per session. Use when the user asks "recap", "what have we been doing", "today", "this week", or wants a rollup of recent work.

## Runtime Rule

Read `.claude/skills/recap/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


