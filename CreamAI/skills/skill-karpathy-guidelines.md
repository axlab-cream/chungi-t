---
skill: karpathy-guidelines
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/karpathy-guidelines/SKILL.md
---

# Skill: karpathy-guidelines

Default Cream CLI wrapper for `.claude/skills/karpathy-guidelines/SKILL.md`.

## Trigger

Behavioral guidelines to reduce common LLM coding mistakes. Use when writing, reviewing, or refactoring code to avoid overcomplication, make surgical changes, surface assumptions, and define verifiable success criteria.

## Runtime Rule

Read `.claude/skills/karpathy-guidelines/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


