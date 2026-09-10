---
skill: review
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/review/SKILL.md
---

# Skill: review

Default Cream CLI wrapper for `.claude/skills/review/SKILL.md`.

## Trigger

Review changed code using ProjectOps acceptance criteria, tests, and security checks.

## Runtime Rule

Read `.claude/skills/review/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


