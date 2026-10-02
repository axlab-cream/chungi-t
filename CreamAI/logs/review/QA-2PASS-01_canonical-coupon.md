리뷰 범위는 쿠폰 리딤의 canonical report identity, owner 인가, 프론트 redirect, fixture 격리입니다. 관련 스킬·diff·코드를 읽은 뒤 구조화된 리포트만 작성합니다.git diff와 쿠폰·인가·redirect 관련 파일을 읽고, 리뷰 초점을 코드에 맞춰 확인합니다.diff가 잘려 핵심 구현과 테스트 격리를 파일에서 직접 확인합니다.인가·ID 정규화·redirect·테스트 격리가 실제로 맞는지, `findReportRecord`와 entitlement 경로를 확인합니다.격리 여부를 확인하기 위해 영향받는 테스트를 실행합니다. 리뷰는 읽기 전용입니다.# Review Report - QA-2PASS-01 canonical coupon report identity

## 1. Scope
- Task id: QA-2PASS-01
- Reviewed files: `src/coupons/router.ts`; `src/server/app.ts`; `사주/js/payment.js`; `tests/unit/coupon-router.test.ts`; `tests/unit/report-api-chat.test.ts`; related read-only: `src/coupons/store.ts`; `src/report/report-store.ts`; `src/report/vault-list.ts`; `사주/js/umsh-report-access.js`; `사주/payment/index.html`
- Review time: 2026-10-02T00:09:23Z

## 2. Verdict
- Approved with comments
- Summary: Coupon `/use` now resolves the caller-owned record and binds `report.reportId` (canonical), not the public `resultId`. Owner scoping, vault exact-id match, and the payment redirect query all follow that canonical id. Affected tests passed (20/20): `coupon-router`, `coupon-store`, `report-api-chat`. No remaining bind/identity mismatch in this patch. Production DB/provider setup is out of scope.

## 3. Critical Issues
- None.

## 4. Major Issues
- None.

## 5. Minor Issues
- [`tests/unit/report-api-chat.test.ts:264-281`] Issue: The new HTTP case writes campaign `QA_ALIAS1` and a bound wallet row into the default coupon test singleton. It does not call `configureCouponStorageForTests(createMemoryCouponStorageForTests())` or restore in `finally`, unlike `tests/unit/coupon-router.test.ts:8-14,40` and `tests/unit/coupon-store.test.ts:7-8`. Only the report row is deleted.
  - Risk: Same-file re-run or a later case in this suite can see `COUPON_CODE_EXISTS` or a leftover wallet binding. Current adjacent cases in this file still passed.
  - Recommendation: Allocate a fresh memory adapter at the start of the case and `configureCouponStorageForTests(null)` in `finally`. Keep the HTTP app on that same adapter.

- [`src/coupons/router.ts:17-18,67-75`] Issue: `resolveReport` calls `findReportRecord(requestedId, owner)`. On file/memory (and postgres-by-pk) that lookup can throw `REPORT_ACCESS_DENIED` (`src/report/report-store.ts:124-126,554-581`). `couponFailure` maps non-`CouponError` to 503 `COUPON_STORE_UNAVAILABLE`. Missing/unowned ids that return `null` stay 400 `COUPON_REPORT_REQUIRED`.
  - Risk: Wrong-owner `/api/coupons/use` is still denied (no bind). In file/postgres modes the status is 503 instead of 400/403, unlike `/api/report/:id` (`src/server/app.ts:4169`). Production Supabase resultId/user_id lookup returns `null` and therefore 400.
  - Recommendation: Catch `REPORT_ACCESS_DENIED` in `/use` and return 400 `COUPON_REPORT_REQUIRED` (or 403). Add the other-owner HTTP case next to the alias bind test.

## 6. Verification Gaps
- Gap: The new case asserts `item.reportId`, store `hasCouponReportAccess`, and vault membership. It does not assert top-level `payload.reportId` / `payload.returnTo`, and it does not GET `/api/report/:resultId` after bind to lock entitled body (`previewOnly` false). Frontend redirect reads those top-level fields (`사주/js/payment.js:286-289`).
  - Suggested check: After `/use` with `saved.resultId`, assert `payload.reportId === saved.reportId`, `payload.returnTo === '/r/' + encodeURIComponent(saved.reportId)`, then GET `/api/report/${saved.resultId}` as the owner (`entitled` / no preview-only paid body) and as `otherOwner` (403).
- Gap: `coupon-router.test.ts:14` still identity-maps `reportId`; alias rewrite is covered only in the chat HTTP suite.
  - Suggested check: Mock `resolveReport` so requested id `alice-public` returns `{productKey:'cmdg', reportId:'alice-canonical'}` and assert bind + `queued` use `alice-canonical`.
- Gap: `사주/payment/index.html` still loads `/js/payment.js?v=20261002-coupons` while `payment.js` changed. Stale clients keep `reportId` as the page UUID on `/r/{canonical}`; GET still resolves UUID then checks `record.reportId` (`src/server/app.ts:5112`, `2043`).
  - Suggested check: Bump the payment script query if this ships, or confirm CDN/HTML already cache-busts the new file.

## 7. Final Recommendation
- Next action: Ship this identity patch. Optional follow-up: isolate the HTTP coupon fixture and map wrong-owner `/use` to 400/403. Do not treat pending production DB/Gemini/PG activation as a code-review blocker.