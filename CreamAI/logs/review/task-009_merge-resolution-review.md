# Review Report - origin/main merge resolution

## 1. Scope

- Task id: task-009
- Reviewed files: merge `659ba7f`; both parents `dac3835`, `fb686b6`; `src/server/app.ts`, wedding service/prompt/tests, payment/Android paths, manifests, `.env.example`
- Review time: 2026-09-10T06:41:18Z

## 2. Verdict

- Changes requested
- Summary: The merge is not safe to push or deploy yet. A duplicate wedding API route makes the intended canonical handler unreachable, losing teaser data and birth-time certainty handling. Android/Play billing must also remain deployment-gated.

## 3. Critical Issues

- [src/server/app.ts:2191, 2227] `/api/day/wedding/analyze` is registered twice. The first handler always sends or returns a response and never calls `next()`, so the second handler is unreachable.
- Risk: The effective handler omits `input.birthTimeKnown = profile.birthTimeKnown` and `buildWeddingTeaser`/`context.wedding` population. For a profile with an unknown birth time, `buildWeddingFrame()` receives `undefined`, which defaults to known and can incorrectly use useful-element matches. The imported teaser implementation is dead at runtime despite being syntactically present.
- Recommendation: Retain exactly one handler, combining the intended canonical behavior: set `input.birthTimeKnown`, build and attach teaser context, preserve the normalized error response, then add an API integration test for `birthTimeKnown: false` and returned teaser facts.

## 4. Major Issues

- [src/day/wedding-service.ts:483-489, 514-529] Discarding origin’s context/RAG implementation creates an untested functional loss. The retained `buildWeddingContext()` contains only a generic concern; `sectionBody()` accepts `_chunk` but does not use it. Origin’s `chunkMeaning`, `compact`, `RAG_FIELD_LABEL`, detailed candidate context, and relation-reading handling therefore do not contribute to generated content.
- Risk: Wedding generation has less grounded candidate-specific context and no rendered RAG basis. The three deleted origin tests covered detailed context, absent partner disclosure, and partner birth-time uncertainty; current tests do not replace that coverage.
- Recommendation: TASK-013 is appropriate only after the critical route repair, but it must port or deliberately replace these behavioral tests before claiming the RAG/context improvements are deferred safely.

- [src/day/wedding-service.ts:218] The retained `partnerBirthTimeKnown` regex accepts only zero-padded hours, while the discarded `parseTime().known` accepted valid one-digit hours such as `9:30`.
- Risk: A valid partner time is parsed as 09:30 but marked unknown, suppressing useful-element analysis.
- Recommendation: Use the parsed-time validity result as the certainty source and add `9:30` coverage.

- [src/server/app.ts:1622-1662; src/payment/order-store.ts:165-190, 225-263] Google Play token reuse prevention is check-then-write, without a unique `tid` constraint or transaction. Concurrent verification of the same token against two orders can pass both reads before either order is written.
- Risk: One Play purchase could unlock multiple orders. The new path also retains T03/U22’s missing indeterminate state: acknowledgement can succeed before order persistence, leaving a completed payment recorded as `ready` until retry.
- Recommendation: Gate Google Play activation/deployment until token uniqueness and an explicit recoverable indeterminate/approval state are designed and tested. This second payment rail reinforces, rather than resolves, T02/T03 payment-catalog and U22 conclusions.

- [사주/.well-known/assetlinks.json:8-9; android/app-shell/README.md:12, 157-164] The Android capability is intentionally incomplete: App Links contain signing-fingerprint placeholders, and the project documents that no Android build or device/payment recovery test has been run.
- Risk: Android App Links cannot verify, and an Android release cannot be considered ready.
- Recommendation: Keep Android release and Play credential activation blocked pending signing, internal-track/device verification, and recovery-flow validation. The Express route itself is reachable: it is registered before static middleware, which ignores dotfiles.

## 5. Minor Issues

- [android/app-shell/README.md:25, 37, 64] Commands instruct `cd app`, but the committed shell is `android/app-shell`.
- Risk: Android setup instructions fail as written.
- Recommendation: Correct the documented working directory when the Android work is resumed.

- [tests/unit/day-wedding-service.test.ts:172] The merge leaves extra blank lines at EOF.
- Risk: None functionally.
- Recommendation: Clean up with the substantive wedding test repair.

## 6. Verification Gaps

- Gap: The reported full `npm test` result (415/415), all 15 `check:*` scripts, and `qa:all-services` were not freshly reproducible in this review.
- Suggested check: Re-run them after the route repair. Fresh review evidence: `npm run typecheck` completed with zero errors; direct TSX execution of wedding, readability, API, and Play suites passed 41/41; service-system prompt suite passed 11/11.

- Gap: Existing wedding API integration uses only `birthTimeKnown: true` and does not assert teaser facts/context, so it misses the unreachable canonical handler.
- Suggested check: Add response assertions for `context.wedding.teaser`, candidate facts, and an unknown-profile-birth-time fixture.

- Gap: No concurrent Play-token or acknowledgement-success/storage-failure test exists.
- Suggested check: Add storage-backed concurrency and failure-injection tests before enabling Play billing.

## 7. Final Recommendation

- Next action: Fix the duplicate wedding route before push. Keep the merge otherwise as a recovery-backed local commit, but gate all deployment on that repair; separately gate Android/Google Play release on payment-state, uniqueness, signing, and device-validation work.

Git evidence confirms `659ba7f` contains both parents, `backup/pre-merge-20260910` equals `dac3835`, and no configured remote branch contains the merge. No merge-commit SQL/migration change was found, and review commands made no operational DB query or PG transaction. `.env.example` is staged, contains coherent placeholders only, and retains both the Sensitive-pull warning/REPORT storage/PUNGSU notes and Google Play variable names; no secret value was observed. Manifest checks confirm 20 unique entries, 20 unique known keys, UTF-8 without BOM; `wedding_day.md` retains a UTF-8 BOM and its retained prompt test passes.