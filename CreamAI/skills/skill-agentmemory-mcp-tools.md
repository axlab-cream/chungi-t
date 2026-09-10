---
skill: agentmemory-mcp-tools
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/agentmemory-mcp-tools/SKILL.md
---

# Skill: agentmemory-mcp-tools

Default Cream CLI wrapper for `.claude/skills/agentmemory-mcp-tools/SKILL.md`.

## Trigger

Map of every agentmemory MCP tool, what each does, and its parameters. Use when choosing which memory tool to call, when a tool name or argument is unclear, or when answering what agentmemory can do via MCP.

## Runtime Rule

Read `.claude/skills/agentmemory-mcp-tools/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


