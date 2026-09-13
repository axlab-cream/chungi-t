# Tone V2 Technical Terms Implementation Plan

> **For agentic workers:** Execute this one vertical slice inline. The repository does not provide the optional executing-plans/subagent skill, and no subagent work is authorized.

**Goal:** Enforce common prompt §7 so customer reports introduce named technical terms accessibly and do not turn traditional relationships into personal-event certainties.

**Architecture:** Add one report-ordered deterministic review in `tone-v2-review.ts`. It reads completed siblings before the current hook/body, while existing tone review remains responsible for sentence-level voice and certainty checks. Wire the new review once after generation and preserve semantic live evaluation as a separate acceptance boundary.

**Tech Stack:** TypeScript, Node test runner, tsx

## Global Constraints

- Scope is only `ZIP-003-065` through `ZIP-003-070`.
- Preserve existing completed report text and user changes.
- Do not call a live provider, write Production data, commit, push, or deploy.
- Treat deterministic review as a lower-bound gate, not proof of semantic quality.

---

### Task 1: Report-ordered terminology review

**Files:**
- Modify: `src/report/tone-v2-review.ts`
- Modify: `src/report/report-generator.ts`
- Test: `tests/unit/tone-v2-generation.test.ts`

**Interfaces:**
- Consumes: current `hook`, `interpretation`, and completed `SajuReportSection[]`.
- Produces: `reviewTechnicalTerms(input): ToneReview`.

- [x] Add failing tests for first-use explanation, later Korean-only use, crowded Hanja/parentheses, 오행/용신 distinction, 신강/신약 human-trait grading, and 합/충 event certainty.
- [x] Run the focused test and confirm failure because the review export does not exist.
- [x] Implement the minimum ordered glossary and semantic-boundary checks.
- [x] Wire the review once to the generated hook/body and add the matching writing instruction.
- [x] Run focused tests, compiler/task-index checks, full regression, typecheck, Vercel build, and diff check.
- [x] Record task states, review limits, ProjectOps evidence, and sanitized CreamWIKI knowledge.

## Self-review

- Spec coverage: heading, first use, later use, crowded notation, judgment separation, and event-equivalence rules are each mapped above.
- Placeholder scan: no TBD/TODO or unspecified implementation step remains.
- Type consistency: the produced review matches the existing `ToneReview` result and accepts existing section types.
