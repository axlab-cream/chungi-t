---
skill: session-history
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/session-history/SKILL.md
---

# Skill: session-history

Default Cream CLI wrapper for `.claude/skills/session-history/SKILL.md`.

## Trigger

Show what happened in recent past sessions on this project as a clean timeline. Use when the user asks "what did we do last time", "session history", "past sessions", or wants an overview of previous work.

## Runtime Rule

Read `.claude/skills/session-history/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


