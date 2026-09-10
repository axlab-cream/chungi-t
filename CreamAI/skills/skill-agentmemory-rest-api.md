---
skill: agentmemory-rest-api
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/agentmemory-rest-api/SKILL.md
---

# Skill: agentmemory-rest-api

Default Cream CLI wrapper for `.claude/skills/agentmemory-rest-api/SKILL.md`.

## Trigger

The agentmemory HTTP REST API surface, the primary protocol for talking to the memory server. Use when calling agentmemory over HTTP, when MCP is unavailable and you need a fallback, or when integrating a host that does not speak MCP.

## Runtime Rule

Read `.claude/skills/agentmemory-rest-api/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


