# Review Report - task-tone-v2-p01-review-session-scene

## 1. Scope
- Task id: task-tone-v2-p01-review-session-scene
- Reviewed files: `../src/report/tone-v2-review.ts`, `../tests/unit/tone-v2-generation.test.ts`, `../tone-v2/evaluations/P01-review-session-scene-20260912.json`, `../docs/superpowers/plans/2026-09-12-tone-v2-review-session-scene.md`
- Review time: 2026-09-12T06:36:57Z

## 2. Verdict
- Changes requested
- Summary: Scope is narrow and the historical replay evidence is described correctly, but the new scene regex still has actionable false positives and false negatives around the observable-action boundary.

## 3. Critical Issues
- None.

## 4. Major Issues
- [../src/report/tone-v2-review.ts:667] Issue: The action alternatives are bare stems/nouns, and several have no negation guard. This can mark non-actions or negated actions as recognizable scenes, e.g. `복기 때 기록 기준이 중요해.`, `다음 복기에서 기록은 하지 말고 쉬어.`, `다음 복기에서 나누지 말고 쉬어.`
- Risk: Acceptance item 1/2 is weakened because a review setting plus a bare noun or negated action can satisfy `elements.scene` without an observable review action.
- Recommendation: Require affirmative action endings or object-action forms for `나누/나눠/분류/기록/확인/비교/표시/체크/적어/되짚`, and add negative fixtures for particle-separated negation and noun-only forms.

- [../src/report/tone-v2-review.ts:667] Issue: Common bounded review settings are still missed, including spaced `오답 노트에 지식 부족을 기록해.` and connector form `마킹 검토에서 표시 실수를 확인해.`
- Risk: Provider output can contain a concrete review setting plus observable action in the same sentence and still fail `scene`.
- Recommendation: Either support these common orthographic/connector variants with fixtures, or document them as intentionally out of scope for this slice.

## 5. Minor Issues
- None.

## 6. Verification Gaps
- Gap: The direct unit file rerun passed as 32/32, but the claimed focused 59/59 suite was not found as a task-specific persisted test summary under `CreamAI/logs/test/`; only preflight harness evidence was present.
- Suggested check: Persist the exact focused 59/59 command transcript or summary for this task.

- Gap: The listed slice files appear untracked in `git status --short`, so a plain `git diff --check` would not validate them.
- Suggested check: Use intent-to-add/tracking before relying on diff checks, or run whitespace/diff validation explicitly over these untracked paths.

- Gap: Full regression/typecheck/build were not independently reproducible in the read-only reviewer sandbox; full `npm test` hit temp-directory permission failures unrelated to this slice. `../tone-v2/latest-regression.log` does record 674/674 PASS.
- Suggested check: Re-run full regression, typecheck, Vercel build, compiler/task 7/7, and diff check in the writable PM environment after regex fixes.

## 7. Final Recommendation
- Next action: Fix the regex boundary and add the missing false-positive/false-negative fixtures, then rerun and persist focused, compiler/task, full regression, typecheck, Vercel build, and diff-check evidence.