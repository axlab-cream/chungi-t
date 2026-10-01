# Admin data and popup repair plan — 2026-10-01

Goal: Operators can submit a complete popup, understand validation/storage errors, and distinguish unavailable data from genuinely empty data.
Architecture: Keep the existing content store, staff scopes and audited create/publish flow. No migration, payment implementation or production campaign mutation.
Tech stack: TypeScript/Express, existing inline administrator UI, node:test.

## ADMIN-DATA-01
- [x] Inspect production popup UI, source, content row count and prior KMS note.
- [ ] Regression: default form body; invalid payload returns 422; valid create/publish; archived history.
- [ ] Correct form mapping/validation, unavailable-state guards and content error mapping.
- [ ] Review all 22 administrator menus; distinguish deferred reconciliation and empty stores.
- [ ] Focused tests, build, source review, ProjectOps and sanitized KMS record.

Acceptance: Missing fields never produce an unexplained 500. Failed lookups never imply no registered popups or zero clicks. Archived popup history is readable without changing the default content-list contract. Public campaigns are not published as a test. Existing user work stays untouched.

### Verification outcome
- [x] Default form/server validator regression reproduced then fixed.
- [x] Required input and 422 messages; archived history and unavailable guards.
- [x] 22-menu production read-only audit.
- [x] Actual Express/synthetic DB lifecycle and browser verification.
- [x] 1736 full tests + 17 focused final tests; build/typecheck/SEO.
- [x] KMS saved and re-read.
- [ ] Automated reviewer final report.
- [ ] Production deployment — requires explicit request for current administrator changes under rules.md §6 H2.

### Direct code review
- Staff permission checks and audited mutations preserved; no database permission or schema change.
- Popup history filtering applies on the server before the existing result limit; default content list still excludes archived rows.
- No unavailable data is converted to zero in the changed popup/funnel paths.
- Archived records are skipped before payload validation in the public selector; valid archived fixtures and public HTTP 204 verified.
- Production inspection was read-only. UI success screenshot and data-source failure screenshot are explicitly local.
- Residual operational limit: public popup response retains its existing 60-second cache, so a prior response may persist up to its cache lifetime after an operator change.
