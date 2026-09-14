# Review Report - task-tone-v2-p04-quit-fortune-full-outline-generate

## 1. Scope
- Task id: task-tone-v2-p04-quit-fortune-full-outline-generate
- Reviewed files: scripts/check-quit-fortune-outline-live.ts; src/report/report-generator.ts; src/report/tone-v2-review.ts; src/report/interpretation-validation.ts; tests/unit/reading-live-harness.test.ts; tests/unit/tone-v2-generation.test.ts; tests/unit/report-content-guards.test.ts; tests/unit/report-persistence.test.ts; tests/unit/work-quit-service.test.ts; tests/unit/quit-fortune-outline.test.ts; tone-v2/evaluations/P04-quit-fortune-full-outline-generation-20260913.json; relevant surrounding code in scripts/reading-live-environment.ts, src/report/report-queue.ts, src/report/report-store.ts, src/work/quit-service.ts
- Review time: 2026-09-12T20:16:48Z

## 2. Verdict
- Changes requested
- Summary: The reported 48/48 evaluation is internally consistent and the evidence artifact stores hashes/statistics rather than provider prose. However, the quit_fortune harness has a fail-open postcondition gap for retry/recovery paths, so the harness contract does not yet prove the required full-prefix completion in all completion modes.

## 3. Critical Issues
- None.

## 4. Major Issues
- [scripts/check-quit-fortune-outline-live.ts:106] Issue: The full-prefix completion assertion is skipped whenever `--retry-section` or `--recover-section` is used: `if (failedIndex < 0 && !retrySectionId && !recoverSectionId)`.
- Risk: A retry/recovery run can exit successfully after completing only the targeted section while later requested prefix sections remain pending. Replay still checks completed sections only, so a partial checkpoint can be mistaken for a valid full-prefix pass. This directly violates the requirement that retry/recovery cannot silently skip the required full-prefix completion postcondition. The static test at [tests/unit/reading-live-harness.test.ts:71] currently locks in this exclusion.
- Recommendation: Mirror the pass_angle harness behavior by asserting `requestedCompleted.length === maxSections` whenever `failedIndex < 0`, regardless of retry/recovery mode, or introduce an explicit partial-checkpoint mode that cannot be reported as final success. Add an executable regression covering retry/recovery with later pending sections.

## 5. Minor Issues
- [src/report/interpretation-validation.ts:23] Issue: The terrain/internal-term guard has only a left boundary: `(?<![\p{L}\p{N}])(?:DEM|고도|사면|능선|골짜기)`.
- Risk: Ordinary Korean words beginning with those syllables after a boundary, such as `고도화...`, can be falsely rejected as internal terrain leakage. The test at [tests/unit/report-content-guards.test.ts:19] covers `두고도` but not right-boundary cases.
- Recommendation: Add a right boundary or terrain-context qualifier, and cover both valid ordinary words and true internal terrain labels.

## 6. Verification Gaps
- Gap: Harness coverage is mostly source-regex based for the new quit_fortune script, and it does not execute the retry/recovery partial-prefix failure mode.
- Suggested check: Add a direct harness or unit-level simulation that verifies retry/recovery exits non-successfully unless the requested prefix is complete, then rerun focused tests plus the full suite.

## 7. Final Recommendation
- Next action: Fix the retry/recovery full-prefix postcondition first, add the missing regression, then rerun the focused harness/generation tests and full test suite before accepting the 48/48 closure.