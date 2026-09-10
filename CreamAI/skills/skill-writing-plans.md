---
skill: writing-plans
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/writing-plans/SKILL.md
---

# Skill: writing-plans

Default Cream CLI wrapper for `.claude/skills/writing-plans/SKILL.md`.

## Trigger

Use when you have a spec or requirements for a multi-step task, before touching code

## Runtime Rule

Read `.claude/skills/writing-plans/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


