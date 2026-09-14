# Review Report - task-tone-v2-p01-adjacent-next-criterion

## 1. Scope
- Task id: task-tone-v2-p01-adjacent-next-criterion
- Reviewed files: `src/report/tone-v2-review.ts`, `tests/unit/tone-v2-generation.test.ts`, `tone-v2/evaluations/P01-adjacent-next-criterion-20260912.json`
- Review time: 2026-09-12T08:04:05Z

## 2. Verdict
- Changes requested
- Summary: 0 critical / 1 major / 0 minor. Saved replay evidence is represented consistently: report `d1d5fefcbf022006aec2aecf28f9` remains persisted `failed`, record SHA-256 matches `1423900f1e5e74739e3dec8ba8cac58c3c1f826e7560ef12c3e949bfd1687a24`, `rewritten` is `false`, and attempt `5f438f74-beb8-4bb1-9089-b7e656145a1d` now replays as directAnswer/grounding/scene/nextCriterion 4/4 true.

## 3. Critical Issues
- None.

## 4. Major Issues
- [src/report/tone-v2-review.ts:686] Issue: The abandonment guard still uses bare `버` and `끊` stems, and its safe-negation exception only accepts immediate `지` / `하지`. Verified safe next-criterion examples such as `오늘 공부를 버티는 시간을 확인해.`, `오늘 공부를 끊김 없이 이어갈 순서를 기록해.`, and `오늘 공부를 포기하지는 말고 준비물만 기록해.` currently return `nextCriterion: false`.
- Risk: Valid pass-angle guidance can be rejected as exam/study abandonment even when it is about endurance, continuity, or explicitly avoiding abandonment.
- Recommendation: Morphologically bound `버` / `끊` to abandonment forms such as `버리/버려/버릴` and `끊어/끊을/끊자`, and allow topic-marked safe negation forms like `지는` / `하지는` before `말` / `않`. Add regressions beside `tests/unit/tone-v2-generation.test.ts:222-230` and `tests/unit/tone-v2-generation.test.ts:264-269`.

## 5. Minor Issues
- None.

## 6. Verification Gaps
- Gap: Focused suite passes locally at 33/33, but current tests do not cover safe `버티는`, `끊김 없이`, or topic-marked negated-abandonment wording.
- Suggested check: Add the three regressions above and rerun the focused `tone-v2-generation` suite.

- Gap: The related 60-test suite could not be independently reproduced in this read-only review sandbox; it failed 8 `report-persistence` tests on `EPERM mkdir .cache/report-snapshots/locks/*`, while the non-writing tests passed 52/60.
- Suggested check: Rerun the related suite in the normal writable environment after the abandonment guard patch.

## 7. Final Recommendation
- Next action: Tighten the abandonment morphology and safe-negation handling, add targeted regressions, then rerun focused and writable related suites before approval.