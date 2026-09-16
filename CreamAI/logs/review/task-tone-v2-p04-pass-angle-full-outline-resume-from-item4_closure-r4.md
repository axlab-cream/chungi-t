# Review Report - task-tone-v2-p04-pass-angle-full-outline-resume-from-item4

## 1. Scope
- Task id: task-tone-v2-p04-pass-angle-full-outline-resume-from-item4
- Reviewed files: `src/report/tone-v2-review.ts`, `tests/unit/tone-v2-generation.test.ts`, `scripts/check-pass-angle-outline-live.ts`, relevant diff in `src/report/report-generator.ts`, `src/report/report-queue.ts`, `tests/unit/report-persistence.test.ts`, and task evidence files
- Review time: 2026-09-12T17:56:47Z

## 2. Verdict
- Changes requested
- Summary: Completion/recovery flow is mostly well covered, but I found deterministic review over-acceptance that can allow safety-guard bypasses and missing-birth-time numeric evidence leakage.

## 3. Critical Issues
- None.

## 4. Major Issues
- [`src/report/tone-v2-review.ts:56`] Issue: `CONDITIONAL_PATTERN` treats broad provenance words such as `입력`, `말했`, and `느낀` as enough to skip certainty checks.
- Risk: A sentence like `입력 기준 올해 합격합니다.` can bypass the future-event guard at [`src/report/tone-v2-review.ts:372`] because the certainty review exits before applying `CERTAIN_FUTURE_EVENT_PATTERN`. The same broad skip also affects third-party mind/private-fact checks.
- Recommendation: Split true hedging/conditional markers from provenance markers. Do not let `입력/말했/느낀` alone suppress safety checks; add RED tests for input-framed but certain claims such as 합격/채용/이별/구조조정.

- [`src/report/report-generator.ts:2148`] Issue: production review builds numeric evidence from raw `birth`, even when `context.birthTimeKnown === false`.
- Risk: The prompt correctly hides the hour at [`src/report/report-generator.ts:2075`], but review evidence still includes it; `numericEvidenceFrom` maps `hour` to `시` at [`src/report/tone-v2-review.ts:64`]. That can make an unsupported prescription like `12시에 공부해.` look grounded for a user whose birth time is explicitly unknown.
- Recommendation: Pass a birth object sanitized the same way as the prompt into `numericEvidenceFrom`, or filter hour/minute evidence when birth time is unknown. Add a regression test for birth-time-unknown output using the hidden hour.

## 5. Minor Issues
- [`src/report/tone-v2-review.ts:746`] Issue: the direct-answer check only rejects exact question repetition or hooks ending in a question mark.
- Risk: A hook that restates the question and appends a small answer, e.g. `무엇을 유지할까? 오답노트야.`, can satisfy `directAnswer`.
- Recommendation: Add a near-duplicate/question-overlap RED test and reject hooks containing the section question as a leading clause.

## 6. Verification Gaps
- Gap: Existing tests cover many next-criterion negatives, but not the broad `CONDITIONAL_PATTERN` safety bypass or hidden-hour numeric evidence case.
- Suggested check: Add focused RED/GREEN tests in `tests/unit/tone-v2-generation.test.ts` before accepting the current review gates.

- Gap: The task evidence summary says focused/full tests passed, but `CreamAI/logs/test/task-tone-v2-p04-pass-angle-full-outline-resume-from-item4_test-summary.json` records no executed commands and only a nested-package WARN.
- Suggested check: Preserve or link the repository-root focused/full/typecheck/build command transcripts used for the final 67/67 and 704/704 claims.

## 7. Final Recommendation
- Next action: Fix the two Major review-gate issues, add the missing RED/GREEN coverage, then rerun focused generation tests plus full repository/typecheck/build verification.