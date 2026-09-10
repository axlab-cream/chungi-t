---
skill: using-superpowers
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/using-superpowers/SKILL.md
---

# Skill: using-superpowers

Default Cream CLI wrapper for `.claude/skills/using-superpowers/SKILL.md`.

## Trigger

Use when starting any conversation - establishes how to find and use skills, requiring skill invocation before ANY response including clarifying questions

## Runtime Rule

Read `.claude/skills/using-superpowers/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


