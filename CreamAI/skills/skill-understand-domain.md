---
skill: understand-domain
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/understand-domain/SKILL.md
---

# Skill: understand-domain

Default Cream CLI wrapper for `.claude/skills/understand-domain/SKILL.md`.

## Trigger

Extract business domain knowledge from a codebase and generate an interactive domain flow graph. Works standalone (lightweight scan) or derives from an existing /understand knowledge graph.

## Runtime Rule

Read `.claude/skills/understand-domain/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


