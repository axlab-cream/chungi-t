---
skill: write-agentmemory-skill
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/write-agentmemory-skill/SKILL.md
---

# Skill: write-agentmemory-skill

Default Cream CLI wrapper for `.claude/skills/write-agentmemory-skill/SKILL.md`.

## Trigger

The house format and rules for writing or updating an agentmemory skill. Use when adding a new skill, restructuring an existing one, or reviewing a skill contribution for consistency.

## Runtime Rule

Read `.claude/skills/write-agentmemory-skill/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


