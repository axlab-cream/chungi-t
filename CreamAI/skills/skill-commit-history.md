---
skill: commit-history
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/commit-history/SKILL.md
---

# Skill: commit-history

Default Cream CLI wrapper for `.claude/skills/commit-history/SKILL.md`.

## Trigger

List recent git commits linked to agent sessions, optionally filtered by branch or repo. Use when the user asks "show agent commits", "what has the agent shipped", "list linked commits", or wants commits with their session context.

## Runtime Rule

Read `.claude/skills/commit-history/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


