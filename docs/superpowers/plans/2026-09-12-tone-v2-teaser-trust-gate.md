# Tone V2 Teaser Trust Gate Implementation Plan

> **For agentic workers:** Execute this one vertical slice inline. The repository does not provide the optional executing-plans/subagent skill, and no subagent work is authorized.

**Goal:** Enforce common prompt §9 so every newly saved teaser leads with sourced interpretation, shows only one or two representative grounds and a recognizable scene, describes the paid scope concretely, and rejects operational or coercive sales copy.

**Architecture:** Add a deterministic teaser review beside `createSavedPreview`, where generic report previews and the server-calculated wedding/new-year previews already converge. Assemble the free teaser from the input-specific deterministic template before paid sections are redacted, fail closed on unsafe sales copy before persistence, and expose structural findings to tests/release evaluation; keep entitlement, payment, UI rendering, and existing-record migration out of scope.

**Tech Stack:** TypeScript, Node test runner, tsx

## Global Constraints

- Scope is `ZIP-003-077` through `ZIP-003-084`.
- Reuse persisted report/context evidence; do not introduce a teaser model call or another calculation source.
- Do not expose paid section bodies, change authentication/payment behavior, mutate existing records, or deploy.
- Deterministic lexical checks are a lower-bound gate, not proof that a teaser is persuasive or semantically correct.

## PRD Screen Planning Gap Audit

- Confirmed: the teaser is the saved report's free interpretation view; the main paid CTA and entitlement flow already exist outside this module.
- Confirmed: the data source is the persisted report plus server-calculated wedding/new-year teaser context.
- Confirmed states: new previews are created synchronously; unsafe operational/coercive copy must fail before persistence rather than silently invent fallback content. Structural failures remain explicit review findings because synthetic/minimal report records may not yet contain enough copy at allocation time.
- No screen/layout change: CTA labels, analytics, responsive behavior, SEO, legal pages, and admin-front fields are unchanged by this copy gate.
- Follow-up gap: old persisted previews are read as frozen records and are not rewritten in this Task. Their full semantic audit belongs to the later evaluation/release migration.

## Page Brief

- Page: service step-4 teaser / saved preview response
- Purpose: establish trust with a limited, evidence-based first interpretation before paid detail access
- Primary user: authenticated service user who completed the required inputs
- Core message: one sourced verdict, one or two representative grounds, one recognizable situation, and the concrete questions the full report resolves
- Primary CTA: existing checkout CTA, unchanged
- Data source: `SajuReport`, sanitized `SajuReportContext`, and server-calculated dedicated teaser data
- Required states: valid preview persists; invalid preview creation fails closed; existing relationship safety override remains intact
- QA: positive structure, excessive grounds, unsourced verdict, operations leakage, fake quote/fear/loss manipulation, and unsupported prediction counterexamples

---

### Task 1: Saved teaser trust review

**Files:**
- Modify: `src/report/report-preview.ts`
- Test: `tests/unit/report-content-guards.test.ts`

**Interfaces:**
- Consumes: `ReportPreview`, source evidence assembled from the report/context, and the service context.
- Produces: `reviewTeaser(input): ToneReview`; `createSavedPreview()` rejects unsafe operational/coercive findings and keeps structural findings available to QA/release evaluation.

- [x] Add failing tests for a valid sourced teaser, an unsourced headline, missing or excessive representative grounds, missing recognizable scene, vague paid scope, operational-state leakage, fake locked-copy quotes, fear/loss pressure, and unsupported personal prediction.
- [x] Run the focused tests and confirm the new export is absent.
- [x] Implement the minimum structural, source, scene, paid-scope, operations, and coercion checks.
- [x] Route generic, wedding, and new-year preview assembly through the gate; retain at most two representative grounds.
- [x] Run focused and service workflow tests, compiler/task checks, full regression, typecheck, Vercel build, and diff check.
- [x] Record task states, review limits, ProjectOps evidence, and sanitized CreamWIKI knowledge.

## Self-review

- Spec coverage: teaser purpose, sourced verdict/index, one-to-two grounds, recognizable scene, concrete paid scope, operations-copy ban, and coercive/fabricated sales-copy ban are mapped.
- Scope: no UI, auth, payment, database schema, model, corpus, or deployment change is introduced.
- Type consistency: the new review returns the existing `ToneReview` shape and accepts the existing `ReportPreview` contract.
