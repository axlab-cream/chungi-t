# Tone V2 Safety Claims Implementation Plan

> **For agentic workers:** Execute this one vertical slice inline. No subagent work is authorized.

**Goal:** Enforce common prompt §10 so generated report copy separates symbolic interpretation from verified reality, respects explicit relationship boundaries, and never replaces professional judgment or invents pet/home causation.

**Architecture:** Extend the existing deterministic post-generation `reviewToneCopy` gate with a context-aware safety-claim review. Reuse `relationshipState` for boundary/unsafe inputs and persisted `home.terrainEvidence` for measured feng-shui facts; pass the existing report context into the same gate before a generated section is accepted.

**Tech Stack:** TypeScript, Node test runner, tsx

## Global Constraints

- Scope is `ZIP-003-085` through `ZIP-003-091` only.
- This is a deterministic lower-bound rejection gate, not medical, legal, financial, veterinary, or geomantic expertise.
- Preserve conditional language and explicit uncertainty; do not block ordinary advice based on observable real-world criteria.
- No UI, database, corpus, authentication, payment, deployment, or existing-record migration changes.

## PRD Screen Planning Gap Audit

- Confirmed: the affected surface is generated report hook/body copy before acceptance; no CTA or page layout changes.
- Confirmed data sources: sanitized `SajuReportContext`, server calculation, RAG evidence, `relationshipState`, and optional server terrain evidence.
- Required state: unsafe copy is rejected into the existing generation retry/error flow; safe conditional/referral copy continues unchanged.
- Admin sync, analytics, SEO/AEO/GEO, responsive/accessibility, legal-page copy: not affected by this internal generation gate.
- Follow-up gap: lexical checks cannot prove semantic safety across every paraphrase. Live-model evaluation and release attachment remain later ROADMAP Tasks.

## TASK Brief

- User outcome: reports give actionable criteria without presenting predictions or symbolic cues as verified facts.
- Scope: certain human outcomes; symbolic-authority claims; blocked/unsafe contact advice; professional-authority substitution; guardian-chart pet causation; unmeasured feng-shui harm/value claims.
- Files: `src/report/tone-v2-review.ts`, `src/report/report-generator.ts`, `tests/unit/tone-v2-generation.test.ts`, operational ledgers.
- Acceptance criteria: each prohibited class has a failing counterexample and a permitted uncertainty/referral example; generation passes context to the common review; prompt contains all §10 boundaries.
- Definition of Done: focused tests, relevant regression, full test suite, typecheck, build, diff check, ROADMAP/tests/status update, sanitized KMS writeback.

### Task 1: Context-aware safety claim gate

- [x] Add RED tests for §10 prohibited and permitted examples.
- [x] Implement `reviewSafetyClaims` and integrate it into `reviewToneCopy`.
- [x] Pass `SajuReportContext` from section generation to hook/body review.
- [x] Add explicit §10 instructions to the shared writing prompt.
- [x] Run focused and full verification.
- [x] Update ProjectOps ledgers and write reusable KMS evidence.
