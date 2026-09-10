---
skill: forget
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/forget/SKILL.md
---

# Skill: forget

Default Cream CLI wrapper for `.claude/skills/forget/SKILL.md`.

## Trigger

Delete specific observations from agentmemory after showing them and getting explicit confirmation. Use when the user says "forget this", "delete memory", "remove that note", or wants to scrub specific data for privacy.

## Runtime Rule

Read `.claude/skills/forget/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


