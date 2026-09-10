# Review Report - task-t03

## 1. Scope

- Task id: task-t03
- Reviewed files: `docs/admin-ops/T03-storage-schema.md`, task backlog, specified SQL/store/app/verification/test sources, and admin-ops specifications.
- Review time: 2026-09-10T05:37:24Z

## 2. Verdict

- Changes requested
- Summary: Core code-derived conclusions are accurate: owner/user UUID schemas, fallback schema weakness, report CAS, profile RLS path, legacy fallbacks, and order non-CAS behavior. No secret value is present; documenting the `sb_secret_` prefix and JWT-shape detection regex is safe. Several production-state and verification claims exceed the available evidence and must be qualified before approval.

## 3. Critical Issues

- No critical findings.

## 4. Major Issues

- [docs/admin-ops/T03-storage-schema.md:8-10] The document says all three tables are service-role-only with grants revoked, while it later correctly states that the profiles table has no canonical SQL and its actual RLS/grants are unknown.
- Risk: This is unsupported for `cheongi_user_profiles` and could cause T10 to design an unsafe or nonfunctional administrator profile adapter.
- Recommendation: Limit the service-role/grant conclusion to orders and reports. State that profiles’ deployed grants/RLS are unverified and require the U4 operational-schema check.

- [docs/admin-ops/T03-storage-schema.md:234-269, 485, 495] “Unpopulated,” “public_id is empty,” and “four indexes are useless” are presented as facts despite no production query or backfill audit.
- Risk: Repository search proves current application writes none of the eight columns other than the database default for `admin_status`; it cannot prove historic rows, manual writes, prior deployments, or migrations never populated them. T10 could discard usable data or make incorrect migration assumptions.
- Recommendation: Say “the current reviewed write paths do not populate…” and “their population and index utility in production are unverified.” Keep the safe conclusion: T10 cannot rely on these columns without an operational measurement/backfill decision.

- [docs/admin-ops/T03-storage-schema.md:448] `developmentReportAccess` is declared “always false” for every environment based on environment-variable names rather than verified effective values.
- Risk: The source predicate is correct, but it is true in any non-Vercel/non-production runtime where both URL and public key resolve empty. The stated all-environment conclusion is not established by this task.
- Recommendation: Record the predicate as source fact and mark the all-environment runtime result as configuration-dependent until effective environment presence is verified without exposing values.

- [docs/admin-ops/T03-storage-schema.md:305-307, 473-477] The report labels the DB verification scripts and several rejection cases as successful verification, although this task ran no operational DB query.
- Risk: It misrepresents static script inspection as executed validation and weakens the stated evidence boundary.
- Recommendation: Relabel these as “verification script coverage inspected” and retain only clearly attributed prior-task evidence as historical evidence, with its execution source/result linked.

- [docs/admin-ops/T03-storage-schema.md:23, 130-169, 484, 499] U22 identifies a real hazardous path, but “is recorded as `failed`” and “reconciliation recovery is impossible” are absolute. The catch attempts that update; if storage remains unavailable, even that update can fail.
- Risk: The conclusion is directionally correct but overstates the observable final state without a controlled failure-path test.
- Recommendation: State that a successful approval followed by a recoverable persistence failure can overwrite the state to `failed`, and that the current model lacks a durable `unknown/reconcile` representation. Retain U22 as a blocker for T15/T17/T19.

## 5. Minor Issues

- [docs/admin-ops/T03-storage-schema.md:309-313] The heading says “5 storage modes,” but the listed `ReportStorageMode` values are four: file, postgres, supabase, memory.
- Risk: Confusing inventory terminology.
- Recommendation: Change “5” to “4.”

- [docs/admin-ops/T03-storage-schema.md:460-461] The migration table says reports have seven analytics columns and six indexes. Canonical SQL defines eight analytics columns and seven indexes.
- Risk: Internal inconsistency in the core difference table.
- Recommendation: Correct the counts to eight and seven, respectively.

- [docs/admin-ops/T03-storage-schema.md:516-517] The final blocker summary omits newly documented U21 and U22 from the forward dependency assessment.
- Risk: T15/T17/T19 planning may understate required design decisions.
- Recommendation: Include U21/U22 explicitly, while keeping U17 scoped as an existing-store limitation.

## 6. Verification Gaps

- Gap: No operational confirmation of the deployed profiles schema, grants, RLS, historical analytics-column population, or index selectivity.
- Suggested check: Run read-only schema/grant/index metadata queries and aggregate null/non-null counts under authorized service-role access; do not retrieve customer payloads.

- Gap: Verification scripts were inspected, not executed.
- Suggested check: Execute `scripts/verify-payment-db.sql` and `scripts/verify-report-db.sql` only in an approved non-production or transaction-rollback-safe authorized session, recording sanitized results.

- Gap: No controlled test covers the PG-success/internal-write-failure path.
- Suggested check: Add this later with a fault-injected storage adapter as part of T15/T17 work.

- Gap: U17 is correctly scoped: no existing order revision, conditional update, row lock, or Idempotency-Key persistence exists. The order primary key and sequential `paid/viewed` status guard prevent neither duplicate generated orders nor concurrent approval/refund races.
- Suggested check: T06 can still implement the required guarantees by introducing durable idempotency/operation records and transactional serialization; U17 does not make T06/T15/T17 impossible, only impossible on the current order-store mechanism alone.

## 7. Final Recommendation

- Next action: Revise the evidence wording and count errors above, then approve T03. T04 is safe to start because it is independent regression-baseline collection. T05 remains blocked as documented; T10 must not begin profile or report-read adapter implementation until U4 and the analytics read-model decision are resolved.