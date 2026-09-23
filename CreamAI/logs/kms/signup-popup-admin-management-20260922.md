# First-page signup popup management — 2026-09-22

## Observation

The first-page signup popup needed an operator-controlled period and a supplied default image while preserving the signup-to-free-today-fortune flow.

## Decision

Store popup versions as `banner` content at `home/signup-benefit-popup`. Validate image paths under `/assets/`, require a start and a later end time, and select a published version only while the current time is inside that interval.

## Artifact

- `src/marketing/signup-popup.ts`
- `src/admin/content-store.ts`
- `src/server/app.ts`
- `admin-ui/index.html`
- `사주/js/umsh-signup-benefit-popup.js`

## QA result

`npm run typecheck`, `npm run vercel-build`, focused content-store, popup, and administrator shell tests passed. Reviewer automation could not produce a report because its configured external MCP authentication was unavailable.

## Deploy result

Committed as `d60bb00` and `b63b189`, pushed to `main`, and deployed to `https://umsh.kr`. Production checks confirmed the first-page HTML loads the popup CSS and JavaScript, the active popup API returns the default configuration, the default image is public, `/ops/constellation-7f3c` responds, and legacy `/admin` returns 404. Browser accessibility inspection confirmed the visible dialog, close action, today-fortune signup CTA, and one-week hide control.

## Lesson

Time-bound public campaigns can be ended safely by evaluating their active window at read time; this avoids a scheduler that might leave a stale promotion visible after its expiry.
