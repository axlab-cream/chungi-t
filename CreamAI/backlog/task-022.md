---
task_id: task-022
status: needs_review
active: true
owner: claude-pm
created: 2026-09-16
priority: P0
depends_on: []
resolves: [cmdg-checkout-bypass]
---
# task-022 — 천명사주 결과 CTA가 결제창 대신 해석 목록으로 간다

## Symptom (user report, 2026-09-16)

`https://umsh.kr/cmdg/?authReturn=1&reportId=c27d5b6e14c8e8fc2e550cc623fd#result`
에서 티저를 끝까지 본 뒤 `천명사주 상담` 버튼을 누르면 이니시스 결제창이 아니라
`/chat.html` 의 "천명사주 목차"(해석 목록) 화면으로 바로 이동한다.

## Root cause (code-traced, not inferred)

1. `사주/사주/index.html` `open-chat` 핸들러는 `isCurrentReportPaid()` 가 true 면
   결제 단계를 건너뛰고 `/chat.html` 로 보낸다. 미결제일 때만 `go("purchase")` →
   `startCheckout()` → `/payment?product=cmdg` 로 간다. 결제 부착 자체는 살아 있다.
2. 테스트 계정 `good1621@gmail.com` 은 `src/auth/admin.ts` 의 관리자 목록에 있다.
   서버 `resolvePaidAccess()` 가 `reason: 'admin'` 으로 즉시 entitled 를 주고
   `applyAdminReportUnlock()` 이 `isPaid/paid/entitlement/paymentStatus` 를 모두
   결제 상태로 찍는다. 클라이언트에도 `if (isAdminAccount) return true;` 지름길이 있다.
   → 관리자 계정으로는 결제창을 볼 수 없다. 이것이 사용자가 본 증상의 직접 원인이다.
3. 별개의 결제 누수: `orderUnlocks()` 는 `order.reportId` 가 비어 있으면 무조건
   true 를 반환하고, `findUnlockingOrder()` 는 `?? unlocking[0]` 로 리포트에 결속되지
   않은 아무 주문이나 집어온다. cmdg 주문 1건이 있으면 이후 모든 천명사주 리포트가
   영구 무료로 열린다.

## Scope (user-approved 2026-09-16)

- S1. 관리자 QA 모드: 명시적 플래그가 있을 때는 관리자도 결제 플로우를 끝까지 탄다.
  평상시 관리자 무료 열람은 유지한다.
- S2. 주문-리포트 결속 강화 + 레거시 주문 보호: 신규 주문은 reportId 에 엄격히
  결속하고, reportId 가 없는 과거 주문은 기존 유료 고객 접근이 끊기지 않도록
  제한적으로만 인정한다.

## Out of scope

- 이니시스 승인/환불 로직, 금액 정책, Android/Google Play 결제 경로.
- cmdg 외 서비스의 CTA 문구/화면 재설계.

## Success criteria

- 관리자 계정 + QA 플래그로 `천명사주 상담` 을 누르면 결제 화면(`purchase`)을 거쳐
  `/payment?product=cmdg&reportId=...` 로 진입한다.
- QA 플래그 없는 관리자 계정은 기존처럼 무료로 리포트를 연다 (회귀 없음).
- 일반 계정이 해당 리포트를 결제하지 않았으면 결제 화면으로 간다.
- reportId 에 결속된 주문은 그 리포트만 연다.
- reportId 가 없는 레거시 주문은 정책대로 동작하고, 기존 유료 고객이 잠기지 않는다.

## Risks

- entitlement 판정을 조이면 과거 결제 고객의 열람이 끊길 수 있다 (CS/환불 리스크).
  레거시 주문 보호 없이 배포하지 않는다.
- 관리자 무료 열람은 운영 확인 경로다. QA 플래그가 기본값이 되어선 안 된다.

## Verification steps

- `npm test`, `npm run typecheck`
- `node scripts/check-integrations.mjs`
- entitlement 단위 테스트 (admin QA 플래그 / 결속 주문 / 레거시 주문 / 무주문)

## Outcome (2026-09-16)
- 근본원인: 테스트 계정이 관리자(`good1621@gmail.com`, `src/auth/admin.ts`)여서 서버가 리포트를
  결제 상태로 해제하고 클라이언트 관리자 지름길이 결제 단계를 건너뛰었다. 코드 회귀가 아니다.
- S1 완료: `?qa=pay` 가 관리자 면제만 제거한다 (권한 부여 경로 없음).
- S2 완료: 주문-리포트 결속 강화, 레거시 주문은 컷오프 이전 리포트만, 컷오프 이후 미결속 주문은
  claim-on-first-use (CAS, fail-closed). 모든 주문 자격은 `settleOrderAccess` 한 곳을 통과한다.
- 리뷰 3회 → Approved (Critical 0 / Major 0). 감사: Partially substantiated (운영 재현 NOT_RUN).
- 검증: npm test 693/693, tsc 0, check-integrations 10/10 PASS.
- 남은 것: 배포 후 관리자 계정 브라우저 1회 확인, 레거시 컷오프 실데이터 확정.

