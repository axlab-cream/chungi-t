# Audit Report - task-022

## 1. Scope
- Task id: task-022
- Claims audited: (1) admin comp made the reported CTA skip checkout; (2) CTA now reaches INICIS not TOC; (3) one unbound order cannot unlock later readings; (4) legacy buyers keep access; (5) listed checks passed.
- Artifacts read: `CreamAI/backlog/task-022.md`, `CreamAI/reports/task-022_final.md`, `CreamAI/logs/review/task-022_cmdg-entitlement-review.md`, `CreamAI/logs/harness/task-022_test.json`, `CreamAI/logs/test/task-022_test-summary.json`, `CreamAI/logs/events/task-022.jsonl`, `CreamAI/memory/candidates/task-022_memory.md`, `src/payment/entitlement.ts`, `src/server/app.ts` (1600–1708), `사주/사주/index.html` (4598–4628, 5137–5148, 7341–7348), `tests/unit/paid-entitlement.test.ts`, `src/auth/admin.ts:3`, `package.json` test/typecheck scripts, `git status` / `git diff --stat HEAD`.
- Audit time: 2026-09-16T08:01:07Z

## 2. Verdict
- Partially substantiated
- Entitlement binding is covered by unit tests and code; the reported URL/account was never observed, and live CTA→INICIS is explicitly NOT_RUN.

## 3. Claim Ledger
| # | Claim as stated | Evidence found | Verdict |
|---|---|---|---|
| 1 | Admin comp made the reported CTA skip checkout | `src/auth/admin.ts:3` lists `good1621@gmail.com`; `사주/사주/index.html:4614` and `src/server/app.ts:1655` skip checkout for admin. No session/API capture of `https://umsh.kr/cmdg/?authReturn=1&reportId=c27d5b6e14c8e8fc2e550cc623fd#result`. An unbound order would look the same. | unsupported (inferred from code only) |
| 2 | CTA now reaches INICIS instead of the report TOC | Unpaid `open-chat` goes to `go("purchase")` (`index.html:5137–5148`). Same admin URL without `?qa=pay` still skips, by design (S1). Browser E2E is NOT_RUN (`task-022_final.md`). | unsupported as live behavior |
| 3 | One unbound order cannot unlock every later reading | `entitlement.ts:73–83`; `findUnlockingOrder` has no `unlocking[0]` fallback; tests at `paid-entitlement.test.ts:56–82`. | substantiated (unit) |
| 4 | Legacy buyers keep access | `legacyOrderCovers` + tests at `paid-entitlement.test.ts:50–54`. Production unbound-order census BLOCKED (no service role key). | substantiated (unit only) |
| 5 | npm test 683 pass / 0 fail | `CreamAI/logs/harness/task-022_test.json`: `exit_code=0`, tail `pass 683` / `fail 0`. `package.json` test glob includes `tests/unit/paid-entitlement.test.ts` (20 its). | substantiated |

## 4. Unsupported Claims
- Claim: root cause verified on the reported account/URL. Missing: any fetch/log of that `reportId` as `good1621` showing `reason: 'admin'` vs an unbound order. Settle: GET `/api/report/c27d5b6e14c8e8fc2e550cc623fd` as that user (with and without `qa=pay`).
- Claim: CTA now reaches INICIS. Missing: browser run after deploy. Settle: admin + `?qa=pay` click `천명사주 상담` → `purchase` → `/payment?product=cmdg&reportId=...`.
- Claim: `npx tsc --noEmit` clean; `check-integrations.mjs` 10/10; intentional revert of 3 leak tests then restore. Missing: command logs (harness recorded only `npm test`). Settle: re-run and attach stdout.

## 5. Scope Drift
- Files changed outside backlog S1/S2: `CreamAI/scripts/run-projectops-harness.ps1` (disclosed), plus unlisted `CreamAI/scripts/remember-integration.ps1`; `git status` also marks other ProjectOps wrappers. `사주/사주/index.html` is in-scope but `git diff --stat` shows ~802 lines of churn.
- Why it matters: release file list understates the working tree; extra wrapper edits are not part of the entitlement fix.

## 6. Verification Quality
- Would the test fail if the fix were reverted? Leak tests (`paid-entitlement.test.ts:56–59`) yes. HTML snippet tests yes if the admin/QA strings move. `checkoutQaRequested` tests would still pass if `app.ts:1655` dropped `!checkoutQaRequested(req)` — server QA wiring is not executed.
- Gaps: no browser CTA path; no saved tsc/integrations/revert output; on-disk review still says “Changes requested” (`task-022_cmdg-entitlement-review.md`) with no post-fix re-review.

## 7. ProjectOps Record
- Event log present and accurate: `CreamAI/logs/events/task-022.jsonl` has preflight/test/rag/release harness rows only; it does not record tsc, integrations, or revert.
- Failure/success case recorded: yes, `CreamAI/memory/candidates/task-022_memory.md` (`failure_and_success`).
- Memory candidate created: yes.
- Secrets or personal data found: no (admin test email is already in `src/auth/admin.ts`; backlog repeats it).

## 8. Blocking Findings
- Finding: Q1 is inferred, not verified. Q2 (live CTA→INICIS) has no artifact. tsc / integrations / revert are claimed PASS with no run log. Release report is honest about NOT_RUN/BLOCKED (E2E, INICIS charge, legacy census, this audit).
- Why it blocks: the completion sentence treats a unit-tested code path as a proven production CTA fix on the reported URL.
- Smallest action that clears it: after deploy, one browser pass on the reported `reportId` as `good1621@gmail.com` with `?qa=pay`, plus attach tsc and `check-integrations.mjs` stdout.
