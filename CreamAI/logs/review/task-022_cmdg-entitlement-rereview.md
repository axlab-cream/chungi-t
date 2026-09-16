# Review Report - task-022

## 1. Scope
- Task id: task-022
- Reviewed files: `src/payment/entitlement.ts`, `src/payment/order-store.ts`, `src/server/app.ts`, `사주/사주/index.html`, `사주/js/chat.js`, `tests/unit/paid-entitlement.test.ts`, verification logs
- Review time: 2026-09-16T08:09:43Z

## 2. Verdict
- Changes requested
- Summary: M1 and M2 look closed for the reported paths. M3 is only partially closed. The new unbound-order claim path has blocking entitlement bugs: explicit `orderId` access can skip claiming entirely, and concurrent claims can grant more than one reading.

## 3. Critical Issues
- None found.

## 4. Major Issues
- [src/server/app.ts:1659] Issue: An explicit `orderId` is accepted via `orderUnlocks()` before the unbound order is claimed. For a post-cutoff unbound order, `orderUnlocks()` returns true via `unboundOrderIsClaimable()` at `src/payment/entitlement.ts:81`, but `resolvePaidAccess()` returns immediately at `src/server/app.ts:1662-1663` and never calls `claimUnboundOrder()`.
- Risk: A same-owner paid unbound order can be replayed with `orderId` for multiple readings of the same product, reopening the unlimited-readings leak.
- Recommendation: Route claimable unbound orders through an atomic claim before returning entitlement. Only grant after the order is bound to the requested `reportId`, or after reread confirms it is already bound to that same `reportId`.

- [src/server/app.ts:1627] Issue: `claimUnboundOrder()` is not race-safe. `updatePaymentOrder()` retries with the same `{ reportId }` patch at `src/payment/order-store.ts:636-637`; on retry, it can overwrite a `reportId` another request just claimed because the write path sets `report_id = COALESCE($7, report_id)` at `src/payment/order-store.ts:537-540`.
- Risk: Two concurrent opens of different readings can both be granted; final binding is last-writer-wins. If the claim write fails, `claimUnboundOrder()` returns the original unbound order at `src/server/app.ts:1632`, so fail-open can keep granting access while the order remains reusable.
- Recommendation: Make claim conditional on current `reportId` being empty or equal to the requested report. If it is bound elsewhere, deny this reading. Do not fail open for claim conflicts/write failures on money entitlement.

- [사주/js/chat.js:1080] Issue: M3 is partially closed. `chat.js` sends `qa=pay` for `/api/chat`, but its paid-gated `/api/report/section` calls for PDF preparation and report section loading omit the QA flag at `사주/js/chat.js:1080-1088` and `사주/js/chat.js:1620-1628`.
- Risk: Admin QA on `chat.html?qa=pay` can still exercise section generation through admin comp instead of order entitlement, leaving a false-positive QA path.
- Recommendation: Include `...(checkoutQaMode() ? { qa: 'pay' } : {})` on every `chat.js` `/api/report/section` request, and cover it with a guard.

## 5. Minor Issues
- None found.

## 6. Verification Gaps
- Gap: Tests cover entitlement predicates and source assertions, but not the route behavior where explicit `orderId` should claim/bind a post-cutoff unbound order.
- Suggested check: Add an integration/unit route test proving one unbound order becomes bound on first use and cannot unlock a second report via repeated `orderId`.

- Gap: No concurrency test covers two simultaneous claim attempts for different report IDs.
- Suggested check: Add a store-level or route-level race test asserting only one report is granted and the final `reportId` is not overwritten.

## 7. Final Recommendation
- Next action: Fix unbound-order claiming before approval. M1/M2 can stay closed; M3 needs the remaining `chat.js` paid-gated calls patched.