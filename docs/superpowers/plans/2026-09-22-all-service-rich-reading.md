# All-service rich reading implementation plan

**Goal:** Keep each service's existing identity while presenting saved interpretation as readable Markdown, verified charts/tables, and image-led sections; make new sections as substantial as the agreed CMDG reading.

**Architecture:** The shared authenticated reader remains the source of truth for 17 standard paid flows. The existing `longform-blocks.json` provides service titles, accents, thumbnails and imagery. Home and wedding retain their specialized detail screens, but reuse the shared safe Markdown renderer. No saved customer prose or calculated values are rewritten.

**Tech stack:** Browser JavaScript/CSS, TypeScript report prompts, Node test runner.

## Constraints

- No invented success probability, timing, score, or missing personal condition.
- Do not edit popup manager, payment, authentication, or existing stored report data.
- Keep per-service thumbnail and section image selection; preserve the ten distinct year-love images.
- Remote push and deployment require a separate explicit request under `rules.md` §6.

## Task 1 — Shared visual evidence

- [x] Add a failing test proving a service-specific first accordion can show an actual five-element calculation graph without prediction wording or empty values.
- [x] Add the chart to `사주/js/umsh-report-access.js` after the existing service guide; style it in `사주/css/umsh-verified-reader.css` with the service accent and accessible values.
- [x] Run focused reader tests and static all-service checks. Authenticated visual review of a newly deployed report remains pending.

## Task 2 — Markdown and specialized screens

- [x] Test Markdown emphasis, tables, lists, and escaping against saved-text samples.
- [x] Improve the shared renderer without permitting raw HTML or external links.
- [x] Make the home and wedding detail renderers call the same safe Markdown renderer, preserving their own layout.

## Task 3 — New interpretation depth

- [x] Test a denser standard-section budget and service-specific prompt wording.
- [x] Increase only future generated section depth, preserving existing saved reports and existing review safety gates.
- [x] Finish the full test rerun and scope/gap record in `status.md` and CreamWIKI. Authenticated browser review remains a deployment gate.

## Task 4 — Year-love calculated flow and first highlight

- [x] Replace decorative month percentages with three explicitly named, birth-derived traditional markers in the authenticated report API.
- [x] Render the twelve-month signal-count graph only in the monthly-flow section, with a 0–3 scale and a non-prediction caption.
- [x] Generate a new photorealistic December meeting scene for the first 도화 highlight and adjust its crop without altering the other ten section images.
- [ ] Verify the new banner and chart on an authenticated local report when a complete private report fixture is available; do not claim production deployment.

## Task 5 — Common in-place reader chrome and actions

- [x] Keep the shared UMSH GNB and bottom navigation as the only persistent shell on the Year Love 06 detail screen.
- [x] Retire the duplicate status/PDF bar and local chat composer from the authenticated reading view without deleting their static fallback handlers.
- [x] Add a reusable in-place reader footer with canonical-link copy and PDF save actions for standard 06 detail screens.
- [x] Keep access control unchanged: copying `/r/:id` does not grant another account reading access.
