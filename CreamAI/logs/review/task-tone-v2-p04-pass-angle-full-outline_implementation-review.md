# Review Report - task-tone-v2-p04-pass-angle-full-outline

## 1. Scope
- Task id: task-tone-v2-p04-pass-angle-full-outline
- Reviewed files: `src/report/pass-angle-outline.ts`, `src/report/report-generator.ts`, `src/report/standard-reading.ts`, `src/report/report-queue.ts`, `src/report/report-store.ts`, `scripts/check-pass-angle-outline-live.ts`, `tests/unit/pass-angle-outline.test.ts`, `tests/unit/reading-live-harness.test.ts`, `tone-v2/EXECUTION-PLAN.md`, `tone-v2/PLAN.md`, `tone-v2/source/산출물-실전/pass_angle/part01.md` through `part05.md`, relevant existing pass-angle public/static files
- Review time: 2026-09-12T10:26:04Z

## 2. Verdict
- Changes requested
- Summary: The new outline matches the current 52-item source title/group/order contract, and the seven legacy semantic IDs are preserved. Sequential stop-on-failure is present in both queue and harness. One Major issue should be fixed before the 52-item provider run: generation now carries every completed sibling’s full interpretation into each later prompt, creating unbounded context growth across 52 sections.

## 3. Critical Issues
- None.

## 4. Major Issues
- [`src/report/report-generator.ts:2043`, `src/report/report-queue.ts:59`-`63`] Issue: `sectionPrompt` sends every completed sibling with full `interpretation`, and `generateReportSectionNow` passes all completed siblings for each later section.
- Risk: A 52-item run grows prompts O(n²). If early sections are long, later provider calls may exceed context limits, slow heavily, cost more, or fail after already spending calls. It also increases the chance of copying prior prose despite the uniqueness review.
- Recommendation: Replace prompt carry with a bounded structure, such as `{ id, question, summary }` plus a short rolling style/history summary or last N compact snippets. Keep full completed siblings only for deterministic replay/review, and add a 52-section prompt-size regression.

## 5. Minor Issues
- [`사주/about.html:3`, `사주/about.html:43`, `사주/me/pass-angle/05-step-5-chat/05-CHAT-RESULT.json:123`] Issue: Existing public/static artifacts still describe pass_angle as 7 items.
- Risk: Not blocking the isolated generation harness, but it will be customer-facing contract drift once the 52-item report is attached to screens or release materials.
- Recommendation: Track this for the P06/UI attachment pass or update before any production-facing announcement/deploy.

## 6. Verification Gaps
- Gap: No provider call has been made for this task yet, and no fresh full-outline evaluation artifact was found.
- Suggested check: After fixing bounded carry, run `npx tsx scripts/check-pass-angle-outline-live.ts --version=<unique> --generate --fresh` and save sanitized evidence with section statuses, hashes, first failure, and replay results only.

- Gap: Source-contract tests hard-code expected titles and regex-match headings anywhere in the files; they do not parse only the explicit 52-item block or prove source order mechanically.
- Suggested check: Add a parser that extracts headings from the explicit `긴 목차 규칙` block before examples, compares directly to `PASS_ANGLE_OUTLINE`, and records source file hashes.

- Gap: Reviewer reran `npm run typecheck` successfully, but the focused stored-record test could not be independently rerun in this read-only sandbox because file storage attempted to create `.cache/report-snapshots/locks/...`.
- Suggested check: Rerun the focused tests in the normal writable project test environment after the final change.

## 7. Final Recommendation
- Next action: Cap/summarize completed-sibling carry before starting the 52-item provider run; then rerun typecheck, focused outline/harness tests, and the fresh synthetic full-outline live harness.