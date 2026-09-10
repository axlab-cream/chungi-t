---
skill: dispatching-parallel-agents
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/dispatching-parallel-agents/SKILL.md
---

# Skill: dispatching-parallel-agents

Default Cream CLI wrapper for `.claude/skills/dispatching-parallel-agents/SKILL.md`.

## Trigger

Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies

## Runtime Rule

Read `.claude/skills/dispatching-parallel-agents/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


