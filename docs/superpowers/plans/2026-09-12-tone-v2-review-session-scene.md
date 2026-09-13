# Review Session Scene Recognition Implementation Plan

> **For agentic workers:** Execute this one small slice inline. Do not start another Tone V2 rule or service.

**Goal:** Recognize a concrete exam-review session only when a review setting and an observable review action appear together, without accepting generic advice as a scene.

**Architecture:** Keep the existing fictional-example and everyday-location signals unchanged. Add one narrow helper for review-session language (`복기`, `오답노트`, `마킹 검토`) that requires both a setting connector and a bounded observable action. Route only the `scene` density element through the combined helper.

**Tech Stack:** TypeScript, Node test runner, existing Tone V2 deterministic review.

## Global Constraints

- Rule scope: ZIP-003-040 only; ZIP-003-037 remains IN_PROGRESS until a new provider-backed section completes.
- No prompt, provider, model, retry, persistence, UI, DB, auth, payment, deployment, or Production changes.
- Preserve all existing scene matches.
- Do not accept a bare noun, a generic imperative, or an action without a recognizable review setting.
- Do not regenerate provider output in this Task; re-evaluate the immutable synthetic attempt by hash.

### Task 1: Fix the review-session boundary

**Files:**
- Modify: `tests/unit/tone-v2-generation.test.ts`
- Modify: `src/report/tone-v2-review.ts`

- [x] Add the captured `다음 복기에서 ... 나눠봐` sentence and equivalent review settings as positive fixtures.
- [x] Add bare `복기`, importance-only `오답노트`, generic encouragement, noun-only, action-only, and negated-action negative fixtures.
- [x] Run the focused test and confirm RED on the captured sentence.
- [x] Add the smallest bounded recognizer and run focused tests GREEN.
- [x] Re-evaluate the immutable provider attempt and confirm density 4/4 without rewriting its historical saved status.

### Task 2: Verify and preserve evidence

- [x] Run related, compiler/task, full regression, typecheck, Vercel build, and diff checks.
- [x] Run independent review and apply in-scope findings.
- [x] Update ProjectOps evidence and CreamWIKI with no secrets or production customer data.

## Self-review

- This plan repairs one deterministic false negative, not general Korean scene understanding.
- The observable-action requirement prevents `복기` from becoming a magic pass word.
- A re-evaluated historical response is evidence for the gate, not proof of a newly completed persisted E2E.
