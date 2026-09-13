# Review Report - task-tone-v2-p01-pass-angle-next-criterion

## 1. Scope
- Task id: task-tone-v2-p01-pass-angle-next-criterion
- Reviewed files: `src/report/tone-v2-review.ts`, `tests/unit/tone-v2-generation.test.ts`, `scripts/check-reading-live.ts`, `tone-v2/evaluations/P01-pass-angle-next-criterion-20260912.json`, `tone-v2/task-progress.json`; supporting source refs for `pass_angle` contract
- Review time: 2026-09-12T05:22:05Z

## 2. Verdict
- Changes requested
- Summary: The exact accepted phrase passes and `다음에는 잘해봐` remains rejected. Evidence correctly records the target `nextCriterion` PASS separately from the overall failed section. However, the expanded matcher still misses core `pass_angle` next-action verbs and introduces a broad false positive for quitting/abandoning study or the exam.

## 3. Critical Issues
- None.

## 4. Major Issues
- [src/report/tone-v2-review.ts:627] Issue: The new object-action branch accepts `버리|버려|끊` after any particle-marked target. With otherwise valid density text, `다음 시험 전날 시험을 버려.` and `다음 시험 전날 공부를 끊어.` satisfy `nextCriterion`, and `reviewToneCopy` does not reject them.
- Risk: This relaxes the gate for `pass_angle` into accepting exam/study abandonment, conflicting with the service ban on 수험 포기 강요 and the acceptance requirement that other gates not be relaxed.
- Recommendation: Restrict discard verbs to safe discardable targets, or add explicit negative tests/guards for `시험|수험|응시|공부` with `버리|끊|포기`.

- [src/report/tone-v2-review.ts:627; tests/unit/tone-v2-generation.test.ts:207-217] Issue: The matcher still rejects source-native concrete next actions such as `오늘 버릴 공부를 정해.` and `다음에는 남길 공부 순서를 매겨.` because `정하/정해/매기/매겨` are not recognized.
- Risk: A model response that follows the `pass_angle` core promise, “오늘 버릴 공부를 정하고, 남길 공부의 순서를 매긴다,” can still fail the same next-criterion gate this slice is meant to repair.
- Recommendation: Add narrow target-required recognition for `정하|정해|매기|매겨`, with counterexamples preserving rejection of vague encouragement.

## 5. Minor Issues
- [scripts/check-reading-live.ts:32-35] Issue: `--service=` silently succeeds with an empty result set when the service key is mistyped.
- Risk: A future verification command could appear successful without evaluating any provider output.
- Recommendation: Fail fast when `serviceFilter` is set and `selectedContexts.length === 0`.

- [scripts/check-reading-live.ts:59] Issue: Attempt evidence parses `item.raw` with plain `JSON.parse`, while generation accepts JSON embedded in surrounding text.
- Risk: Sanitized evidence collection can crash on a raw attempt that production parsing would otherwise handle.
- Recommendation: Reuse the same extract-json behavior or catch parse errors and emit hashes plus parse status.

## 6. Verification Gaps
- Gap: The focused test covers only `세워봐` and `다음에는 잘해봐`.
- Suggested check: Add tests for `오늘 버릴 공부를 정해`, `남길 공부 순서를 매겨`, and unsafe false positives like `시험을 버려` / `공부를 끊어`.

- Gap: `tone-v2/evaluations/P01-pass-angle-next-criterion-20260912.json:43-51` records the second attempt’s `nextCriterion: true` and `remainingIssues: ["grounding"]`, but the stored visible sentences stop before the sentence that triggered the next-criterion PASS.
- Suggested check: Preserve a sanitized matched sentence or deterministic match excerpt for the target criterion, not only the first three visible sentences.

## 7. Final Recommendation
- Next action: Tighten the next-criterion matcher around safe `pass_angle` action targets, add the missing positive and unsafe negative fixtures, then rerun the focused Tone V2 generation test and update the evaluation artifact.