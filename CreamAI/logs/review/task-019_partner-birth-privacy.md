# Review Report - task-019

## 1. Scope

- Task id: task-019
- Reviewed files: `src/report/public-context.ts`, `src/server/app.ts`, `src/report/report-generator.ts`, `src/report/report-queue.ts`, `src/report/saved-chat.ts`, `src/report/report-store.ts`, changed partner services, privacy tests, `사주/cmdg/index.html`
- Review time: 2026-09-10T08:53:23Z

## 2. Verdict

- Changes requested
- Summary: New service write paths correctly omit `partner.birth`, and ordinary report/history response sanitization is broadly applied. However, legacy birth data still reaches the external-model prompt through `featureJson`, and can be copied into newly stored saved-chat records and prompts.

## 3. Critical Issues

- [src/report/report-generator.ts:2067; src/saju/analyzer.ts:488] Issue: `sectionPrompt` sanitizes only its `context` field, then calls `groundedReportFeatures(analysis, context)`. `buildSajuFeatureJson` embeds that original context as `userContext`, including legacy `context.partner.birth`.
- Risk: Delayed section generation from an old record (`app.ts:2665`, `2757` → `report-queue.ts:54-55`) sends partner birth date/time to the model despite the claimed prompt barrier.
- Recommendation: Build `featureJson` from `publicReportContext(context)` (or make `groundedReportFeatures` sanitize its context input). Add a test that captures the actual LLM message and asserts all partner birth fields are absent from both `context` and `featureJson.userContext`.

- [src/report/saved-chat.ts:141-166] Issue: A chat created from a legacy parent report copies `parent.context` directly into `baseContext`, serializes it into the system prompt at line 149, and persists it in the new chat record at lines 154-166.
- Risk: `/api/chat` accepts `parentReportId` (`src/server/app.ts:2782-2797`), so an old record’s partner birth data is newly stored and sent to the external model. This bypasses `sectionPrompt` completely.
- Recommendation: Derive `baseContext` with `publicReportContext(parent.context)` before constructing prompt metadata and saving the child record. Add an integration test covering `/api/chat` with a legacy parent and inspecting saved chat metadata / captured outbound prompt.

## 4. Major Issues

- No additional major issues found.

## 5. Minor Issues

- [사주/cmdg/index.html:4448-4457; 5079-5100] Issue: Loading a sanitized `love_this_year` record preserves `partnerMode === 'known'` and `birthTimeKnown`, but clears partner birth and gender. There is no runtime error due to optional chaining.
- Risk: A user who reopens the input flow and submits without editing receives validation errors for blank partner birth/gender. It does not submit an invalid known-partner request.
- Recommendation: If product behavior permits, reset the mode to `none` when a restored known partner has no birth data, or show an explicit re-entry notice. The accepted blank-form tradeoff is otherwise functioning as described.

- [src/report/public-context.ts:11-28] OK: `publicPartnerContext` shallow-copies before `delete`; `birth` is optional in `SajuReportContext` (`src/types/index.ts:242-259`), so deletion is type-safe and non-mutating. The direct unit test verifies source preservation.

- [src/server/app.ts:821-922; 2501-2514] OK: `parseOptionalPartnerContext` is only invoked from `parseReportContext`, and `/api/saju/analyze` rejects `love_this_year` immediately afterward. In the reviewed code, this is a dead path for persistence, response, and model generation; it only transiently parses the request before returning 400.

## 6. Verification Gaps

- Gap: The 14 new tests do not exercise the actual section-generation message payload, so the `featureJson.userContext` leak passes unnoticed.
- Suggested check: Mock/capture `chatWithOpenAI` during generation from a legacy context and assert serialized messages exclude partner year, month, day, hour, minute, and `birth`.

- Gap: No saved-chat legacy-parent test exists.
- Suggested check: Create a legacy report, call `/api/chat` with its `parentReportId`, then verify the saved child context and outbound system messages omit `partner.birth`.

- Gap: The reviewed environment could not independently run the requested targeted test/typecheck commands because the command wrapper referenced a missing `C:\Users\user\Desktop\_internal\invoke-aor.ps1`.
- Suggested check: Re-run `npm test` and `npm run typecheck` in the PM execution environment after the critical fixes.

## 7. Final Recommendation

- Next action: Sanitize contexts before feature construction and saved-chat prompt/storage construction, add the two end-to-end prompt/storage tests, then re-run the full test and typecheck suite.