---
skill: handoff
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/handoff/SKILL.md
---

# Skill: handoff

Default Cream CLI wrapper for `.claude/skills/handoff/SKILL.md`.

## Trigger

Resume the most recent agent session for the current working directory, leading with any unanswered question. Use when the user says "where were we", "resume", "handoff", "pick up where I left off", or starts a session with no fresh context.

## Runtime Rule

Read `.claude/skills/handoff/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


