# Review Report - task-tone-v2-p04-pass-angle-full-outline-resume-from-item4

## 1. Scope
- Task id: task-tone-v2-p04-pass-angle-full-outline-resume-from-item4
- Reviewed files: `src/report/tone-v2-review.ts`, `tests/unit/tone-v2-generation.test.ts`, `scripts/check-pass-angle-outline-live.ts`; relevant callers inspected: `src/report/report-generator.ts`, `src/report/report-queue.ts`
- Review time: 2026-09-12T18:03:28Z

## 2. Verdict
- Changes requested
- Summary: Current focused verification fails, and the deterministic safety/date guards still over-accept cases that the task explicitly requires preserving.

## 3. Critical Issues
- [tests/unit/tone-v2-generation.test.ts:171] Issue: The current focused test suite fails because `reviewSafetyClaims({ text: '상대는 돌아올 거야.' }).passed` is still `true` while the test expects `false`.
- Risk: The worktree does not satisfy its own RED/GREEN safety proof, so the reported focused/full PASS evidence is stale for the current uncommitted state.
- Recommendation: Fix the future-event matcher and rerun at least `npx tsx --test tests/unit/tone-v2-generation.test.ts tests/unit/report-persistence.test.ts`.

- [src/report/tone-v2-review.ts:58] Issue: `CERTAIN_FUTURE_EVENT_PATTERN` still misses common 확정 outcome forms such as `올해 합격입니다.`, `올해 합격이에요.`, `올해 합격이야.`, and `상대는 돌아올 거야.`.
- Risk: Production-equivalent replay can approve prohibited certainty about 합격/관계 outcomes, directly violating the “never weaken safety” task constraint.
- Recommendation: Add explicit RED cases for noun-copula and irregular future forms, then expand the guard before accepting closure.

## 4. Major Issues
- [src/report/tone-v2-review.ts:56] Issue: `CONDITIONAL_PATTERN` treats `수 있어` as a blanket safe condition, so claims like `사주로 합격 여부를 알 수 있어.` and `운세로 상대 마음을 알 수 있어.` pass.
- Risk: Symbolic-authority, future-knowledge, and third-party-mind claims can bypass the safety review by using ability wording.
- Recommendation: Do not classify `알 수 있어` authority claims as safe conditional language; add tests for 사주/명식/운세 + 미래/합격 여부/상대 마음 + `알 수 있어`.

- [src/report/tone-v2-review.ts:52] Issue: Date validation only tokenizes unit-suffixed Korean dates, so unsupported ISO-style dates such as `2028-04-02에 변화 기준을 봐요.` pass `reviewScoreVisuals` with empty evidence.
- Risk: Generated reports can invent date values while still passing the “server-evidenced score/date/chart values only” gate.
- Recommendation: Add ISO/date-format detection to numeric/date evidence review and cover it in `tests/unit/tone-v2-generation.test.ts`.

## 5. Minor Issues
- Zero minor issues found.

## 6. Verification Gaps
- Gap: Current focused test run is failing despite the supplied PASS evidence.
- Suggested check: Re-run focused and full verification after the safety fixes and update the closure evidence.

- Gap: No current test covers unsupported ISO-style dates.
- Suggested check: Add negative cases for `YYYY-MM-DD`, `YYYY.MM.DD`, and slash-form dates without server evidence.

## 7. Final Recommendation
- Next action: Fix the safety matcher and date-evidence blind spots, then regenerate verification evidence before approval.