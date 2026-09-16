# Pass Angle Next-Criterion Recognition Implementation Plan

> **For agentic workers:** Execute this one small slice inline with RED → GREEN evidence. Do not start another Tone V2 rule or service.

**Goal:** Make the paid-density gate recognize a concrete, targeted `pass_angle` next action such as `다음 시험 전날 루틴으로 다시 세워봐` without accepting vague advice.

**Architecture:** Keep `reviewPaidSectionDensity` as the single deterministic gate. Extend only its next-criterion vocabulary for object-targeted Korean action verbs already required by the source persona; do not weaken grounding, scene, safety, voice, or action-target checks. Re-evaluate the previously captured synthetic output and run one isolated actual-provider check.

**Tech Stack:** TypeScript, Node test runner through `tsx`, existing isolated live-reading harness.

## Global Constraints

- Source: common prompt §4 and `프롬프트/pass_angle.md` (`항목마다 다음에 무엇을 할지 한 줄로 닫습니다`).
- No retry-count, model, UI, DB, auth, payment, corpus, or Production change.
- Vague copy such as `다음에는 잘해봐` must remain rejected.
- Actual provider evaluation uses synthetic input and ignored isolated cache only.

---

### Task 1: Reproduce the recognizer false negative

**Files:**
- Modify: `tests/unit/tone-v2-generation.test.ts`

**Interfaces:**
- Consumes: `reviewPaidSectionDensity(input)`
- Produces: a regression fixture for explicit future cue + action target + `세워봐`, plus a vague counterexample.

- [ ] Add the concrete `pass_angle` output fixture and assert `nextCriterion === true`.
- [ ] Add `다음에는 잘해봐` and assert `nextCriterion === false`.
- [ ] Run the focused test and record the expected concrete-fixture failure.

### Task 2: Extend the smallest deterministic boundary

**Files:**
- Modify: `src/report/tone-v2-review.ts`

**Interfaces:**
- Consumes: the current next-criterion sentence and existing future/ordering cues.
- Produces: recognition of targeted `고정`, `세우`, `바꾸`, `남기`, `버리`, `끊` actions while keeping generic `하다` outside the boundary.

- [ ] Change only the `nextCriterion` matcher.
- [ ] Run focused generation tests and related persistence/content-guard tests.

### Task 3: Verify actual output and preserve evidence

**Files:**
- Create: `tone-v2/evaluations/P01-pass-angle-next-criterion-20260912.json`
- Modify: `tone-v2/task-progress.json`, `tone-v2/STATUS.md`, `tests.md`, `status.md`

- [ ] Re-evaluate the prior captured output without changing its text.
- [ ] Run one new isolated synthetic `pass_angle` provider generation.
- [ ] Run compiler/task tests, full regression, typecheck, Vercel build, and diff check.
- [ ] Record independent review disposition and sanitized CreamWIKI knowledge.

## Self-review

- Scope covers one root cause: the recognizer vocabulary omitted concrete short imperative verbs used by the assigned persona.
- It does not relax the four required paid-density elements.
- It includes a false-positive counterexample and does not use placeholders.
