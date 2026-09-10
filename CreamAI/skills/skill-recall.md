---
skill: recall
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/recall/SKILL.md
---

# Skill: recall

Default Cream CLI wrapper for `.claude/skills/recall/SKILL.md`.

## Trigger

Search agentmemory for past observations, sessions, and learnings about a topic using hybrid BM25 plus vector plus graph search. Use when the user says "recall", "what did we do about", "did we ever", "have we seen", or needs context from past sessions.

## Runtime Rule

Read `.claude/skills/recall/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


