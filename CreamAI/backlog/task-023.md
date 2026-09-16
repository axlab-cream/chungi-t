---
task_id: task-023
status: queued
active: false
owner: claude-pm
created: 2026-09-16
priority: P1
depends_on: [task-022]
decision: B — 단독 관리자 즉시 실환불 + 보상 통제 (사용자 승인 2026-09-16)
---
# task-023 — 관리자 원클릭 환불

## 착수 보류 (2026-09-16)
사용자가 B(단독 관리자 즉시 실환불 + 보상 통제)를 선택했고 그 결정은 확정이다. 다만 직후
task-022 의 미완료 3개 항목(운영 배포 후 브라우저 확인, 이니시스 실승인, 레거시 컷오프
실데이터)을 먼저 진행하기로 해 이 Task 는 큐로 되돌렸다. 재개 시 결정 B 로 바로 착수한다.

## 사용자 요청 (2026-09-16)
"환불은 자동환불이 가능하도록 주문번호를 관리자에 저장해서 원클릭으로 환불할 수 있게 해줘"

## 이미 있는 것 (착수 전 실측)
- 주문 저장·조회: `cheongi_payment_orders`, `GET /api/admin/v1/orders`,
  `GET /api/admin/v1/orders/:orderId` (admin-ui `주문` 탭에서 목록·단건 조회 동작)
- 환불 intent 저장: `POST /api/admin/v1/orders/:orderId/refund-requests`,
  `src/payment/refund-store.ts` (`create_refund_request`, `approveRefundRequest`)
  — idempotency key + order revision CAS + 요청자/승인자 이메일 분리
- 이니시스 환불 호출부: `src/payment/inicis.ts` `cancel({ tid, reason })`
- 즉, "주문번호를 관리자에 저장"은 이미 되어 있다. 빠진 것은 PG 실환불 실행이다.

## 빠진 것
- PG 실환불 실행이 의도적으로 잠겨 있다. `src/payment/inicis.ts:274` 주석:
  "This boundary neither uses global fetch nor persists/refunds an order. T17 owns live
  execution after durable refund intent and independent approval exist."
- admin-ui 도 "별도 관리자의 승인이 필요하며 PG 환불은 실행되지 않았습니다"를 표시한다.

## 결정 필요 (구현 전 사용자 확인)
현재 설계는 요청자와 승인자를 분리한 2인 승인이다. "원클릭 자동환불"은 이 통제를 없앤다.
다음 중 하나를 골라야 한다.

- A. 원클릭 = 환불 요청까지. 승인은 다른 관리자가 1클릭으로. (기존 통제 유지, 권장)
- B. 원클릭 = 단독 관리자가 즉시 실환불. 금액 상한·일일 한도·전액 환불 한정 등의
     보상 통제를 같이 넣는다.
- C. 소액 전액 환불만 단독 원클릭, 그 외는 2인 승인.

## Scope (결정 후 확정)
- S1. 승인된 refund intent 를 이니시스 `cancel()` 로 실행하고 결과를 주문/refund 레코드에 기록
- S2. 실패·부분환불·중복요청 처리 (idempotency, 재시도, PG 응답 코드 분류)
- S3. admin-ui 주문 목록 행에서 환불 액션 1클릭 노출 (주문번호 재입력 제거)
- S4. 감사 로그 (누가, 언제, 얼마, 사유, PG tid, 승인자)

## Risks
- 실제 돈이 나가는 경로다. 테스트 MID 없이 운영에서 검증할 수 없다.
- 단독 원클릭은 오조작·내부자 리스크가 크다. B 선택 시 보상 통제 없이 배포 금지.
- 부분환불·이미 취소된 주문·기간 만료 건의 PG 응답 분기를 확인해야 한다.

## Verification steps (초안)
- refund intent → 승인 → PG 실행 상태 전이 단위 테스트
- 중복 요청이 이중 환불로 이어지지 않는지 (idempotency) 테스트
- 이니시스 테스트 MID 로 실환불 1건 (사용자 승인 필요)
