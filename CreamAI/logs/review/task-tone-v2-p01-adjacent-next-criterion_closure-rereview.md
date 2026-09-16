# Review Report - task-tone-v2-p01-adjacent-next-criterion

## 1. Scope
- Task id: task-tone-v2-p01-adjacent-next-criterion
- Reviewed files: `src/report/tone-v2-review.ts`, `tests/unit/tone-v2-generation.test.ts`, `tone-v2/evaluations/P01-adjacent-next-criterion-20260912.json`
- Review time: 2026-09-12T07:54:50Z

## 2. Verdict
- Changes requested
- Summary: 0 critical / 1 major / 0 minor. Saved replay evidence is represented consistently: the cache record hash matches `1423900f1e5e74739e3dec8ba8cac58c3c1f826e7560ef12c3e949bfd1687a24`, report `d1d5fefcbf022006aec2aecf28f9` remains persisted `failed`, and the evaluation records `rewritten: false`. Focused suite passed 33/33 locally, but one abandonment-coverage hole remains.

## 3. Critical Issues
- None.

## 4. Major Issues
- [src/report/tone-v2-review.ts:682] Issue: The exam/study abandonment guard is too surface-form-bound and not fully negation-aware. The tests reject `오늘 공부를 포기할 이유를 확인해.` at `tests/unit/tone-v2-generation.test.ts:222`, but semantically equivalent candidates such as `오늘 공부를 버릴 이유를 확인해.` and `오늘 공부를 끊을 이유를 확인해.` still satisfy `nextCriterion` because `버릴` / `끊을` do not match `버려|끊어|포기`. Conversely, `오늘 공부를 포기하지 말고 준비물만 기록해.` is rejected even though the abandonment is negated and the concrete target/action is safe.
- Risk: The slice can still produce false positives for study-abandonment framing and false negatives for safe anti-abandonment guidance.
- Recommendation: Make `unsafeNextCriterion` candidate-aware: cover common abandonment inflections such as `버리/버릴`, `끊/끊을`, `접`, `그만두`, `포기`, while excluding negated spans like `포기하지 말고`. Add regressions beside `tests/unit/tone-v2-generation.test.ts:219-224` and `tests/unit/tone-v2-generation.test.ts:254-260`.

## 5. Minor Issues
- None.

## 6. Verification Gaps
- Gap: Current regressions cover `포기할`, imperative `시험을 버려`, and `공부를 끊어`, but not equivalent attributive forms or negated-abandonment-safe wording.
- Suggested check: Add the three examples above and rerun the focused 33-test suite plus the writable related suite reported as 60/60.

## 7. Final Recommendation
- Next action: Fix the abandonment guard coverage, add targeted regressions, then rerun the focused and related suites before approving the slice.