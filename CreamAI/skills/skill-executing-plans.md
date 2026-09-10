---
skill: executing-plans
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/executing-plans/SKILL.md
---

# Skill: executing-plans

Default Cream CLI wrapper for `.claude/skills/executing-plans/SKILL.md`.

## Trigger

Use when you have a written implementation plan to execute in a separate session with review checkpoints

## Runtime Rule

Read `.claude/skills/executing-plans/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


