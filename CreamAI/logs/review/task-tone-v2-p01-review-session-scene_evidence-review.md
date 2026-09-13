# Review Report - task-tone-v2-p01-review-session-scene

## 1. Scope
- Task id: task-tone-v2-p01-review-session-scene
- Reviewed files: `../src/report/tone-v2-review.ts`, `../tests/unit/tone-v2-generation.test.ts`, `../tone-v2/evaluations/P01-review-session-scene-20260912.json`, `../docs/superpowers/plans/2026-09-12-tone-v2-review-session-scene.md`
- Review time: 2026-09-12T06:29:52Z

## 2. Verdict
- Changes requested
- Summary: The captured `다음 복기에서 ... 나눠봐` case now passes, the listed basic counterexamples are rejected, and the evaluation correctly records the historical status as `failed`. However, the recognizer still misses common bounded review scenes and can still accept some action-only exam review prose through the existing `ordinaryScene` branch.

## 3. Critical Issues
- None.

## 4. Major Issues
- [../src/report/tone-v2-review.ts:667] Issue: The review-session recognizer only accepts a few setting forms before the action: `복기에서`, `복기할 때`, `오답노트를 열고/펼치고`, and `마킹 검토를 할 때/하면서`. It still rejects concrete bounded review scenes such as `오답노트에 지식 부족을 기록해`, `복기 때 찍은 이유를 기록해`, and `복기하면서 찍은 이유를 기록해`.
- Risk: Future provider output can contain a valid review setting plus observable review action in one sentence and still fail `scene`, especially around the already observed `오답노트에 ... 기록해` pattern.
- Recommendation: Add positive fixtures for `오답노트에 ... 기록/적어` and common `복기 때/복기하면서` connector forms, or explicitly document that these are intentionally out of scope.

- [../src/report/tone-v2-review.ts:666; ../tests/unit/tone-v2-generation.test.ts:280] Issue: The action-only negative fixture is too narrow. Because `ordinaryScene` accepts `문제` followed by `하면` or `에서`, strings like `찍은 문제를 분류하면 다음 기준이 보여` and `틀린 문제에서 지식 부족만 확인해` still pass `scene` without a review-session setting.
- Risk: This weakens acceptance item 2: observable review action without an explicit review setting can still be accepted as a scene.
- Recommendation: Add negative tests that exercise the `문제...하면/에서` path, then decide whether those should remain everyday/hypothetical scenes or be excluded for review-action-only prose.

## 5. Minor Issues
- [../docs/superpowers/plans/2026-09-12-tone-v2-review-session-scene.md:25; ../tests/unit/tone-v2-generation.test.ts:275] Issue: The plan asks for the captured sentence plus two equivalent review-setting positives, but the test asserts only the captured `복기` case and one `오답노트` case. There is no direct test for the implemented `마킹 검토` branch.
- Risk: The third supported setting can regress silently.
- Recommendation: Add a focused positive assertion for `마킹 검토를 하면서/할 때 ... 확인/표시`.

## 6. Verification Gaps
- Gap: The inspected task artifacts do not persist the claimed focused 59/59, compiler/task 7/7, typecheck, Vercel build, and diff-check transcript for this task; only the preflight harness file was found.
- Suggested check: Store a task-specific test summary or command transcript under `CreamAI/logs/test/` or `CreamAI/logs/harness/`.

- Gap: `git diff --check` does not cover the listed slice files while they are untracked in the current worktree.
- Suggested check: Track or intent-to-add the slice files before relying on diff checks, or run an explicit check over untracked paths.

- Gap: Independent compiler/task rerun was blocked by the read-only sandbox because `tone-v2/compile.test.mjs` writes generated output. Focused `tests/unit/tone-v2-generation.test.ts` passed locally as 32/32, and `../tone-v2/latest-regression.log` records 674/674.
- Suggested check: Re-run compiler/task 7/7 in the writable PM environment after the regex boundary fixes.

## 7. Final Recommendation
- Next action: Fix the review-session regex boundary and add the missing positive/negative fixtures, then rerun and persist focused, compiler/task, full regression, typecheck, build, and diff-check evidence without changing provider, persistence, UI, DB, auth, payment, deployment, or Production behavior.