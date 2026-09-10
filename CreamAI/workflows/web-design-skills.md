# Web Design Skills Workflow

## Trigger

This workflow is mandatory for any task involving:

- web design
- frontend UI
- landing pages
- dashboards
- app screens
- redesign
- design systems
- visual QA
- responsive UI fixes

## Required Skill Sources

0. `White Editorial Canvas`
   - Local registry: `.claude/skills/white-editorial-canvas/SKILL.md`
   - Source: user-provided `웹·모바일 디자인 제작 작업지시서`
   - Use as the default visual principle when the user gives no stronger
     direction: white base, editorial hierarchy, premium minimal detail,
     context-first imagery, and anti-generic-AI design rules.

1. `Design Skill Snapshots`
   - Local registry: `.claude/skills/design-skill-snapshots/SKILL.md`
   - Imported references: `CreamAI/skills/imported/design-skill-md/`
   - Use for the desktop design skill snapshots and captured upstream originals.

2. `Frontend Design`
   - Source: https://github.com/anthropics/skills/tree/main/skills/frontend-design
   - Local registry: `.claude/skills/frontend-design/SKILL.md`
   - Use for distinctive visual direction, typography, layout, motion, and interface copy.

3. `UI UX Pro Max`
   - Source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
   - Local registry: `.claude/skills/ui-ux-pro-max/SKILL.md`
   - Use for design-system reasoning, industry-specific recommendations, responsive and accessibility checks.

## Supporting Design Tools

1. `21st.dev Community Components`
   - Source: https://21st.dev/community/components
   - Local registry: `docs/DESIGN_SKILLS.md`
   - Use as a reference catalog for component patterns, marketing blocks,
     interaction ideas, and UI states.
   - Do not copy blindly. Adapt patterns to the project's stack, design system,
     accessibility requirements, and domain-specific visual direction.

## Required Steps

1. If the task comes from a PRD or planning document, run
   `.claude/skills/prd-screen-planning/SKILL.md` before design work so screen
   purpose, CTA, states, admin sync, SEO/AEO/GEO, analytics, QA, and Definition
   of Done are explicit.
2. Read the user's product/domain and define the audience, page job, and success criteria.
3. Search CreamWIKI/KMS for prior design success/failure notes when available.
4. Read the default skill router and all local design skill registry files:
   - `CreamAI/skills/default-cream-cli-skills.md`
   - `.claude/skills/white-editorial-canvas/SKILL.md`
   - `.claude/skills/design-skill-snapshots/SKILL.md`
   - `.claude/skills/frontend-design/SKILL.md`
   - `.claude/skills/ui-ux-pro-max/SKILL.md`
5. For component-heavy UI, review 21st.dev community components for relevant
   pattern references such as heroes, features, pricing, buttons, inputs, cards,
   tabs, dialogs, forms, tables, and AI chat components.
6. Create a design plan before coding:
   - subject-specific concept
   - 4-6 color tokens
   - typography roles
   - layout concept
   - one signature visual element
   - anti-patterns to avoid
7. If the project has more than one screen, create or update `design-system/MASTER.md`.
8. Implement with the project stack and existing design system.
9. Verify:
   - desktop and mobile layout
   - contrast and focus states
   - hover/pressed/disabled states
   - reduced motion behavior
   - text fit and no incoherent overlaps
   - no generic AI visual defaults unless intentionally chosen
10. Record design decisions and verification in `status.md`.

## Completion Rule

Do not mark a web design task complete unless the required skill workflow was followed or a documented blocker explains why it could not be followed.
