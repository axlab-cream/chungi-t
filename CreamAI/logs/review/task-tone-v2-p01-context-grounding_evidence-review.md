# Review Report - task-tone-v2-p01-context-grounding

## 1. Scope
- Task id: task-tone-v2-p01-context-grounding
- Reviewed files: `src/report/tone-v2-review.ts`, `tests/unit/tone-v2-generation.test.ts`, `docs/superpowers/plans/2026-09-12-tone-v2-context-grounding.md`
- Review time: 2026-09-12T05:41:36Z

## 2. Verdict
- Changes requested
- Summary: The additive grounding path is scoped correctly at a high level, but it still permits cross-field/non-user-string accumulation and misses common Korean particle forms. The new test passes, but it does not lock the captured output or the main false-positive/privacy boundaries.

## 3. Critical Issues
- None.

## 4. Major Issues
- [src/report/tone-v2-review.ts:503-531] Issue: `contextGroundingFacts` collects every string under `context` except a small skip-key set, and `hasContextGrounding` accumulates shared tokens globally instead of preserving fact boundaries.
- Risk: Generic one-token overlaps from unrelated fields, enum/internal strings, or server-calculated context strings can combine into `grounding: true` without a real user fact being reused.
- Recommendation: Restrict extraction to explicit user-entered/public fact paths and require either multiple tokens from the same fact or clearly specific tokens from approved fact fields. Add a negative test for cross-field accumulation.

- [src/report/tone-v2-review.ts:485-489] Issue: Korean particle normalization omits common endings such as `이라`, `이라는`, `이라면`, `라는`, and standalone `로`.
- Risk: A valid reuse like context `객관식 반복 실수` versus output `객관식이라 반복 실수...` can remain `grounding: false`, recreating the false-negative class this slice is meant to fix.
- Recommendation: Extend the suffix normalization and cover the captured-style `객관식이라` case directly.

- [tests/unit/tone-v2-generation.test.ts:224-239] Issue: The test uses a captured-style sentence, but does not assert against the actual stored captured output/hash, nor does it test cross-field accumulation, enum/non-user strings, or `savedChat`/`name` exclusion.
- Risk: The test can pass while the production density gate still accepts weak overlap or regresses privacy boundaries.
- Recommendation: Add focused negatives for cross-field tokens, context enum strings, `name`, and `savedChat`, plus a positive using the exact captured sentence from the evaluation artifact.

## 5. Minor Issues
- [docs/superpowers/plans/2026-09-12-tone-v2-context-grounding.md:18-37] Issue: The plan still shows all task checkboxes unchecked and records no RED/GREEN or re-evaluation evidence.
- Risk: The implementation state is hard to audit against the stated workflow.
- Recommendation: Update the plan or companion evidence artifact after verification.

## 6. Verification Gaps
- Gap: Focused test passes locally (`tests/unit/tone-v2-generation.test.ts`, 31/31), but no full regression/typecheck/Vercel build evidence for this specific task was found.
- Suggested check: Run and record focused, full regression, typecheck, and build checks.

- Gap: No privacy-boundary test proves `savedChat` and `name` cannot satisfy grounding.
- Suggested check: Add explicit assertions where only `name` or `savedChat` overlaps with the output and `elements.grounding` remains false.

## 7. Final Recommendation
- Next action: Fix token extraction/normalization, strengthen the test matrix around captured output and false positives, then rerun focused and regression verification.