# Review Report - task-tone-v2-p01-adjacent-next-criterion

## 1. Scope
- Task id: task-tone-v2-p01-adjacent-next-criterion
- Reviewed files: `src/report/tone-v2-review.ts`, `tests/unit/tone-v2-generation.test.ts`, `tone-v2/evaluations/P01-adjacent-next-criterion-20260912.json`
- Review time: 2026-09-12T07:59:18Z

## 2. Verdict
- Changes requested
- Summary: 0 critical / 4 major / 0 minor. Saved replay evidence is represented consistently: cache hash matches `1423900f1e5e74739e3dec8ba8cac58c3c1f826e7560ef12c3e949bfd1687a24`, report `d1d5fefcbf022006aec2aecf28f9` remains persisted `failed`, attempt `5f438f74-beb8-4bb1-9089-b7e656145a1d` replays as 4/4 true, and the evaluation records `rewritten: false`. Focused suite passed 33/33. However, the matcher still has concrete false positives/false negatives around negation, past-report wording, and abandonment boundaries.

## 3. Critical Issues
- None.

## 4. Major Issues
- [src/report/tone-v2-review.ts:682] Issue: Suffix negation does not catch topic-marked negation such as `준비물만 기록해 보지는 마.`; current review returns `nextCriterion: true`.
- Risk: Negated actions can be accepted as valid next criteria.
- Recommendation: Extend the negation guard to cover topic-marked/auxiliary forms like `보지는 마` and add regressions beside `tests/unit/tone-v2-generation.test.ts:221` and `:260`.

- [src/report/tone-v2-review.ts:680] Issue: The action regex accepts bare `기록해` before whitespace, so past/perfect descriptions such as `준비물을 기록해 둔 게 기준이야.` pass as actions.
- Risk: Past reports or already-completed states can satisfy `nextCriterion`.
- Recommendation: Require punctuation/end after bare imperative forms, or explicitly reject auxiliary descriptive continuations such as `둔`, `놓은`, `했던`; add a regression near `tests/unit/tone-v2-generation.test.ts:259`.

- [src/report/tone-v2-review.ts:708] Issue: Adjacent candidates check abandonment only on the action sentence, not the plan-setting sentence. `오늘 시험을 버릴 기준이야. 준비물을 확인해.` currently passes.
- Risk: Unsafe exam-abandonment framing can be accepted when paired with a concrete safe action sentence.
- Recommendation: Apply the abandonment guard to the full adjacent candidate pair while preserving safe tested cases like `오늘 버릴 공부를 정해.`

- [src/report/tone-v2-review.ts:685] Issue: The abandonment regex matches bare stems like `버` and `접`, so safe logistics such as `오늘 시험장 버스 시간을 확인해.` and `오늘 응시 접수 번호를 확인해.` are rejected.
- Risk: Concrete, safe exam-prep actions become false negatives.
- Recommendation: Bound abandonment lexemes morphologically, e.g. distinguish `버리/버려/버릴` from `버스` and `접어/접을` from `접수`; add regressions for both logistics examples.

## 5. Minor Issues
- None.

## 6. Verification Gaps
- Gap: No tests cover topic-marked negation, auxiliary past/perfect action wording, unsafe abandonment in the adjacent plan sentence, or safe `버스`/`접수` exam logistics.
- Suggested check: Add the regressions above, rerun the focused 33-test suite, then rerun the related 60-test suite in a writable environment. This read-only review environment blocked the related suite with `EPERM mkdir CreamAI/.cache`.

## 7. Final Recommendation
- Next action: Tighten the nextCriterion action/negation/abandonment guards, add targeted regressions, keep the historical replay record immutable, and rerun focused plus writable related suites before approval.