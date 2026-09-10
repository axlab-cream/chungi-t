---
skill: agentmemory-hooks
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/agentmemory-hooks/SKILL.md
---

# Skill: agentmemory-hooks

Default Cream CLI wrapper for `.claude/skills/agentmemory-hooks/SKILL.md`.

## Trigger

The agentmemory plugin hooks that capture observations automatically across the agent session lifecycle. Use when explaining how memory gets captured without manual saves, when debugging missing observations, or when tuning what gets recorded.

## Runtime Rule

Read `.claude/skills/agentmemory-hooks/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


