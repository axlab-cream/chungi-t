---
skill: agentmemory-agents
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/agentmemory-agents/SKILL.md
---

# Skill: agentmemory-agents

Default Cream CLI wrapper for `.claude/skills/agentmemory-agents/SKILL.md`.

## Trigger

How agentmemory wires into host coding agents via the connect command. Use when installing agentmemory into a specific agent, when asked which agents are supported, or when a connect adapter writes the wrong config path.

## Runtime Rule

Read `.claude/skills/agentmemory-agents/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


