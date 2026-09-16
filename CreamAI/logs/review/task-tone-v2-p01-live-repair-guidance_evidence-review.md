# Review Report - Tone V2 live repair guidance slice

## 1. Scope
- Task id: task-tone-v2-p01-live-repair-guidance
- Reviewed files: src/report/report-generator.ts; tests/unit/report-persistence.test.ts; tone-v2/evaluations/P01-live-repair-guidance-20260912.json; tone-v2/task-progress.json; relevant retry/gate code in src/report/report-queue.ts and src/report/interpretation-validation.ts
- Review time: 2026-09-12T05:03:43Z

## 2. Verdict
- Changes requested
- Summary: Repair guidance is clearer and the evidence correctly keeps ZIP-003-068/094 IN_PROGRESS, but the implementation still misses acceptance coverage for user-triggered retries and weakens the effective minimum quality gate.

## 3. Critical Issues
- None.

## 4. Major Issues
- [src/report/report-generator.ts:2128] Issue: Repair guidance is only appended when `options.repairIssues?.length` is present; user-triggered retries after a failed section start with `issues = []` in src/report/report-queue.ts:46 and pass that empty list at src/report/report-queue.ts:60.
- Risk: A real retry from `/api/report/section` can spend its first new attempt without restating the one-Hanja-explanation and 2-4-sentences-per-paragraph invariants, so the “every retry restates” acceptance is not met for failed-section retries.
- Recommendation: Seed `repairIssues` from the latest failed attempt/section error when `params.retry === true`, or always include the invariant guidance on any retry call even before a new validation failure.

- [src/report/interpretation-validation.ts:14] Issue: The effective length/density gate is now only 80 characters plus 3 sentence-ending marks, and tests accept `newToneReading` as complete at tests/unit/report-persistence.test.ts:28 and tests/unit/report-persistence.test.ts:148.
- Risk: This weakens the previous paid-report quality floor and allows very short paid sections to be labeled `complete`, conflicting with “retry count and quality gates are not weakened.”
- Recommendation: Keep the new 2-4 sentence paragraph rule, but restore an explicit minimum density appropriate to paid sections or prove via service-specific gates that the old floor is intentionally replaced without reducing paid output quality.

## 5. Minor Issues
- [tests/unit/report-persistence.test.ts:150] Issue: The retry guidance test checks ordered issue presentation but does not create duplicate validation failures.
- Risk: The exact dedup behavior in src/report/report-generator.ts:2102 could regress without this test catching it.
- Recommendation: Add a regression where the same failure appears more than once and assert the repair message lists it once.

## 6. Verification Gaps
- Gap: No regression uses secret-like or customer-prose-like content in a failed attempt.
- Suggested check: Add a failed first response containing quoted customer prose and a secret-like token, then assert the repair message contains only sanitized issue labels and invariant guidance.

- Gap: Representative live evidence is only three synthetic services.
- Suggested check: Keep ZIP-003-068 and ZIP-003-094 IN_PROGRESS until the all-service live acceptance run confirms the same target-rule behavior across the full service set.

## 7. Final Recommendation
- Next action: Fix retry seeding/guidance and restore or justify the paid-section density gate before approving this slice.