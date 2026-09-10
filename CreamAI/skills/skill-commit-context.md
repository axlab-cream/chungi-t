---
skill: commit-context
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/commit-context/SKILL.md
---

# Skill: commit-context

Default Cream CLI wrapper for `.claude/skills/commit-context/SKILL.md`.

## Trigger

Trace a file, function, or line back to the agent session that produced its current commit. Use when the user asks "why is this code here", "what was the agent doing when this changed", "who wrote this", or wants context on a specific location in the codebase.

## Runtime Rule

Read `.claude/skills/commit-context/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


