---
skill: verification-before-completion
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/verification-before-completion/SKILL.md
---

# Skill: verification-before-completion

Default Cream CLI wrapper for `.claude/skills/verification-before-completion/SKILL.md`.

## Trigger

Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always

## Runtime Rule

Read `.claude/skills/verification-before-completion/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


