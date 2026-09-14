# Review Report - task-tone-v2-p04-pass-angle-full-outline-resume-from-item4

## 1. Scope
- Task id: task-tone-v2-p04-pass-angle-full-outline-resume-from-item4
- Reviewed files: src/report/tone-v2-review.ts; tests/unit/tone-v2-generation.test.ts; scripts/check-pass-angle-outline-live.ts; relevant integration in src/report/report-generator.ts, src/report/report-queue.ts, src/report/report-store.ts, tests/unit/report-persistence.test.ts; verification summaries
- Review time: 2026-09-12T18:23:59Z

## 2. Verdict
- Changes requested
- Summary: One Major regex over-acceptance remains in the next-criterion detector. No Critical issues found.

## 3. Critical Issues
- None (0).

## 4. Major Issues
- [src/report/tone-v2-review.ts:727] Issue: `objectMarkedNextTarget` treats generic `부터` phrases as concrete action targets unless they match a short temporal blacklist. `temporalOnlyNextTarget` at src/report/tone-v2-review.ts:737 only blocks a few whole-sentence forms, so a targetless temporal instruction like `다음에는 아침부터 확인해.` is accepted as `nextCriterion: true`. Existing negatives at tests/unit/tone-v2-generation.test.ts:415 cover `앞으로`, `다음 실모부터`, `다음 시험부터`, `오늘만`, etc., but not ordinary temporal nouns such as `아침부터` or `오전부터`.
- Risk: Weakens the targetless-action guard and can let production-equivalent replay pass sections that still do not say what the user should confirm, compare, or record.
- Recommendation: Tighten `부터` handling by removing it as a generic object marker or by rejecting temporal-origin nouns/adverbs before `부터`. Add RED/GREEN negatives for `아침부터 확인해`, `오전부터 확인해`, and similar forms, while preserving positives for genuinely concrete objects if needed.

## 5. Minor Issues
- None (0).

## 6. Verification Gaps
- Gap: No regression test currently covers temporal-origin `부터` phrases that are not real action targets.
- Suggested check: Add focused ZIP common 4 tests around this case, then rerun `npx tsx --test tests/unit/tone-v2-generation.test.ts tests/unit/report-persistence.test.ts`, `npm test`, `npm run vercel-build`, and the pass_angle live replay.

## 7. Final Recommendation
- Next action: Fix the Major next-criterion over-acceptance before closing the task.