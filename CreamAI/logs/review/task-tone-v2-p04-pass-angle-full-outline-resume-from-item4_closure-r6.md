# Review Report - task-tone-v2-p04-pass-angle-full-outline-resume-from-item4

## 1. Scope
- Task id: task-tone-v2-p04-pass-angle-full-outline-resume-from-item4
- Reviewed files:
  - src/report/tone-v2-review.ts
  - tests/unit/tone-v2-generation.test.ts
  - scripts/check-pass-angle-outline-live.ts
- Review time: 2026-09-12T18:11:41Z

## 2. Verdict
- Changes requested
- Summary: Found no Critical issues. Found one Major regex over-acceptance that weakens the targetless next-action guard, plus one Minor deterministic false-negative risk around evidenced dates.

## 3. Critical Issues
- Zero critical issues found.

## 4. Major Issues
- [src/report/tone-v2-review.ts:708] Issue: `objectMarkedNextTarget` accepts temporal-only operands with `만`, so phrases such as `오늘만 확인해.` and `다음만 기록해.` satisfy the next-criterion gate. The paired comparison regex at [src/report/tone-v2-review.ts:711] has the same shape for temporal `과/와`, e.g. `다음과 비교해봐.`. Because [src/report/tone-v2-review.ts:728] only requires a sentence-level marker, these targetless actions can pass `elements.nextCriterion`.
- Risk: This weakens the explicit targetless-action guard and can allow a section to pass production-equivalent review without a concrete object to confirm, record, or compare.
- Recommendation: Exclude temporal-only terms such as `오늘`, `내일`, `이번`, `다음`, `앞으로`, `먼저`, `우선` before `만/과/와`, or require a concrete non-temporal object token. Add RED tests for `오늘만 확인해.`, `다음만 기록해.`, and `다음과 비교해봐.`, while preserving positives like `준비물만 기록해.` and concrete comparison targets.

## 5. Minor Issues
- [src/report/tone-v2-review.ts:92] Issue: ISO date evidence is normalized only as a single `YYYY-M-D` token, but `reviewScoreVisuals` separately checks localized `년/월/일` tokens at [src/report/tone-v2-review.ts:260]. The synthetic context uses ISO `examDate` at [scripts/check-pass-angle-outline-live.ts:48], while the positive date test only covers ISO-formatted output at [tests/unit/tone-v2-generation.test.ts:771].
- Risk: A grounded exam date rendered naturally as Korean text, such as `2026년 12월 1일`, can be rejected as unsupported despite being present in server/user evidence.
- Recommendation: Normalize ISO date evidence into equivalent localized tokens or make Korean date spans compare against the ISO date token. Add a positive test for an evidenced Korean-formatted date and a negative test for an unsupported one.

## 6. Verification Gaps
- Gap: The current tests cover temporal-origin negatives for `앞으로` and `부터`, but not temporal-only `만/과/와` targets.
- Suggested check: Add focused `reviewPaidSectionDensity` cases for `오늘만 확인해.`, `다음만 기록해.`, `다음과 비교해봐.`, and concrete counterexamples.
- Gap: Date evidence tests do not verify ISO evidence rendered as Korean `년/월/일` prose.
- Suggested check: Add a `reviewScoreVisuals` case where `numericEvidence: ['2026-12-01']` permits `2026년 12월 1일`.
- Gap: I reviewed source and available verification summaries only; I did not rerun the full suite in this read-only sandbox.
- Suggested check: Re-run the focused tone-v2 tests and full repository tests after the regex/date fixes.

## 7. Final Recommendation
- Next action: Fix the temporal-only next-criterion over-acceptance before approval; include the missing RED/GREEN tests, then rerun the focused and full verification commands.