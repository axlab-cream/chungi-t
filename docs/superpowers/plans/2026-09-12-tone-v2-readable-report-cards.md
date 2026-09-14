# Tone V2 Readable Report Cards Implementation Plan

> **For agentic workers:** Execute this one vertical slice inline. No subagent work is authorized.

**Goal:** Enforce common prompt §11 so new report prose has readable sentence/paragraph boundaries and the shared mobile saved-report card visibly separates its title, one-line answer, grounds, and action.

**Architecture:** Add deterministic readability checks to the existing interpretation/tone review path, then give the shared verified-reader renderer semantic card blocks. New generation is instructed to reserve the last paragraph for the concrete action; legacy one-paragraph records remain readable under a truthful `근거와 행동` fallback rather than having an action invented.

**Tech Stack:** TypeScript, browser JavaScript, CSS, Node test runner, tsx

## Global Constraints

- Scope is `ZIP-003-092` through `ZIP-003-099` only.
- Preserve the existing dark 운명상회 reader and its service shell; no broad redesign.
- Do not rewrite saved reports or infer missing semantic content from legacy records.
- Do not change auth, payment entitlement, API, persistence schema, admin fields, analytics, SEO, or deployment.
- Deterministic checks are a lower-bound grammar/format gate, not full Korean semantic proofreading.

## PRD Screen Planning Gap Audit

- Confirmed page: shared mobile verified/saved report and its generic pre-payment preview.
- Purpose/user situation: a signed-in customer scans one saved interpretation and chooses whether to continue or purchase the full outline.
- Data source: saved `SajuReportSection` hook/interpretation and saved preview. No admin-controlled field is added.
- Primary CTA: `전체 해석 목차 보기` → existing payment URL → existing success/entitlement flow. Loading/error/permission/failed-section states remain unchanged.
- Secondary navigation: existing home, purchase-history, retry, unique-address, and previous/next paths remain intact; generic pager labels become result-specific.
- Legal/privacy/SEO/analytics: unchanged. Private report pages stay non-indexed and no new event is introduced.
- Gap and safe assumption: legacy interpretation has no structured action field. If two or more paragraphs exist, the final paragraph is displayed as action under the new generation contract; otherwise the body is labeled `근거와 행동` without pretending to know a split.
- Follow-up gap: all specialized service renderers and real generated outputs require later TV05 visual/browser acceptance. This Task validates the shared reader and contract only.

## Design Plan

- Domain/audience/screen job: Korean fortune report; mobile customer; scan the answer and next practical step without losing prose continuity.
- Existing tokens: background `#080807`, surface `#11100d`, text `#f7f2e9`, muted `#a39a8c`, divider `rgba(216,186,114,.19)`, accent `#d8ba72`.
- Typography roles: classification as card title, hook as emphasized answer, 12px role labels, existing 15px/1.85 body.
- Layout: one-column card with thin separators between answer, grounds, and action; no extra nested rounded-card grid.
- Signature element: restrained gold role labels (`한 줄 답`, `근거`, `행동`) aligned to the report-reading sequence.
- Avoid: gradients added for decoration, icon badges, duplicated hook text, forced semantic split of legacy one-paragraph copy.
- Responsive/accessibility checks: 390/430px no horizontal overflow, semantic headings/sections, visible link/button focus, reduced-motion unchanged, labels remain text rather than color-only cues.

## TASK Brief

- User outcome: each report card can be scanned as question → answer → grounds → action, and malformed prose is rejected before completion.
- Files: `src/report/interpretation-validation.ts`, `src/report/tone-v2-review.ts`, `사주/js/umsh-report-access.js`, `사주/js/umsh-report-view.js`, `사주/css/umsh-verified-reader.css`, focused tests and ProjectOps ledgers.
- Acceptance criteria: long slash lists and named grammar errors fail; new prompt defines 2–4 sentence paragraphs and last action paragraph; judgment hooks require punctuation; shared card renders distinct semantic blocks; labels use middot/no terminal period; CTA/pager labels name their result.
- Definition of Done: RED/GREEN tests, focused frontend/generation regression, full tests, typecheck, Vercel build, diff check, responsive browser inspection if a local server is available, task-index/status/KMS update.

### Task 1: Readability gate and shared report-card hierarchy

- [x] Add RED tests for prose, punctuation, CTA, semantic card blocks, and legacy fallback.
- [x] Implement the minimum generation/review rules.
- [x] Implement semantic shared-reader markup and restrained CSS.
- [ ] Verify focused behavior and inspect the rendered mobile reader.
- [x] Run full regression/type/build/diff checks.
- [x] Update task evidence and CreamWIKI.

Browser note: focused semantic DOM behavior passed, and the local real reader shell loaded. Styled synthetic private-result inspection was blocked by browser URL policy, so this one visual sub-check remains intentionally unchecked for TV05.
