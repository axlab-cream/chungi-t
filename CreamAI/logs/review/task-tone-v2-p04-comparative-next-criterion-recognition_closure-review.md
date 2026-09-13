# Review Report - task-tone-v2-p04-comparative-next-criterion-recognition

## 1. Scope
- Task id: task-tone-v2-p04-comparative-next-criterion-recognition
- Reviewed files: `src/report/tone-v2-review.ts`, `tests/unit/tone-v2-generation.test.ts`, task backlog/plan, evaluation JSON, test summary, credential-boundary log, memory/KMS notes, final report
- Review time: 2026-09-12T16:01:14Z

## 2. Verdict
- Changes requested
- Summary: The two diagnosed positives are covered, and the saved replay/provider boundary evidence is present. However, the recognizer still accepts targetless temporal/adverbial cases and spaced past/perfect auxiliary forms, which violates the requested narrowness for targetless/vague and past/perfect regressions.

## 3. Critical Issues
- None.

## 4. Major Issues
- [src/report/tone-v2-review.ts:680-681] Issue: `objectMarkedNextTarget` treats `으로` and `부터` as concrete target markers without excluding temporal/adverbial phrases. With the new `비교/확인해봐` branch, targetless strings such as `앞으로 비교해봐.` and `다음 실모부터 확인해봐.` evaluate as `nextCriterion: true`.
- Risk: Vague or targetless advice can pass the density gate, weakening the exact boundary this task was meant to preserve.
- Recommendation: Add negative fixtures for these temporal/adverbial targetless forms and narrow `으로/부터` handling so they require an actual object, not `앞으로` or time-origin phrases.

- [src/report/tone-v2-review.ts:680, src/report/tone-v2-review.ts:685] Issue: Past/perfect spaced auxiliary forms still pass. Because bare `비교해`/`확인해` can match before whitespace, phrases like `다음 실모 뒤 같은 이유를 비교해 봤어.` and `다음 실모 뒤 같은 이유를 비교해 본 게 기준이야.` are accepted, while `pastNextAction` only rejects `둔/뒀/두었/놓은/놨`.
- Risk: A recount of something already tried can be misclassified as a future next criterion.
- Recommendation: Extend the past/perfect guard to cover `본/봤/보았` auxiliary forms, or adjust the action boundary so bare `해` does not satisfy the action when followed by past/perfect `봐/본/봤`.

## 5. Minor Issues
- [CreamAI/logs/harness/task-tone-v2-p04-comparative-next-criterion-recognition_implementation.json:8] Issue: The task implementation harness still records a failed broad secret scan, although the narrower credential-boundary scan reports 0 findings.
- Risk: Evidence readers may see conflicting harness status.
- Recommendation: Keep the task-boundary scan as authoritative, but mark the broad harness failure as superseded in the task evidence or rerun it with task-scoped inputs.

## 6. Verification Gaps
- Gap: The tests cover the intended positives and several negatives at `tests/unit/tone-v2-generation.test.ts:286-303`, but they do not cover `앞으로/부터` targetless false positives or spaced `해 봤어/해 본` past/perfect forms.
- Suggested check: Add focused RED fixtures for those cases before approving.

- Gap: Saved replay and boundary evidence is otherwise adequate: provider calls are 0 and Production changes are false in `tone-v2/evaluations/P04-comparative-next-criterion-recognition-20260913.json:5-15`; replay preserves failed historical state, attempts, and SHA-256 at lines 39-57; full regression/typecheck/build evidence is recorded at lines 58-63 and `CreamAI/logs/test/task-tone-v2-p04-comparative-next-criterion-recognition_test-summary.json:3-13`.
- Suggested check: Rerun the focused and full verification after the additional negative fixtures.

## 7. Final Recommendation
- Next action: Fix the two recognizer boundary leaks, add the missing negative fixtures, then rerun focused Tone V2 tests plus the recorded full/typecheck/build verification.