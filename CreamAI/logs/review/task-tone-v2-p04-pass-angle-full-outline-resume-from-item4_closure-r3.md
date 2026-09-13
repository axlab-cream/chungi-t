# Review Report - task-tone-v2-p04-pass-angle-full-outline-resume-from-item4

## 1. Scope
- Task id: task-tone-v2-p04-pass-angle-full-outline-resume-from-item4
- Reviewed files:
  - src/report/tone-v2-review.ts
  - tests/unit/tone-v2-generation.test.ts
  - scripts/check-pass-angle-outline-live.ts
  - src/report/report-generator.ts
  - src/report/report-queue.ts
  - src/report/report-store.ts
  - tests/unit/report-persistence.test.ts
  - tests/unit/reading-live-harness.test.ts
  - tone-v2/evaluations/P04-pass-angle-resume-from-item4-20260913.json
- Review time: 2026-09-12T17:47:47Z

## 2. Verdict
- Changes requested
- Summary: Critical issues 0. Major issues 2. The resume/replay harness is mostly aligned with isolated synthetic storage, prior-section replay, and raw-prose hashing, but two deterministic review guards still over-accept unsafe or negated prose.

## 3. Critical Issues
- Zero critical issues found.

## 4. Major Issues
- [src/report/tone-v2-review.ts:408] Issue: `professionalAuthorityIssues` skips the entire sentence whenever it sees an expert-check phrase such as 의료진/변호사 + 확인/검토.
- Risk: A sentence can combine an expert-check clause with the prohibited directive or legal verdict and pass review, e.g. “의료진에게 확인하고 약을 끊으세요.” or “변호사에게 검토받고 이 계약은 법적으로 유효합니다.” This weakens the safety guard.
- Recommendation: Exempt only sentences whose recommendation is to seek expert review, or continue scanning any clause after the expert-check phrase for medication, legal, investment, and contract directives. Add RED/GREEN tests for same-sentence expert-check plus unsafe directive/verdict.

- [src/report/tone-v2-review.ts:695] Issue: `negatedNextAction` catches `안/못`, `보지 마`, `말`, and `않`, but misses future-intention negations after an action stem.
- Risk: `targetedNextAction` can still match the positive stem in text like “오늘 준비물을 기록해 볼 생각은 없어.” and `reviewPaidSectionDensity` accepts it as a valid `nextCriterion`, even though the sentence explicitly refuses the action.
- Recommendation: Extend the negation guard to cover forms such as `생각은 없어/없다`, `의사 없다`, `계획 없다`, `싫어`, and similar post-action refusal forms. Add pass_angle density tests for these patterns.

## 5. Minor Issues
- Zero minor issues found.

## 6. Verification Gaps
- Gap: No test covers expert-check wording followed by an unsafe directive/verdict in the same sentence.
- Suggested check: Add ZIP common 10 fixtures for medical and legal examples that include 전문가 확인 plus a prohibited conclusion.

- Gap: No test covers post-action refusal forms for nextCriterion.
- Suggested check: Add fixtures like “기록해 볼 생각은 없어”, “비교할 의사는 없어”, and “확인하기 싫어” and require `elements.nextCriterion === false`.

- Gap: The task-specific harness summary does not persist the claimed final command transcripts; `logs/test/task-tone-v2-p04-pass-angle-full-outline-resume-from-item4_test-summary.json` records no commands, while the evaluation artifact records different focused/full counts from the task body.
- Suggested check: Persist exact command names, exit codes, and output tails for focused tests, full repository tests, typecheck, Vercel build, and live replay.

## 7. Final Recommendation
- Next action: Fix the two major guard issues, add focused RED/GREEN tests, then rerun focused tone-v2 tests, report persistence tests, full repository tests, typecheck, Vercel build, and the 52/52 production-equivalent replay.