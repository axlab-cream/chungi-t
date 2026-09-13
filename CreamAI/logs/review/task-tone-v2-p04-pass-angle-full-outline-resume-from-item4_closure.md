# Review Report - task-tone-v2-p04-pass-angle-full-outline-resume-from-item4

## 1. Scope
- Task id: task-tone-v2-p04-pass-angle-full-outline-resume-from-item4
- Reviewed files:
  - src/report/tone-v2-review.ts
  - tests/unit/tone-v2-generation.test.ts
  - scripts/check-pass-angle-outline-live.ts
  - src/report/report-queue.ts
  - tests/unit/report-persistence.test.ts
- Review time: 2026-09-12T17:31:00Z

## 2. Verdict
- Changes requested
- Summary: Zero critical issues found, but there are major correctness gaps in the deterministic scene gate, saved-attempt recovery review equivalence, and the live-outline verifier’s ability to pass incomplete records.

## 3. Critical Issues
- Zero critical issues found.

## 4. Major Issues
- [src/report/tone-v2-review.ts:669] Issue: `hasRecognizableScene` treats bare example markers such as `예를 들어`, `가령`, or `만약` as a complete recognizable scene, without requiring any concrete setting, object, or observable action.
- Risk: A generated section can satisfy the required `scene` density element with placeholder/example framing only, allowing real output defects through the production-equivalent review.
- Recommendation: Require the example marker to be paired with a concrete scene noun/action pattern, and add RED/GREEN tests where marker-only text fails.

- [src/report/report-queue.ts:49] Issue: saved-attempt recovery reviews the raw attempt with `siblings: current.report.sections.filter(...status === 'complete')`, which includes later completed sections, not just prior completed sections in report order.
- Risk: This is not production-equivalent for the recovered item. Later sections can mask first-use technical-term failures or alter uniqueness checks, causing an invalid saved raw attempt to be promoted.
- Recommendation: Use only `current.report.sections.slice(0, position).filter(status === 'complete')` for recovery review, and reject recovery when any later section already has attempts or a non-pending status.

- [scripts/check-pass-angle-outline-live.ts:99] Issue: the checker computes `completed` but never asserts that the requested prefix is complete when there is no failed item.
- Risk: An interrupted run with pending sections and no failed section can exit successfully after replaying only the completed subset, so the script’s pass status does not prove `52/52` completion.
- Recommendation: Assert `completed.length === maxSections` when `failedIndex < 0`; for the default run, also assert `client.progress.complete === 52`.

## 5. Minor Issues
- Zero minor issues found.

## 6. Verification Gaps
- Gap: No test currently proves marker-only example text fails the scene requirement.
- Suggested check: Add unit cases in `tests/unit/tone-v2-generation.test.ts` for `예를 들어` / `만약` without a concrete scene.

- Gap: No harness test covers an incomplete, no-failure record passing `check-pass-angle-outline-live.ts`.
- Suggested check: Add a fixture or static/behavioral test that requires completion assertion for the requested limit.

## 7. Final Recommendation
- Next action: Fix the three major issues, add focused RED/GREEN tests, then rerun the focused 65-test suite and the full repository test suite.