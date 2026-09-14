# T15 금융 이벤트·상태 투영 Implementation Plan

> **For agentic workers:** Execute inline with test-first changes; no financial refund, cancellation, or PG API mutation is included.

**Goal:** 승인된 결제의 불변 금융 증거를 중복 없이 먼저 기록하고, 기존 주문 상태를 그 증거 후에만 `paid`로 투영한다.

**Architecture:** `financial_events`는 서버 전용 append-only 원장이다. 결제 승인마다 `provider + source_ref`의 고유 키를 기록하고, 이미 있는 증거는 같은 주문의 재전송으로만 취급한다. `viewed`는 금융 이벤트를 만들지 않아 매출이 중복되지 않는다.

**Tech Stack:** Express, TypeScript, Supabase PostgREST, PostgreSQL migration, Node test runner.

## Global Constraints

- RLS를 켜고 `anon`·`authenticated` 권한을 명시적으로 제거한다.
- 서비스 역할 키는 서버에서만 사용하며, 이벤트 원문·개인정보·PG 응답 전문은 저장하지 않는다.
- 금액은 기존 주문 금액과 동일해야 하며, 환불·취소·PG 조회는 다음 Task에서만 구현한다.
- 기존 상태값 `ready/approving/paid/viewed/cancelled/failed`를 바꾸지 않는다.

### Task 1: 원장 저장소와 테스트

**Files:**
- Create: `src/payment/financial-events.ts`
- Create: `tests/unit/financial-events.test.ts`
- Modify: `supabase/migrations/20260911135743_financial_events_projection.sql`

- [ ] 원장 이벤트의 provider/source_ref 중복, 양수 금액, 금액 불변, 서버 전용 헤더를 검증하는 실패 테스트를 작성한다.
- [ ] `financial_events`와 `(provider, source_ref)` 고유 인덱스, append-only 권한을 추가한다.
- [ ] PostgREST 저장소는 재전송에서 기존 행을 읽고, 다른 주문에 같은 source_ref를 쓰면 거부한다.
- [ ] 단위 테스트와 타입 검사를 실행한다.

### Task 2: 승인 상태 투영

**Files:**
- Modify: `src/server/app.ts`
- Modify: `tests/unit/payment-order-concurrency.test.ts`

- [ ] 실제 이니시스·Google Play·테스트 승인 경로가 금융 이벤트 기록 뒤에만 `paid`로 상태를 바꾸는 실패 테스트를 작성한다.
- [ ] 승인 이벤트 기록과 주문 상태 투영을 공통 함수로 연결한다.
- [ ] `viewed` 경로에는 금융 이벤트를 추가하지 않는 회귀 테스트를 실행한다.
- [ ] API 오류와 중복 승인 재전송을 검증한다.

### Task 3: 운영 반영과 증거

**Files:**
- Modify: `plan.md`
- Modify: `status.md`

- [ ] migration을 운영 DB에 적용하고 RLS/grant/고유키를 확인한다.
- [ ] 타입·단위·Vercel build를 실행하고 Production 배포를 확인한다.
- [ ] KMS에 검증된 원장 패턴을 기록한다.
