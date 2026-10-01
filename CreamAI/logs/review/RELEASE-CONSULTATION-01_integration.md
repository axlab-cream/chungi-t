요청은 미커밋 consultation/coupon 릴리스 통합 리뷰입니다. 관련 스킬과 리뷰 규약을 먼저 읽고, 변경 파일과 검증 범위를 확인하겠습니다.KMS와 미커밋 diff, 신규 모듈 위치를 병렬로 확인합니다.위키 인계 노트와 리뷰어 프롬프트, 통합 지점 소스를 읽겠습니다.통합 초점 네 가지를 코드에서 직접 확인합니다. GEMINI 판매 게이트, vault 공존, 소유권, 쿠폰 차감입니다.`app.ts`에 merge conflict 마커가 보입니다. 해당 구간과 판매 게이트, vault 연동을 확인합니다.결제 언락, vault 목록, 저장 가드, 주문 생성 경로를 이어서 확인합니다.# Review Report - RELEASE-CONSULTATION-01 consultation/coupon integration

## 1. Scope
- Task id: RELEASE-CONSULTATION-01
- Reviewed files: `src/server/app.ts`; `src/consultation/{auth,backend,credits,provider,storage-guard,voice}.ts`; `src/coupons/{contracts,router,store}.ts`; `src/payment/{order-store,catalog,refund-store}.ts`; `src/report/{vault-list,report-completion-job}.ts`; `src/server/service-directory.ts`; `사주/vault.html`; `사주/js/{consultation,payment,payment-result}.js`; `supabase/migrations/20261002081000_protect_consultation_ledger.sql`; `supabase/migrations/20261002100000_coupon_store.sql`; `vercel.json`; `scripts/prepare-vercel-public.mjs`; `api/consultation-voice.py`; focused unit tests under `tests/unit/consultation-*.ts`, `tests/unit/coupon-*.ts`, `tests/unit/vault-purchase-order.test.ts`, `tests/unit/payment-result-reading-path.test.ts`; KMS notes `personal/carrotcap/notes/umsh-consultation-20261002.md`, `umsh-consultation-payment-20261002.md`, `umsh-coupons-20261002.md`
- Review time: 2026-10-01T23:48:07Z

## 2. Verdict
- Changes requested
- Summary: Cross-product unlock, consultation ledger isolation, Gemini checkout/chat fail-closed, coupon owner binding, and vault history coexistence are in place. Two integration holes remain before opening sales: customer vault still keys “구매한 운” only to the latest 100 payment rows (consultation packs have no `reportId` and crowd that window), and `service_free` coupon unlocks never enter that vault list. A 4,900원 consultation pack also trips the existing “any settled order” today-fortune depth flag. Gemini sales gating is implemented on chat/context and consultation checkout, but there is no test covering a missing `GEMINI_API_KEY`.

## 3. Critical Issues
- None. Paid report GET still matches bound orders by `reportId` before coupon lookup (`src/server/app.ts:1985-1987`, `2039-2043`). Consultation rows are excluded from customer-facing report APIs (`1710-1711`, `5105`, `4136`). Coupon spend is owner-scoped and CAS-local to the member ledger (`src/consultation/credits.ts:33-41`, `74-85`; `src/consultation/backend.ts:277-280`). Gemini-missing checkout returns 503 (`src/server/app.ts:3542-3546`).

## 4. Major Issues
- [`src/server/app.ts:4042-4067`] Issue: `/api/user/reports` loads `listPaymentOrders(owner.id, 100)` then `selectPurchasedReadings`. Consultation packs are stored with `reportId: undefined` (`3586`) and still occupy that 100-row `updated_at desc` window. `selectPurchasedReadings` ignores unbound orders (`src/report/vault-list.ts:56-58`, `123-124`), so recent question-pack / failed-checkout rows can push older paid report orders out of the fetch and drop them from 보관함 “구매한 운”.
  - Risk: Existing paid readings remain open by direct `/api/report/:id` (bound lookup uses `listPaymentOrders(..., reportId)`), but the vault history that customers actually use can hide purchased reports after consultation checkout volume.
  - Recommendation: When listing vault/unlock fallback orders, filter out `productKey === 'cheonmyeong_consultation'` or query settled report-bound orders only. Add a regression with >100 recent consultation orders plus one older paid `cmdg` row.

- [`src/report/vault-list.ts:101-116`] Issue: Customer vault eligibility is payment-order lineage only. `hasCouponReportAccess` entitles GET `/api/report/:id` (`src/server/app.ts:2041-2043`) and `/api/coupons/use` enqueues generation (`src/coupons/router.ts:70-72`), but a `service_free` bind writes `wallet.reportId` and creates no payment order (`src/coupons/store.ts:119-123`). `selectPurchasedReadings` therefore omits coupon-unlocked reports. `vault-purchase-order.test.ts` never asserts coupon access.
  - Risk: Member uses a free coupon, lands on `/r/:id`, then cannot find that reading again in 보관함.
  - Recommendation: Treat coupon-bound `reportId`s as purchased (same owner + product + exact id). Keep the documented epoch non-transfer rule, but list the bound report.

