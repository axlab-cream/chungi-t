# Review Report - task-tone-v2-p01-review-session-scene

## 1. Scope
- Task id: task-tone-v2-p01-review-session-scene
- Reviewed files: `../src/report/tone-v2-review.ts`, `../tests/unit/tone-v2-generation.test.ts`, `../tone-v2/evaluations/P01-review-session-scene-20260912.json`, `../docs/superpowers/plans/2026-09-12-tone-v2-review-session-scene.md`, verification artifacts under `CreamAI/logs/`, `CreamAI/reports/`, `../tone-v2/STATUS.md`
- Review time: 2026-09-12T06:57:15Z

## 2. Verdict
- Changes requested
- Summary: The historical provider attempt is correctly recorded as replay evidence only, and the code stays in the deterministic density gate. However, the review-session regex still has concrete boundary misses, and task evidence artifacts conflict with the claimed verification/scope status.

## 3. Critical Issues
- None.

## 4. Major Issues
- [../src/report/tone-v2-review.ts:670-672] Issue: The recognizer only searches the 60 characters after the matched setting and requires the review target to appear after that setting. Natural bounded scenes where the object precedes the setting, such as `오답을 오답노트에 기록해.`, `표시 실수는 마킹 검토에서 확인해.`, or `찍은 이유는 복기 때 기록해.`, are rejected.
- Risk: Acceptance item 1 is not fully met; a concrete review setting plus observable action in the same sentence can still fail `scene`.
- Recommendation: Match within a bounded sentence window around the setting, or explicitly support object-before-setting forms. Add positive fixtures for these cases.

- [../src/report/tone-v2-review.ts:671] Issue: `하고` is treated as an affirmative ending without guarding following negation/desire forms. For example, `다음 복기에서 찍은 문제를 분류하고 싶지 않아.` can satisfy the target-action regex even though it is not an affirmative observable action.
- Risk: Negated/non-action review prose can pass `scene`, weakening acceptance item 2.
- Recommendation: Add a local negation guard for `하고 싶지/않/말` forms, or accept `하고` only when followed by another affirmative review action. Add counterexample tests.

- [CreamAI/reports/task-tone-v2-p01-review-session-scene_final.md:15-50] Issue: The task final report lists unrelated changed files including prompt, server, UI, persistence, and deployment-adjacent files.
- Risk: This conflicts with the stated narrow slice and makes scope/audit evidence look like prompt/provider/persistence/UI/deployment behavior changed.
- Recommendation: Correct the task report to list only in-scope slice artifacts, or clearly label unrelated prior work separately.

## 5. Minor Issues
- None.

## 6. Verification Gaps
- Gap: `CreamAI/logs/test/task-tone-v2-p01-review-session-scene_test-summary.json:7-12` records no test commands and only warns that `package.json` has no test script, while `../tone-v2/STATUS.md:214` claims focused 59/59, compiler/task 7/7, full 674/674, typecheck, Vercel build, and diff check PASS.
- Suggested check: Persist the exact command transcripts or machine-readable summaries for the claimed focused, compiler/task, typecheck, build, and diff checks.

- Gap: `CreamAI/logs/harness/task-tone-v2-p01-review-session-scene_implementation.json:7-9` records a failed implementation harness secret scan, although `CreamAI/logs/harness/task-tone-v2-p01-review-session-scene_credential-boundary.json:4-17` records a narrower credential scan PASS.
- Suggested check: Resolve or explicitly supersede the failed harness artifact before treating implementation evidence as clean.

- Gap: The four reviewed slice files appear untracked in `git status --short`, and `git diff -- <paths>` returned no patch, so a normal `git diff --check` would not audit their contents.
- Suggested check: Stage/intent-to-add the slice files or run explicit whitespace/conflict checks over untracked paths.

## 7. Final Recommendation
- Next action: Tighten the remaining regex boundaries, add the missing positive/negative fixtures, then rerun and persist focused 59/59, compiler/task 7/7, full regression 674/674, typecheck, Vercel build, and a diff/whitespace check that includes untracked slice files.