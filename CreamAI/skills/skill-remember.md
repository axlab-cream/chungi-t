---
skill: remember
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/remember/SKILL.md
---

# Skill: remember

Default Cream CLI wrapper for `.claude/skills/remember/SKILL.md`.

## Trigger

Save an insight, decision, or learning to agentmemory's long-term storage with searchable concept tags. Use when the user says "remember this", "save this", "note that", "don't forget", or wants to preserve knowledge for future sessions.

## Runtime Rule

Read `.claude/skills/remember/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


