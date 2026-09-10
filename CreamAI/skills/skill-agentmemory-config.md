---
skill: agentmemory-config
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/agentmemory-config/SKILL.md
---

# Skill: agentmemory-config

Default Cream CLI wrapper for `.claude/skills/agentmemory-config/SKILL.md`.

## Trigger

agentmemory configuration, environment variables, ports, and feature flags. Use when enabling a feature, changing ports, setting an API key, configuring auth, or explaining why a feature is off by default.

## Runtime Rule

Read `.claude/skills/agentmemory-config/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


