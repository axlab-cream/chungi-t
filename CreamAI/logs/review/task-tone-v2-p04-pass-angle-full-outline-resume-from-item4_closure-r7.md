# Review Report - task-tone-v2-p04-pass-angle-full-outline-resume-from-item4

## 1. Scope
- Task id: task-tone-v2-p04-pass-angle-full-outline-resume-from-item4
- Reviewed files:
  - src/report/tone-v2-review.ts
  - tests/unit/tone-v2-generation.test.ts
  - scripts/check-pass-angle-outline-live.ts
  - Relevant callers/evidence: src/report/report-generator.ts, src/report/report-queue.ts, src/report/report-store.ts, tests/unit/report-persistence.test.ts, tests/unit/reading-live-harness.test.ts, task closure summaries
- Review time: 2026-09-12T18:16:25Z

## 2. Verdict
- Changes requested
- Summary: Zero Critical issues found. Found three Major deterministic guard blind spots: pass_angle-style future certainty, broad `관찰` safety bypass, and post-action negation particles.

## 3. Critical Issues
- Zero critical issues found.

## 4. Major Issues
- [src/report/tone-v2-review.ts:60] Issue: `CERTAIN_FUTURE_EVENT_PATTERN` misses pass_angle-native certainty forms such as `올해 합격해.`, `올해 붙어.`, `운이 나빠 떨어져.`, and `불합격해.` because the event list omits `붙/떨어` stems and the ending alternatives omit bare 반말 `해`.
- Risk: Production-equivalent review can approve direct 합격/불합격 predictions in the pass_angle service voice, violating the “never weaken safety” constraint.
- Recommendation: Add RED cases for `합격해`, `불합격해`, `붙어/붙을 거야`, and `떨어져/떨어질 거야`; expand the future-event guard without weakening existing conditional/negated safe cases.

- [src/report/tone-v2-review.ts:58] Issue: `CONDITIONAL_PATTERN` still treats any sentence containing `관찰` as conditional, and certainty checks skip those sentences at lines 397, 405, and 412.
- Risk: Definite unsafe claims can bypass future-event or third-party-mind review by appending observation wording, e.g. `상대 마음은 이미 떠났다고 관찰돼요.` or `회사는 곧 구조조정한다고 관찰돼요.`
- Recommendation: Do not let bare `관찰` suppress certainty checks. Narrow it to genuinely bounded observation phrases or continue scanning the same sentence for prohibited outcomes and mind/private-fact claims.

- [src/report/tone-v2-review.ts:733] Issue: `negatedNextAction` covers `생각은/생각이`, `의사는`, and `계획은`, but misses common particles such as `도`. A sentence like `오늘 준비물을 확인해 볼 계획도 없어.` can still satisfy `targetedNextAction` before negation is applied.
- Risk: The next-criterion gate can accept an explicitly refused action as a valid concrete next action, weakening the negation guard.
- Recommendation: Extend post-action refusal matching to particles such as `도/조차` and add RED/GREEN tests beside the existing cases at tests/unit/tone-v2-generation.test.ts:302.

## 5. Minor Issues
- Zero minor issues found.

## 6. Verification Gaps
- Gap: Missing RED tests for pass_angle-specific certainty verbs.
- Suggested check: Add focused cases for `합격해`, `붙어`, `떨어져`, and `불합격해`.

- Gap: Missing safety bypass tests for broad `관찰` wording.
- Suggested check: Add future-event and third-party-mind examples that include `관찰` but remain definite claims.

- Gap: Missing post-action negation particle coverage.
- Suggested check: Add `계획도 없어`, `생각도 없어`, and `의사도 없어` next-criterion negatives.

- Gap: I reviewed the provided verification summaries and source, but did not rerun the full suite in the read-only reviewer sandbox.
- Suggested check: After fixes, rerun focused tone-v2/report-persistence tests, full repository tests, typecheck/build, and the 52/52 live replay.

## 7. Final Recommendation
- Next action: Fix the three Major guard issues, add RED/GREEN tests, then rerun the focused/full verification and 52/52 production-equivalent replay before approval.