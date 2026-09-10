---
skill: receiving-code-review
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/receiving-code-review/SKILL.md
---

# Skill: receiving-code-review

Default Cream CLI wrapper for `.claude/skills/receiving-code-review/SKILL.md`.

## Trigger

Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation

## Runtime Rule

Read `.claude/skills/receiving-code-review/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


