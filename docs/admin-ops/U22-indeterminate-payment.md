# U22 — PG 승인 성공 후 저장 실패를 담을 상태

- 작성일: 2026-09-11
- 해소 대상: **U22.** `TASK-007`(이니시스 SignKey 설정)과 `TASK-016`(Play 결제)의 **선행 조건**
- 관련: U17(주문 직렬화, 해소), T14~T19(거래·복구)

## 1. 무엇이 문제였나

이니시스 승인 흐름(`src/server/app.ts` 결제 콜백)은 이 순서였다.

```
updatePaymentOrder(status: 'approving')
approveInicisPayment(...)              ← 이 시점에 이미 돈이 움직인다
updatePaymentOrder(status: 'paid', tid, approvalCode, payMethod, message)
   ...이 쓰기가 실패하면 → catch → updatePaymentOrder(status: 'failed')
```

**승인 결과를 담은 쓰기 하나가 실패하면 승인 사실이 통째로 사라진다.** 그리고 catch 가
주문을 `failed` 로 적는다. 즉 **과금된 주문이 실패로 기록된다.**
`status` enum 에 "승인됐으나 정산 기록이 끝나지 않음"을 담을 값이 없어서 생긴 구멍이다.

U17 의 전이 가드는 `paid → failed` 를 막지만, 이 경우 주문은 아직 `approving` 이라
`approving → failed` 가 허용돼 그대로 통과했다.

## 2. 어떻게 고쳤나 — 순서를 바꿨다

enum 을 늘리는 대신 **증거를 먼저 저장한다.**

```
updatePaymentOrder(status: 'approving')
approveInicisPayment(...)
updatePaymentOrder({ tid, approvalCode, payMethod, message })   ← 증거 먼저. 상태는 그대로
updatePaymentOrder({ status: 'paid' })                          ← 그다음 정산
```

이제 두 번째 쓰기가 실패하면 주문은 **`approving` + `tid`** 로 남는다.
저장소는 그 조합을 "승인됐으나 정산 기록이 끝나지 않음"으로 읽고
**`failed` 로 내려가지 못하게 막는다**(`hasApprovalEvidence`).

### 왜 enum 을 늘리지 않았나
`supabase-payment-orders.sql` 의 `status` 에 체크 제약이 있어 값을 추가하려면 운영
마이그레이션이 필요하다. 그 승인을 기다리는 동안 **구멍이 열려 있게 된다.**
지금 방식은 스키마 변경 없이 오늘 닫힌다. enum 확장(`approved_unsettled`)은
전용 상태가 필요해질 때(대사 화면에서 별도 필터로 세야 할 때) 별건으로 한다.

## 3. 불확정 주문을 찾는 방법

```sql
-- 승인 증거는 있는데 정산이 끝나지 않은 주문
select order_id, owner_id, product_key, amount, tid, approval_code, updated_at
from public.cheongi_payment_orders
where status = 'approving'
  and (coalesce(tid, '') <> '' or coalesce(approval_code, '') <> '')
  and updated_at < now() - interval '10 minutes'
order by updated_at;
```

`10 minutes` 는 정상 승인이 그 안에 끝난다는 가정이다. 그보다 오래 `approving` 에
머물면서 증거가 있으면 사람이 확인해야 한다.

### 정산(수동)
확인 후 `paid` 로 수렴시킨다. 전이 가드가 `approving → paid` 를 허용한다.
환불로 종결할 경우 `cancelled` 로 간다. **`failed` 로는 가지 못한다.**

## 4. 남은 구멍 (정직하게)

| 구멍 | 영향 | 해소 |
| --- | --- | --- |
| **증거 쓰기 자체가 실패** | 승인 사실이 어디에도 남지 않는다. 주문은 `approving`, 증거 없음 → 대사에서 찾을 수 없다 | **outbox/financial_event 필요 (T14)**. 승인 직전에 의도를 append-only 로 남겨야 한다 |
| 고객 권한 | `approving` + 증거 상태는 `orderUnlocks` 가 인정하지 않는다(`paid`·`viewed` 만). **돈을 낸 고객이 정산 전까지 리포트를 못 본다** | 정책 판단 필요. 자동 인정은 "실패한 승인에도 권한을 주는" 위험과 맞바꿈이다 |
| 전용 상태 부재 | 대사 화면에서 `approving`(진행 중)과 불확정을 증거 유무로 구분해야 한다 | enum 확장(별건) |

**증거 쓰기 실패 창은 이 변경으로 좁아졌을 뿐 닫히지 않았다.**
승인 직전 outbox 기록(T14)이 그것을 닫는다.

## 5. TASK-007 과의 관계

`plan.md` 는 TASK-007(이니시스 SignKey 설정 → 실제 결제 활성화)이 **U22 해소 뒤**라고
적어 두었다. 이 문서의 §2 가 그 선행 조건을 충족한다 — 과금된 주문이 실패로 기록되는
경로는 닫혔다. 다만 §4 의 첫 줄(증거 쓰기 실패)은 남아 있으므로,
**결제 활성화 직후에는 §3 의 조회를 하루 단위로 확인하는 운영 절차가 필요하다.**
