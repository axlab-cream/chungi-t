# All-service enriched reading template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Execute one vertical slice at a time. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every sold reading service the same evidence-first report structure already approved for 천명사주, while preserving each service’s existing visual identity and never fabricating personal values.

**Architecture:** Keep `사주/data/longform-blocks.json` as the single public visual contract. The shared reader derives the main-card thumbnail as the first representative image, service image placement, one service-specific reading guide table, and the actual saved 만세력 flow chart from that contract and report payload. The report generator reads the same contract for future longform paragraph requirements.

**Tech Stack:** TypeScript, browser JavaScript, JSON visual configuration, existing Node test runner and static service QA.

## Global Constraints

- Preserve popup manager and popup behavior unchanged.
- Display only report payload values, existing public assets, or clearly labelled general reading guidance; do not invent personal conditions, scores, dates, or predictions.
- Keep full stored source prose visible; no client-side truncation.
- Use the main-card thumbnail as the representative image, then existing service accent and image assets; do not introduce a generic new brand.
- Do not push or deploy without a separate explicit authorization under `rules.md` §6 H1/H2.

### Task 1: Define the 20-service visual contract

**Files:**
- Modify: `사주/data/longform-blocks.json`
- Modify: `src/report/longform-blocks.ts`
- Test: `tests/unit/report-highlights.test.ts`

- [x] Add a test requiring every catalog service to provide two public detail image slots, a three-row service reading-guide table, and paragraph targets for all three highlight cards.
- [x] Run the focused test and confirm it fails because the contract fields are absent.
- [x] Add the fields to every service entry, reusing each service’s existing `cutA`/`cutB` assets and service-specific guide copy.
- [x] Add typed loader access for the reader/generator without duplicating service config.
- [x] Run the focused test and confirm it passes.

### Task 2: Render the common visual template without fabricating data

**Files:**
- Modify: `사주/js/umsh-report-access.js`
- Modify: `사주/css/umsh-verified-reader.css`
- Test: `tests/unit/report-access-frontend.test.ts`

- [x] Add a failing test that checks the shared reader decorates generic report sections with service-specific public image slots and inserts the guide table exactly once.
- [x] Change the shared reader so stored generic common images are replaced only by configured service images, and alternate the configured public cuts across every otherwise-image-less toggle.
- [x] Render the service reading guide after the leading answer in the first expanded section.
- [x] Render the existing actual 만세력 graph for all services when the payload contains the required calculation, keeping the existing no-data behavior when it does not.
- [x] Add service-accent styling, keyboard focus, responsive table overflow, and print coverage using the existing reader tokens.
- [x] Run the focused test and confirm it passes.

### Task 3: Verify, record, and prepare safe handoff

**Files:**
- Modify: `design-system/MASTER.md`
- Modify: `status.md`
- Create: `CreamAI/reports/2026-09-22-all-service-reading-template.md`

- [x] Run focused unit tests, `npm run typecheck`, `npm test`, `npm run qa:all-services`, and `npm run vercel-build`.
- [x] Inspect the final diff for popup/admin changes, client-side fake data, and accidental original-text truncation.
- [ ] Perform 375px and desktop visual checks for at least one service in each service identity group.
- [x] Record verified decisions and results in the personal CreamWIKI namespace, then read it back.
- [x] Commit only after fresh verification. Do not push/deploy in this task.
