---
skill: understand-knowledge
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/understand-knowledge/SKILL.md
---

# Skill: understand-knowledge

Default Cream CLI wrapper for `.claude/skills/understand-knowledge/SKILL.md`.

## Trigger

Analyze a Karpathy-pattern LLM wiki knowledge base and generate an interactive knowledge graph with entity extraction, implicit relationships, and topic clustering.

## Runtime Rule

Read `.claude/skills/understand-knowledge/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


