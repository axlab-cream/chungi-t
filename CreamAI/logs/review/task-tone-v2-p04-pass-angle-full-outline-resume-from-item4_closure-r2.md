# Review Report - task-tone-v2-p04-pass-angle-full-outline-resume-from-item4

## 1. Scope
- Task id: task-tone-v2-p04-pass-angle-full-outline-resume-from-item4
- Reviewed files:
  - `src/report/tone-v2-review.ts`
  - `tests/unit/tone-v2-generation.test.ts`
  - `scripts/check-pass-angle-outline-live.ts`
  - Relevant state/recovery code: `src/report/report-queue.ts`, `src/report/report-generator.ts`, `tests/unit/report-persistence.test.ts`, `tests/unit/reading-live-harness.test.ts`
- Review time: 2026-09-12T17:39:44Z

## 2. Verdict
- Changes requested
- Summary: The isolated live harness is careful about storage, raw prose hashing, replay, and failure-stop behavior, but the deterministic review still has safety over-acceptance paths around `확인`, abandonment wording, and retry state integrity.

## 3. Critical Issues
- Zero critical issues found.

## 4. Major Issues
- [`src/report/tone-v2-review.ts:56`] Issue: `CONDITIONAL_PATTERN` treats any sentence containing `확인` as conditional.
- Risk: [`src/report/tone-v2-review.ts:365-381`] skips future-event, third-party-mind, and invented-private-fact checks before applying the actual safety regexes. A sentence can combine a definite unsafe claim with a later “확인해요” instruction and pass review, e.g. “회사는 곧 구조조정하니 공고를 확인해요.” This weakens the production-equivalent recovery gate.
- Recommendation: Remove broad `확인` from the global conditional bypass and replace it with narrow uncertainty forms such as `확인되지`, `확인 전`, `확인 필요`, or explicit “actual result/source confirms it” language. Add RED/GREEN tests for same-sentence definite claims plus `확인해요`.

- [`tests/unit/tone-v2-generation.test.ts:264`] Issue: The test suite explicitly accepts `오늘 버릴 공부를 정해.` as a valid next criterion.
- Risk: [`src/report/tone-v2-review.ts:698-703`] only catches abandonment when `시험|수험|응시|공부` appears before the abandonment verb. Reversed phrasing like `버릴 공부` can satisfy `nextCriterion`, which conflicts with the “never weaken abandonment guards” requirement.
- Recommendation: Change the accepted positive fixture to a bounded material/variable target, and add a rejection test for reversed abandonment forms such as `(버릴|포기할|끊을|접을|그만둘)\s*(공부|시험|수험|응시)`.

- [`src/report/report-queue.ts:100-103`] Issue: `generateReportSectionNow(..., retry: true)` allows retrying a failed section when predecessors are complete, but does not reject or invalidate later sections that may already have attempts or completed prose.
- Risk: Recovery has a later-section guard at [`src/report/report-queue.ts:42-47`], but retry does not. A dirty or legacy record with later generated sections can be made internally inconsistent by retrying only the earlier failed section while preserving later prose generated against the old state.
- Recommendation: Apply the same later-section pristine-state guard to retry, or explicitly reset later sections before retrying an earlier failed section. Add a regression test parallel to the existing recovery later-section test.

## 5. Minor Issues
- Zero minor issues found.

## 6. Verification Gaps
- Gap: No RED/GREEN tests cover definite safety claims that also contain `확인`.
- Suggested check: Add cases for future outcomes, symbolic guarantees, and invented private facts with same-sentence `확인해요`.

- Gap: No test rejects reversed abandonment phrasing.
- Suggested check: Add pass_angle density cases for `버릴 공부`, `포기할 시험`, `끊을 수험 준비`.

- Gap: Retry state integrity is not tested with changed later sections.
- Suggested check: Add a `generateReportSectionNow(..., retry: true)` test where a later section has attempts/completion and assert fail-closed behavior.

## 7. Final Recommendation
- Next action: Fix the three major issues, then rerun the focused tone-v2 tests, report persistence tests, full repository tests, typecheck, and the pass_angle production-equivalent replay.