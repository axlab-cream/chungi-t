# Review Report - task-022

## 1. Scope
- Task id: task-022
- Reviewed files: `src/payment/entitlement.ts`, `src/payment/order-store.ts`, `src/server/app.ts`, `사주/js/chat.js`, `tests/unit/paid-entitlement-claim.test.ts`, `tests/unit/paid-entitlement.test.ts`, `CreamAI/logs/test/task-022_commands.log`
- Review time: 2026-09-16T08:24:30Z

## 2. Verdict
- Approved with comments
- Summary: M4, M5, and M6 are closed. Explicit `orderId` now routes through `settleOrderAccess`; post-cutoff unbound claims are CAS-backed and fail closed; all 3 flagged `chat.js` calls send `qa=pay`.

## 3. Critical Issues
- None.

## 4. Major Issues
- None.

## 5. Minor Issues
- [src/server/app.ts:1607] Issue: `findUnlockingOrder()` still returns already-bound orders directly via `orderBinds()`.
- Risk: `settleOrderAccess` is not literally the single choke point, though this branch appears currently safe.
- Recommendation: Route these returns through `settleOrderAccess()` if the single-choke invariant must be exact.

- [src/server/app.ts:1622] Issue: Legacy unbound orders are granted directly via `legacyOrderCovers()`.
- Risk: Same as above; no current post-cutoff claim bypass observed.
- Recommendation: Use `settleOrderAccess()` for legacy returns too, or document this as an intentional exception.

## 6. Verification Gaps
- Gap: Explicit `orderId` replay is covered at entitlement-helper level, not through the `/api/report/:id?orderId=` route.
- Suggested check: Add a focused route test when convenient. Current source review confirms the route calls `settleOrderAccess()` at `src/server/app.ts:1654`.

## 7. Final Recommendation
- Next action: Approve; optionally tighten `findUnlockingOrder()` so `settleOrderAccess()` is literally the only order entitlement return path.