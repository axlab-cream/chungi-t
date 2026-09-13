# Tone V2 Score and Visual Evidence Implementation Plan

> **For agentic workers:** Execute this one vertical slice inline. The repository does not provide the optional executing-plans/subagent skill, and no subagent work is authorized.

**Goal:** Enforce common prompt §8 so generated report scores, dates, tables, and charts stay tied to server evidence and explain what they mean.

**Architecture:** Add a deterministic post-generation review beside the existing numeric evidence gate. It receives the same server-derived numeric evidence plus an explicit comparison-target flag, then checks score semantics and textual table/chart duplication without changing UI chart components.

**Tech Stack:** TypeScript, Node test runner, tsx

## Global Constraints

- Scope is `ZIP-003-071` through `ZIP-003-076`.
- Reuse server-derived numeric evidence; do not create a second calculation source.
- Do not mutate completed reports, Production data, visual UI components, or deployment state.
- Deterministic checks are a lower-bound gate, not proof that a chart is editorially useful.

---

### Task 1: Generated score and visual evidence review

**Files:**
- Modify: `src/report/tone-v2-review.ts`
- Modify: `src/report/report-generator.ts`
- Test: `tests/unit/tone-v2-generation.test.ts`

**Interfaces:**
- Consumes: generated hook/body, `numericEvidence`, and `hasComparisonTarget` derived from sanitized report context.
- Produces: `reviewScoreVisuals(input): ToneReview`.

- [x] Add failing tests for unsupported score/date/chart values, event-probability labels, missing score axis/meaning, missing comparison targets, decorative charts, and table/chart duplication.
- [x] Run the focused test and confirm the new export is absent.
- [x] Implement the minimum evidence, label, comparison, purpose, and duplication checks.
- [x] Wire the review to the existing generated-section path and add matching writing instructions.
- [x] Run focused/integration tests, compiler/task-index checks, full regression, typecheck, Vercel build, and diff check.
- [x] Record task states, limits, ProjectOps evidence, and sanitized CreamWIKI knowledge.

## Self-review

- Spec coverage: heading, server-only values, non-probability labels, score meaning, comparison target, chart purpose, and table/chart deduplication are mapped.
- Scope: no chart renderer or score-calculation system is introduced.
- Type consistency: the new result uses `ToneReview` and the existing numeric-evidence representation.
