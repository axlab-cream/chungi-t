# Review Report - task-tone-v2-p01-review-session-scene

## 1. Scope
- Task id: task-tone-v2-p01-review-session-scene
- Reviewed files:
- `../src/report/tone-v2-review.ts`
- `../tests/unit/tone-v2-generation.test.ts`
- `../tone-v2/evaluations/P01-review-session-scene-20260912.json`
- `../docs/superpowers/plans/2026-09-12-tone-v2-review-session-scene.md`
- Review time: 2026-09-12T06:46:47Z

## 2. Verdict
- Changes requested
- Summary: The slice is narrow and the historical provider attempt is correctly described as replay evidence only. However, the new review-session recognizer has regex boundary issues that can accept generic/non-review actions as scenes and reject a natural concrete `마킹 검토` setting.

## 3. Critical Issues
- None.

## 4. Major Issues
- [`../src/report/tone-v2-review.ts:669`] Issue: `hasAffirmativeAction` accepts nominal/adnominal action forms and any matching action anywhere in the same sentence. For example, `다음 복기에서 기록하기가 중요해.` and `다음 복기에서 잘해봐, 시험장 위치를 확인해.` evaluate as scenes even though the first is generic advice and the second action is not tied to the review session.
- Risk: Generic review advice or unrelated same-sentence actions can satisfy ZIP-003-040, weakening acceptance item 2.
- Recommendation: Require a concrete review target/object near the action, or restrict accepted action forms to bounded commands/finite review actions. Add counterexample tests for `기록하기/기록하는 습관` and unrelated same-sentence actions.

- [`../src/report/tone-v2-review.ts:668`] Issue: `마킹 검토` only matches `마킹 검토를 할 때`, `마킹 검토를 하면서`, or `마킹 검토에서`; it rejects the natural bounded sentence `마킹 검토할 때 표시 실수를 확인해.`
- Risk: A concrete review setting plus observable action can still be missed, contrary to acceptance item 1.
- Recommendation: Make the object particle optional for `마킹 검토(?:를\s*)?(?:할\s*때|하면서)` and add a unit test for the no-particle form.

## 5. Minor Issues
- [`../src/report/tone-v2-review.ts:670`] Issue: `negatesAction` rejects the whole sentence if any action stem is negated. A mixed sentence such as `다음 복기에서 기록하지 말고, 찍은 이유만 나눠봐.` is rejected despite containing an affirmative review action.
- Risk: Natural contrastive guidance may be false-negative.
- Recommendation: Tie negation to the matched affirmative action or reject only when no non-negated action remains.

## 6. Verification Gaps
- Gap: The unit test covers pure negated actions and basic positive fixtures, but not nominalized generic actions, unrelated same-sentence actions, no-particle `마킹 검토할 때`, or mixed negation plus affirmative action.
- Suggested check: Add focused assertions for those boundary cases and rerun the focused ZIP common 4 test plus full regression.

- Gap: In the current worktree, the four reviewed paths appear as untracked, and `git diff -- <paths>` returns no patch. A plain git diff check would not audit untracked file content.
- Suggested check: Run conflict-marker/whitespace/scope checks directly over the listed paths, or stage/add them before relying on `git diff --check`.

## 7. Final Recommendation
- Next action: Tighten the review-session regex boundaries, add the missing boundary tests, then rerun focused 59/59, full regression 674/674, typecheck, Vercel build, and an explicit check that includes untracked slice files.