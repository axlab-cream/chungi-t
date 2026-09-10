# Review Report - task-t01

## 1. Scope

- Task id: task-t01
- Reviewed files: `docs/admin-ops/T01-baseline.md`, `docs/admin-ops/HANDOFF.md`, `docs/adr/ADR-0002.md`, `CreamAI/backlog/task-t01.md`, `plan.md`, relevant pack documents and source files.
- Review time: 2026-09-10T05:01:03Z

## 2. Verdict

- Changes requested
- Summary: No credential secret was found, and several baseline claims are correct. However, the report incorrectly says the existing report API is absent, misstates static-route ordering, conflicts with its own API-count/handoff records, and bypasses the mandated `20-HANDOFF.md` update. T02 should not begin as a production-baseline task until these are corrected.

## 3. Critical Issues

- None found.

## 4. Major Issues

- [docs/admin-ops/T01-baseline.md:85; src/server/app.ts:2398] Issue: `GET /api/report/:reportId` is reported as nonexistent. It exists as part of `app.get(['/api/report/:reportId', '/api/reports/:reportId'], ...)`.
- Risk: T10/T11 may be designed against an incorrect report-access contract.
- Recommendation: Mark the pack claim as PASS, document the alias and its ownership/auth behavior, and retain `/r/:resultId` as the static UI entry point rather than presenting it as the replacement API.

- [docs/admin-ops/T01-baseline.md:54-78; docs/admin-ops/HANDOFF.md:52] Issue: The document now identifies 23 missing API routes, while the handoff records 20. The requested “20 routes” assertion is WRONG. The source supports 37 `/api` route registrations excluding middleware: 14 matching evidence, plus 23 omitted routes.
- Risk: The route baseline is internally inconsistent and unreliable for T02/T10 planning.
- Recommendation: Use 23 consistently and enumerate the 16 concrete analyze endpoints plus the seven other omitted APIs.

- [docs/admin-ops/T01-baseline.md:100-107; docs/adr/ADR-0002.md:46-50; src/server/app.ts:683-684] Issue: The generic `express.static` middleware is at lines 683–684, but it is not the last route registration; many routes follow it, including the report API at line 2398. Also, static middleware falls through when a file is absent, so later routes are not universally “shadowed.”
- Risk: The ADR overstates the routing constraint and could lead to unnecessary or incorrectly ordered router design.
- Recommendation: State the precise risk: an existing matching static asset can be served before a later matching route. Register `/admin` authorization/static handling deliberately before generic static middleware, but do not claim all later API routes are shadowed.

- [CreamAI/backlog/task-t01.md:44-45; admin-ops-execution-pack/01-LLM-EXECUTION.md:6] Issue: The task declares `20-HANDOFF.md` as a deliverable, and the pack requires it to be updated, but it was not updated; a substitute document was created instead.
- Risk: The pack’s canonical handoff remains at “T01~T38: todo,” while project documents declare T01 complete.
- Recommendation: Obtain an explicit decision whether the signed pack is immutable. If immutable, amend the task/plan to formally designate the external handoff as the canonical exception; otherwise update `20-HANDOFF.md` together with its manifest process.

- [docs/admin-ops/T01-baseline.md:196-205; plan.md:54-57] Issue: U1 is treated as blocking only T05, while T02–T04 are marked READY even though the report concludes HEAD is not the production source.
- Risk: T02 service mapping and T03 storage/RLS findings could be accepted as production truth from the wrong baseline.
- Recommendation: Make U1 a gate for any task whose findings are presented as production-current, including T02 and T03. T04 may proceed only if explicitly labeled as a local-HEAD regression baseline.

## 5. Minor Issues

- [docs/admin-ops/T01-baseline.md:118,132; plan.md:76] Issue: Development and Preview storage modes are labeled “추정” in the table but asserted as confirmed “전부 memory” elsewhere.
- Risk: U2’s stated evidence exceeds what was verified.
- Recommendation: Keep those environments unverified until their runtime configuration is checked. U2 is directionally valid for T05, but its release condition should require an isolated persistent development/Preview store and verified access policy—not merely one of two environment variables.

- [CreamAI/backlog/task-t01.md:4; plan.md:53; docs/admin-ops/HANDOFF.md:16] Issue: The backlog status is `active`, while plan and handoff state T01 is done.
- Risk: Subsequent agents can duplicate work or bypass review state.
- Recommendation: Reconcile status to the workflow state after factual corrections and review acceptance.

- [docs/admin-ops/T01-baseline.md:165] Issue: Two hardcoded admin email addresses are repeated in documentation.
- Risk: They are not credential secrets, and were already committed in source, but repeating personal identifiers broadens exposure unnecessarily.
- Recommendation: Redact them in documentation and cite `DEFAULT_ADMIN_EMAILS` instead. The hardcoded set’s additive-only behavior is correctly identified; it is an implementation requirement for T05, not necessarily a separate pre-T05 blocker if legacy unlock remains strictly isolated from RBAC.

- [docs/adr/ADR-0002.md:35-50] Issue: Putting assets in `사주/admin/` is technically viable, but function routing alone does not enforce authorization for static assets.
- Risk: An `/admin` static mount can expose internal UI assets unless an authorization middleware precedes it; `index:false` also requires an explicit `/admin` entry response.
- Recommendation: Add failure modes for authorization ordering, direct static-file requests, SPA/deep-link fallback, and static assets containing no sensitive configuration.

- [docs/adr/ADR-0002.md:56-99] Issue: The external design boundary is incomplete. Exact named SK token values, especially color usage, can still resemble the reference despite excluding logos, copy, and images.
- Risk: Internal-only use materially lowers exposure, but does not itself eliminate brand-imitation risk.
- Recommendation: Define independent semantic tokens and alter the palette/typographic combination after a visual review; retain only high-level density and accessibility principles.

## 6. Verification Gaps

- Gap: No preserved evidence confirms Development and Preview runtime storage mode.
- Suggested check: Perform non-secret runtime/config verification per environment and record only variable presence and resulting storage mode.

- Gap: The report’s claimed `GET /api/report/:reportId` absence was not validated against array-form route registrations.
- Suggested check: Extract Express routes with support for string arrays and regex registrations before publishing counts.

- Gap: The branch divergence is known, but no production deployment SHA is recorded.
- Suggested check: Record the deployment SHA/source before treating T02/T03 results as production-current.

- Gap: No evidence contradicts the claims of no commit, push, deploy, schema change, direct operational DB query, or PG transaction; however, command outputs for the claimed checks are not retained in the reviewed deliverables.
- Suggested check: Add sanitized command/result references to the canonical handoff.

## 7. Final Recommendation

- Next action: Correct the report API finding, API-count consistency, static-routing explanation, status/handoff contradiction, and U1 gating before approving T01. T02 is not safe to start as a production-relevant task until the baseline branch/deployment source is fixed; it may only proceed as an explicitly local-HEAD mapping after that limitation is accepted.