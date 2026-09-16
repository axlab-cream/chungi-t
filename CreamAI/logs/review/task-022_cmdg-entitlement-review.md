# Review Report - task-022

## 1. Scope
- Task id: task-022
- Reviewed files: `src/payment/entitlement.ts`, `src/server/app.ts`, `사주/사주/index.html`, `tests/unit/paid-entitlement.test.ts`, relevant payment/chat client code
- Review time: 2026-09-16T07:37:10Z

## 2. Verdict
- Changes requested
- Summary: Server-side `qa=pay` does not appear to grant non-admin entitlement or alter amount/order/PG callback behavior. The bound-order Inicis return path is intact. However, the client can still let cached/admin-paid state bypass checkout, and follow-up paid-gated calls can still use admin comp because they do not carry the QA flag.

## 3. Critical Issues
- None found.

## 4. Major Issues
- [사주/사주/index.html:4929] Issue: `loadReportById()` trusts cached history before doing the fresh `/api/report/:id?qa=pay` fetch. In QA mode, a report previously opened by an admin can be cached with `report.isPaid/paymentStatus/entitlement` from admin comp, and `isCurrentReportPaid()` still honors those flags at `사주/사주/index.html:4611`.
- Risk: The exact CTA regression can persist in an admin browser with cached admin-unlocked state: `open-chat` skips checkout at `사주/사주/index.html:5124` even though `?qa=pay` was intended to prove paid access through an order.
- Recommendation: In `isCheckoutQaMode()`, bypass local cached analysis for report reopen, force a server refresh, and ignore cached/local paid flags that were not freshly returned as an order entitlement. At minimum, do not treat `unlockReason: "admin"` or local paid-id state as paid while `qa=pay` is active.

- [사주/사주/index.html:7328] Issue: `rememberPaidReport(initialReportId)` runs as soon as the URL has `paid=1`, before confirming the order status or that the server returned a paid report. `isCurrentReportPaid()` later accepts that localStorage marker at `사주/사주/index.html:4616`.
- Risk: A forged or stale `?paid=1&reportId=...` can seed client paid state. Server endpoints still protect paid content, but the client can hide checkout and route a non-entitled user/admin QA session into the broken chat path.
- Recommendation: Move `rememberPaidReport()` after successful server entitlement verification, or remove the local paid-id shortcut from the payment gate.

- [사주/사주/index.html:5935] Issue: QA mode is not propagated to follow-up paid-gated APIs. `fetchReportSection()` and `prewarmReport()` send only report/section/context, and `사주/js/chat.js:1746` sends `/api/chat` without `qa=pay`; the server admin shortcut still applies when the flag is absent at `src/server/app.ts:1674`.
- Risk: After the first QA report load, section generation/prewarm/chat can be authorized by admin comp instead of the bound order. This can make production QA falsely pass even if order entitlement is broken.
- Recommendation: Carry `qa=pay` through section, prewarm, and chat requests, or replace the query flag with a server-side session QA mode that applies consistently across the flow.

## 5. Minor Issues
- None found.

## 6. Verification Gaps
- Gap: The new unit tests assert source snippets in `tests/unit/paid-entitlement.test.ts:109`, but do not exercise cached admin-paid history, forged `paid=1`, or follow-up `/api/report/section` and `/api/chat` behavior.
- Suggested check: Add a client/DOM or targeted integration test for `?qa=pay` with cached admin-paid report state and with stale local paid IDs.

- Gap: The local task harness artifact `CreamAI/logs/test/task-022_test-summary.json` records no executed commands, while the task body says `tsc`, `npm test`, and integration checks passed.
- Suggested check: Attach or regenerate the actual command outputs for the claimed 677/677 and integration PASS run.

## 7. Final Recommendation
- Next action: Fix the client QA cache/local-paid bypass and propagate QA mode to all paid-gated follow-up requests, then rerun unit tests plus a browser QA scenario using an admin account with pre-existing cached report history.