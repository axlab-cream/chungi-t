# Design Skills

This project treats web and frontend design work as a mandatory design-skill workflow.

## Required Sources

| Skill | Source | License | Purpose |
| --- | --- | --- | --- |
| White Editorial Canvas | `.claude/skills/white-editorial-canvas/SKILL.md` | user-provided internal directive | Default premium white editorial web/mobile direction when no stronger visual instruction exists |
| Design Skill Snapshots | `CreamAI/skills/imported/design-skill-md/` | mixed/source noted per file | Local desktop design skill snapshots and original upstream captures |
| Frontend Design | https://github.com/anthropics/skills/tree/main/skills/frontend-design | Apache-2.0 | Distinctive, brief-specific visual direction, typography, layout, motion, and copy critique |
| UI UX Pro Max | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | MIT | Design-system generation, industry/style/color/type guidance, stack-aware UI/UX checks |

## Supporting Tools

| Tool | Source | Purpose |
| --- | --- | --- |
| 21st.dev Community Components | https://21st.dev/community/components | Reference community-made UI components, marketing blocks, themes, and interaction patterns during design planning and implementation |

## Required Workflow

For any web design, frontend UI, landing page, dashboard, app screen, or redesign task:

1. Read `CreamAI/workflows/web-design-skills.md`.
2. Read `.claude/skills/white-editorial-canvas/SKILL.md` first when no stronger visual direction is provided.
3. Read `.claude/skills/design-skill-snapshots/SKILL.md`.
4. Read `.claude/skills/frontend-design/SKILL.md`.
5. Read `.claude/skills/ui-ux-pro-max/SKILL.md`.
6. Use 21st.dev Community Components as a supporting reference when selecting
   component patterns, not as a blind copy source.
7. Create or update `design-system/MASTER.md` when the project has recurring UI.
8. Verify responsive layout, contrast, focus states, reduced motion, hover states, and visual fit to the project domain.

Do not ship generic AI-looking UI when the user asked for a production interface.