- [`src/server/app.ts:4088-4091`] Issue: `todayFortuneOptions` still uses `hasSettledPaymentOrder`, which is any `paid`/`viewed` row (`src/payment/order-store.ts:518-522`). A 4,900원 `cheonmyeong_consultation` pack now satisfies that check and sets today-fortune `purchaseDepth` (`src/saju/today-fortune.ts:650`).
  - Risk: Question-pack buyers receive the paid today-fortune lens without buying a reading SKU.
  - Recommendation: Exclude `cheonmyeong_consultation` from the settled-order predicate used for today-fortune depth (keep report SKUs only).

- [`src/report/report-completion-job.ts:391-406`] Issue: Cron backfill treats a row as paid only if an order id/result/public id matches or `adminAcquiredAt` is set. Coupon bind stamps the queue job `paid: true` once (`src/server/app.ts:1860-1863`) but does not persist an order. If that enqueue is lost, the coupon report falls into the unpaid teaser bucket (one latest per owner+service) and can lose the 30–50 minute completion retry that paid reports get.
  - Risk: Coupon-unlocked generation stalls unless the member reopens the report.
  - Recommendation: Include `hasCouponReportAccess` report ids (or a durable entitled flag) in `selectBackfillReports` paid selection.

## 5. Minor Issues
- [`src/consultation/voice.ts:14`] Issue: Saved answers may be up to 12,000 characters (`src/consultation/backend.ts:271`) while TTS still rejects `text.length > 2000`. Python bridge matches that cap (`api/consultation-voice.py:28`). Chat text is kept; audio returns `audioError`.
  - Risk: Voice replies silently fall back on the long-form answers the response policy now allows.
  - Recommendation: Chunk or raise the TTS limit in the same change set that removed the previous quiet 2,000-character cut.

- [`src/coupons/store.ts:96-101`] Issue: Admin `usedCount` counts wallets with `reportId`. `consultation_questions` spend lives in the member ledger `usedByCoupon`, so campaign used-count stays 0 after questions are consumed.
  - Risk: Operators cannot see consultation coupon consumption from the campaign list (wallet remaining via `/api/coupons` is the real figure).
  - Recommendation: Surface ledger usage in the admin DTO, or document that `usedCount` is report-bind only.

- [`사주/js/consultation.js:118`] Issue: Vault load failure copy is “추가 풀이를 열지 못했어요” while reader-history cards still render in `#list`.
  - Risk: A consultation API failure looks like saved-chat history failed.
  - Recommendation: Use 천명상담-specific copy.

## 6. Verification Gaps
- Gap: No unit/HTTP test asserts missing `GEMINI_API_KEY` returns `CONSULTATION_SETUP_REQUIRED` on `/api/consultation/context`, `/api/consultation/chat`, and `POST /api/payment/orders` for `cheonmyeong_consultation`, while a normal report order still 2xx. Suggested check: isolated `app.ts` route test with empty key, plus a `cmdg` order control.
- Gap: Coupon-unlocked vault listing, consultation-order crowding of the 100-row vault query, and today-fortune `purchaseDepth` after a consultation pack are untested. Suggested check: extend `vault-purchase-order.test.ts` and `daily-report.test.ts`.
- Gap: Full Express/Play/report GET HTTP suite and `tsc --noEmit` remain blocked by pre-existing `calculateLoveMonthlySignals` / `jobchoice-preview-quota` / `workAlternative` errors (KMS CONSULTATION-01/COUPON-01). This review did not re-run tests. Suggested check: keep those three green before claiming app-level integration.
- Gap: Production `consultation_ledger_protection_ready` and `coupon_state` migrations are prepared only. Without them, consultation/coupon APIs fail closed; paid report GET is protected by `.catch(() => false)` on coupon lookup. Suggested check: apply both migrations in an approved window, then re-run the isolated SQL guards.
- Gap: Live Gemini, real member reopen of transcripts, real PG, and coupon-unlocked 06-1 fill are NOT_RUN. Structure/HTTP 200 is not generation-complete. Suggested check: one logged-in paid report reopen plus one coupon-unlock and one consultation pack after Gemini is configured.

## 7. Final Recommendation
- Next action: Fix vault paid-listing (exclude consultation orders; include coupon-bound report ids), stop consultation packs from granting today-fortune `purchaseDepth`, and add the Gemini sales-gate plus vault crowding tests. Do not open production consultation/coupon sales until both SQL migrations are applied and those regressions are green. Residual risk after that: real Gemini/PG/member E2E and the pre-existing typecheck blockers.