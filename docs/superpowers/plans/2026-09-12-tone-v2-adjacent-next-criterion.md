# Adjacent Next Criterion Implementation Plan

> **For agentic workers:** Execute this one runtime boundary inline with RED → minimal GREEN → review. Do not call the provider or address the separate paragraph rule.

**Goal:** Recognize a bounded time/plan sentence immediately followed by a concrete safe action as one next criterion.

**Architecture:** Keep existing same-sentence branches unchanged. Add one helper that examines adjacent sentence pairs only: the first sentence must contain a future/current plan marker and a decision target, and the next must contain a particle-marked concrete object before a safe review action. Reject targetless, past-only, vague, and abandonment language.

**Tech Stack:** TypeScript, Node test runner, existing deterministic Tone V2 review.

## Global Constraints

- Modify only `src/report/tone-v2-review.ts`, its focused tests, and Task evidence/docs.
- No prompt, provider, model, retry, persistence, UI, DB, auth, payment, deployment, or Production change.
- Do not weaken existing abandonment negatives.

### Task 1: RED reproduction

**Files:**
- Modify: `tests/unit/tone-v2-generation.test.ts`
- Reference: `tone-v2/evaluations/P01-pass-angle-e2e-rerun-20260912.json`

- [x] Add the exact clean attempt-2 structure and expect `nextCriterion === true`.
- [x] Add counterexamples for `다음에는 잘해봐`, bare `기록해`, past-only `기록했어`, and `시험을 버려`/`공부를 끊어`.
- [x] Run the focused test and confirm only the new positive fails.

### Task 2: Minimal adjacent-pair implementation

**Files:**
- Modify: `src/report/tone-v2-review.ts`

**Interface:**
- Produce: `hasAdjacentNextCriterion(text: string): boolean`
- Consume: existing `sentences(text)` and `reviewPaidSectionDensity`.

- [x] Implement an adjacent pair matcher equivalent to:

```ts
const setting = /(?:다음|앞으로|이후|먼저|우선|오늘)[^.!?。\n]{0,60}(?:남길|유지할|비교할|확인할|기록할|볼|기준|루틴|오답\s*노트)/
const targetedAction = /[\p{L}\p{N}]{2,}(?:을|를|만|부터|으로|에)[^.!?。\n]{0,50}(?:기록해|기록하세요|확인해|확인하세요|비교해|비교하세요|점검해|점검하세요|정해|정하세요)/u
```

- [x] Exclude abandonment/cessation wording and combine the helper with the existing same-sentence matcher using logical OR.
- [x] Run the focused test and confirm all positives/negatives pass.

### Task 3: Verify and close

- [x] Re-evaluate the immutable attempt 2 and preserve the historical saved `failed` status.
- [x] Run related, compiler/task, full regression, typecheck, Vercel build, and diff checks.
- [x] Run independent review and apply in-scope findings.
- [x] Update ProjectOps and CreamWIKI, then stop for the next approval.

## Self-review

- The matcher is adjacency-bounded and cannot scan arbitrary later actions.
- A plan-setting sentence alone and an action without a concrete target both remain false.
- Historical records are evidence, not rewritten product state.
