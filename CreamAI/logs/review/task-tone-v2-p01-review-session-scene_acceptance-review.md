# Review Report - task-tone-v2-p01-review-session-scene

## 1. Scope
- Task id: task-tone-v2-p01-review-session-scene
- Reviewed files: `../src/report/tone-v2-review.ts`, `../tests/unit/tone-v2-generation.test.ts`, `../tone-v2/evaluations/P01-review-session-scene-20260912.json`, `../docs/superpowers/plans/2026-09-12-tone-v2-review-session-scene.md`
- Review time: 2026-09-12T06:52:46Z

## 2. Verdict
- Changes requested
- Summary: The slice stays within deterministic scene-density review and correctly treats the immutable provider attempt as replay evidence only. However, the regex still has boundary defects: it can pair an untargeted action with an unrelated target token, and it misses a natural affirmative action ending.

## 3. Critical Issues
- None.

## 4. Major Issues
- [../src/report/tone-v2-review.ts:670-673] Issue: `target.test(reviewAction) && affirmativeAction.test(reviewAction)` does not require the target and action to belong to the same object-action phrase. Sentences such as `다음 복기에서 기록해, 문제는 잊어.` or `다음 복기에서 확인해, 찍은 문제는 넘어가.` can pass because the bare action and a later target token are both inside the 60-character window.
- Risk: Generic or untargeted review commands can satisfy `scene`, weakening acceptance item 2.
- Recommendation: Match a combined target-plus-action pattern, or require the matched action to be adjacent to or syntactically tied to the review target before accepting the sentence.

- [../src/report/tone-v2-review.ts:672] Issue: Core `하` verbs accept `해/하세요/한다/했다/하고/하면서`, but not the common exhortative `하자`. For example, `다음 복기에서 찍은 이유를 기록하자.` is a concrete review setting plus observable action but is rejected.
- Risk: Acceptance item 1 is not fully met for natural Korean review-session wording.
- Recommendation: Add `하자`/equivalent covered endings for the core action verbs and add focused positive fixtures.

## 5. Minor Issues
- [../src/report/tone-v2-review.ts:668; ../tests/unit/tone-v2-generation.test.ts:289] Issue: The test rejects `오답노트에서 지식 부족을 기록해.`, but the setting regex `오답\s*노트...에(?!서)` still accepts the synonymous contraction `오답노트에선 지식 부족을 기록해.`
- Risk: The rejected-counterexample boundary is inconsistent across equivalent particles.
- Recommendation: Either reject `에선` with `에서/에서는`, or intentionally reclassify both forms and update fixtures/evaluation evidence.

## 6. Verification Gaps
- Gap: I could locally confirm `tests/unit/tone-v2-generation.test.ts` passes 32/32, but the task-specific harness files I inspected do not persist the claimed focused 59/59, compiler/task 7/7, typecheck, Vercel build, and diff-check command transcripts.
- Suggested check: Persist the exact verification commands and summaries for this task.

- Gap: The listed slice files appear untracked in the current worktree, so a plain `git diff --check` may not cover them.
- Suggested check: Stage/intent-to-add the slice files or run explicit whitespace/conflict checks over those paths.

## 7. Final Recommendation
- Next action: Tighten the object-action regex boundary, add fixtures for the missed `하자` form and particle contraction case, then rerun and persist focused, compiler/task, full regression, typecheck, Vercel build, and diff-check evidence.