# T15 승인 금융 이벤트·상태 투영

## observation

기존 주문 상태만으로는 승인 콜백 재전송과 열람 상태 변경을 매출과 구분하기 어렵고, 승인 성공 뒤 주문 저장이 실패하면 과금 사실의 회수 근거가 약하다.

## decision

승인 이벤트를 `financial_events`에 append-only로 먼저 기록한다. `provider + source_ref`를 고유키로 사용해 같은 결제 증거가 다른 주문·금액으로 재사용되지 않게 한다. 주문 `paid` 전이는 이 기록 다음에만 실행한다.

## artifact

- `src/payment/financial-events.ts`
- `src/payment/payment-projection.ts`
- `supabase/migrations/20260911135743_financial_events_projection.sql`
- `supabase/migrations/20260911140132_financial_events_append_only_grants.sql`

## QA result

- 금융·결제 회귀 50/50 PASS
- typecheck PASS, Vercel build PASS
- Production DB: RLS true, provider/source_ref unique index, service_role INSERT/SELECT만 유지
- Production `/admin/orders` 확인

## lesson

기본 grant가 append-only 의도를 자동으로 보장하지 않는다. migration 직후 실제 role grants를 조회해 UPDATE/DELETE를 명시적으로 회수해야 한다.

## relation

- T15 → T16 PG 조회/취소 adapter
- T15 → T17 환불 요청·승인·실행
- T15 → T19 거래 대사

## next_patch

T16에서 실제 PG 조회·취소 adapter 계약을 공식 문서 기준으로 확정하고, T19에서 `approving`+금융 이벤트 상태를 대사 대상으로 노출한다.
