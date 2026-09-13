# Review Report - task-tone-v2-p01-adjacent-next-criterion

## 1. Scope
- Task id: task-tone-v2-p01-adjacent-next-criterion
- Reviewed files: `src/report/tone-v2-review.ts`, `tests/unit/tone-v2-generation.test.ts`, `tone-v2/evaluations/P01-adjacent-next-criterion-20260912.json`
- Review time: 2026-09-12T07:49:46Z

## 2. Verdict
- Changes requested
- Summary: 0 critical / 2 major / 0 minor. Saved replay evidence is represented consistently: the persisted record hash matches `1423900f1e5e74739e3dec8ba8cac58c3c1f826e7560ef12c3e949bfd1687a24`, report `d1d5fefcbf022006aec2aecf28f9` remains `failed`, and the evaluation records `rewritten: false`. However, the current nextCriterion gate still has concrete false positives for targetless, negated, and abandonment-adjacent wording.

## 3. Critical Issues
- None.

## 4. Major Issues
- [src/report/tone-v2-review.ts:707] Issue: The same-sentence `nextCriterion` regex still accepts marker + action words without requiring a concrete target or checking negation/abandonment. Verified examples that pass: `다음에는 확인해.`, `오늘 준비물만 기록해 보지 마.`, and `오늘 공부를 포기할 이유를 확인해.`
- Risk: The bounded adjacent helper can be correct, but `elements.nextCriterion` can still become `true` through the earlier broad regex for wording that the slice explicitly says should be rejected.
- Recommendation: Route same-sentence nextCriterion candidates through the same concrete-target, negation, and exam/study-abandonment filters, or replace the broad regex with sentence-level candidate checks. Add same-sentence negative tests.

- [src/report/tone-v2-review.ts:685] Issue: `negatedAction` only checks negation after the action verb. Prefix negation in the adjacent action sentence still passes, e.g. `오늘 남길 건 오답노트야. 준비물만 안 기록해.`
- Risk: Korean negation commonly appears before the verb, so the helper still has a false positive class for negated actions.
- Recommendation: Detect pre-action negators such as `안`, `못`, and `하지 말` around the candidate action span, not only suffixes after `기록해|확인해|...`. Add a regression test next to `tests/unit/tone-v2-generation.test.ts:251-257`.

## 5. Minor Issues
- None.

## 6. Verification Gaps
- Gap: Focused suite passed locally: `tests/unit/tone-v2-generation.test.ts` ran 33/33 passing.
- Suggested check: After fixing the major issues, rerun the focused suite and include same-sentence/prefix-negation cases.

- Gap: The related 60-test command could not be fully reproduced in the current read-only reviewer sandbox; it reported 52/60 passing, with 8 `report-persistence` failures caused by `EPERM` creating `.cache/report-snapshots/locks/*`.
- Suggested check: Rerun the related suite in the normal writable project environment to confirm the reported 60/60.

## 7. Final Recommendation
- Next action: Fix the nextCriterion false positives above, add targeted regressions for same-sentence and prefix-negated actions, then rerun focused and related suites.