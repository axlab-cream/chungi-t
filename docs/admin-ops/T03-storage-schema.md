# T03 — 저장소 스키마·권한 조사

- pack task: `admin-ops-execution-pack/15-TASKS.md` T03 (M0 / P0 / 선행 T01)
- CreamAI task: `task-t03`
- 요구 추적: R01 / 참고: 08-DATA, 13-SECURITY
- 작성일: 2026-09-10
- 기준: 로컬 HEAD `dac3835` (`fix/umsh-qa-ux`) = 운영 배포 계열 (U1/U7 해소)
- **운영 DB를 직접 쿼리하지 않았다.** 이 세션에는 service_role 키가 없다.
  아래 스키마는 **정본 SQL 파일과 애플리케이션 코드**를 근거로 하며, 운영 DB에 실제로
  적용된 상태의 확인은 U4로 남는다.
- 증거 경계 (Codex 리뷰 Major 1 반영):
  - `cheongi_payment_orders`·`cheongi_reports`는 정본 SQL이 `revoke all from anon, authenticated`와
    `grant … to service_role`을 수행하도록 작성되어 있고, task-002의 anon 키 REST 조회가
    3개 테이블 모두에서 HTTP 401 `42501`을 받은 것이 이와 일치한다.
  - **`cheongi_user_profiles`의 배포된 grant·RLS는 미확인이다.** 정본 SQL 파일이 없고(§4.1),
    401 응답만으로는 어떤 정책·grant 조합 때문인지 구분할 수 없다.
    관리자 프로필 adapter 설계(T10)는 U4의 실제 확인 없이 진행하면 안 된다.
- 코드 변경: 없음

## 1. 결론 요약

| 항목 | 결과 |
| --- | --- |
| `owner_id` 타입 (수용 조건) | **`uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT`** — 08-DATA의 "TEXT" 기재는 **틀렸다** |
| `user_id` 타입 (reports) | **`uuid REFERENCES auth.users(id) ON DELETE CASCADE`** |
| 구형 payload fixture (수용 조건) | **확보** — `tests/unit/report-persistence.test.ts:102` |
| 정본 SQL vs 코드 `ensureDb()` | **양쪽이 다른 스키마를 만든다** (타입·FK·CHECK·RLS·grant·인덱스·열 개수) |
| 스토어 접근 모델 | **3개가 서로 다르다.** orders·reports는 service_role, profiles는 사용자 토큰 + RLS |
| 낙관적 동시성 | reports는 **있음**(payload 내 `revision` CAS). orders는 상태 가드만 있고 직렬화·멱등키는 **없음** — 09-API `expectedRevision`, A09/A10 미충족 |
| **PG 성공 후 저장 실패** | 상태가 `failed`로 덮어써지거나 `approving`에 머문다. **`status` enum에 불확정 상태가 없어** A12/A13 충족 불가 (§2.5) |
| **관리자 분석 열** | `cheongi_reports`의 8개 열을 **애플리케이션이 기록하지 않는다** (그 위 인덱스 4개의 유용성 불확실). 운영 실제 값은 미확인 (§3.2) |
| U9 (`developmentReportAccess`) | **부분 해소** — 술어는 소스로 확정. Supabase URL·공개키가 설정된 환경에서 `false`이므로 현재 4개 환경은 안전. 설정 누락 런타임에서는 열린다 (§6) |

## 2. `cheongi_payment_orders`

### 2.1 정본 스키마 (`supabase-payment-orders.sql`)

| 열 | 타입 | 제약 |
| --- | --- | --- |
| `order_id` | text | **primary key** |
| `owner_id` | **uuid** | **not null, references auth.users(id) on delete restrict** |
| `owner_email` | text | |
| `buyer_email` | text | not null |
| `buyer_tel` | text | not null |
| `product_key` | text | not null |
| `product_title` | text | not null |
| `amount` | integer | not null, **check (amount > 0)** |
| `status` | text | not null, **check in ('ready','approving','paid','viewed','cancelled','failed')** |
| `tid` | text | |
| `pay_method` | text | |
| `approval_code` | text | |
| `message` | text | |
| `report_id` | text | (기존 설치에 `add column if not exists`로 추가) |
| `created_at` | timestamptz | not null default now() |
| `updated_at` | timestamptz | not null default now() |

권한·정책:
- `enable row level security`
- 소유자 정책 3개(select/insert/update)를 **명시적으로 drop** — 즉 정책이 없다
- `revoke all from public, anon, authenticated` + **열 단위 revoke까지 수행** (구형 설치의 독립 열 grant 제거)
- `grant select, insert, update, delete to service_role`

인덱스: `cheongi_payment_orders_owner_updated_idx (owner_id, updated_at desc)` 1개.

트랜잭션 안전장치: `set local lock_timeout='3s'`, `statement_timeout='15s'`, `begin/commit`.

### 2.2 코드 fallback (`order-store.ts` `ensureDb()`)

`DATABASE_URL`이 설정된 postgres 경로에서 `CREATE TABLE IF NOT EXISTS`로 만드는 스키마는 **다르다**.

| 차이 | 정본 SQL | 코드 `ensureDb()` |
| --- | --- | --- |
| `owner_id` 타입 | **uuid** | **TEXT** |
| `owner_id` FK | `references auth.users(id) on delete restrict` | **없음** |
| `status` CHECK | 6개 값 enum 강제 | **없음** (임의 문자열 허용) |
| RLS | `enable row level security` | **없음** |
| grant/revoke | anon·authenticated 전면 회수, service_role만 허용 | **없음** |
| 인덱스 | `(owner_id, updated_at desc)` | **없음** |
| `amount` CHECK | `> 0` | `> 0` (동일) |

`IF NOT EXISTS`이므로 이미 정본 스키마가 적용된 DB에서는 no-op이고 파괴는 없다.
그러나 **새 DB(로컬·스테이징)에서는 정본보다 약한 스키마가 생성된다.**
→ 관리자 개발 환경을 이 경로로 만들면 운영과 다른 제약 아래에서 검증하게 된다(U2와 연결).

### 2.3 08-DATA 대조

| 08-DATA 기재 | 실제 | 판정 |
| --- | --- | --- |
| `order_id(TEXT)` | text primary key | PASS |
| **`owner_id(TEXT)`** | **uuid + FK** | **WRONG** |
| `product_key` | text not null | PASS |
| `amount(INTEGER>0)` | integer check > 0 | PASS |
| `status` | text + 6값 CHECK | PASS (값 목록도 E04와 일치) |
| `report_id` | text | PASS |
| `tid` 등 | text | PASS |

08-DATA의 "인증 identity와 기존 owner_id 문자열의 매핑을 검증한다.
owner_id를 일괄 UUID cast하거나 이메일로 조인하지 않는다"는 **경고는 유효하지만 이유가 다르다**:
정본은 이미 uuid이므로 cast가 필요 없다. 위험은 **코드 fallback 경로가 TEXT라서 두 스키마가 갈린다**는 점이다.
관리자 조회에서 `owner_id`를 `auth.users.id`와 조인하는 것은 정본 스키마에서 **안전하다**(FK가 보장).

### 2.4 동시성 — 상태 가드는 있고, 직렬화 수단은 없다

먼저 **있는 것**을 정확히 적는다. `POST /api/payment/inicis/return`(app.ts:1550)에는
**상태 전이 가드**가 있다:

```ts
if (order.status === 'paid' || order.status === 'viewed') {
  res.redirect(303, paymentOrderRedirect(order.orderId, 'paid', …))
  return   // 재승인하지 않는다
}
```

PG 리턴이 **순차적으로** 두 번 들어와도 두 번째는 재승인 없이 기존 결과를 돌려준다.
즉 "중복 승인"의 기본 방어는 존재한다.

**없는 것**:

| 수단 | 상태 |
| --- | --- |
| `revision` 열 또는 조건부 갱신 | **없음.** `updatePaymentOrder`는 read-then-write, last-write-wins |
| `Idempotency-Key` 처리 | **없음.** 저장소·라우트 어디에도 키 기반 멱등 기록이 없다 |
| row lock / `SELECT … FOR UPDATE` | **없음** |
| 08-DATA의 `payment_operations` 테이블 | **없음** (신규 논리 설계) |

따라서 **순차 중복은 막히지만 동시 중복은 막히지 않는다.**
두 요청이 상태 가드를 통과한 뒤 각자 쓰면 둘 다 승인 경로로 진행된다.

영향 (중대):
- 09-API의 쓰기 계약 `expectedRevision`을 현재 주문 스키마로 충족할 수 없다.
- **A08**(같은 key 중복 클릭 → 단일 operation), **A09**(같은 key 다른 금액 → 409),
  **A10**(두 직원 동시 환불 → 승인액 초과 차단)은 상태 가드로 대체할 수 없다.
  A09·A10은 금액 비교와 예약액 누적을 요구하므로 직렬화가 필수다.
- 08-DATA의 "주문 row lock 또는 동등한 직렬화"는 미구현이다.
→ **T06(감사·멱등 기반)과 T15/T17(금융 이벤트·환불)의 선행 조건** (U17).

### 2.5 [중대] PG 승인 성공 후 저장 실패를 불확정 상태로 남길 수 없다 — A12/A13 미충족

`POST /api/payment/inicis/return`의 `catch` 블록(app.ts:1583):

```ts
} catch (err) {
  const message = err instanceof Error ? err.message : '결제 승인에 실패했습니다.'
  await updatePaymentOrder(orderId, { status: 'failed', message }).catch(() => undefined)
  …
}
```

이 `catch`는 **현재 상태를 확인하지 않고 무조건 `failed`로 쓴다.**
문제가 되는 경로는 다음이다:

1. `approveInicisPayment()`가 **성공** → 고객은 실제로 결제됨
2. 직후 `updatePaymentOrder(…status:'paid'…)`가 실패해 `승인된 주문을 저장하지 못했습니다` throw
3. `catch`가 주문 상태를 **`failed`로 덮어쓰려 시도**한다

결과: 저장소가 그 시점에 다시 응답하면 **PG에는 승인이 남고 내부에는 실패로 기록된다.**
저장소가 계속 불가하면 그 `failed` 쓰기마저 실패해(`.catch(() => undefined)`로 삼켜짐)
주문은 `approving`에 머문다. 어느 쪽이든 **PG 승인과 내부 상태가 어긋나고, 그 사실이
상태값으로 표현되지 않는다.** 대사 없이는 발견되지 않고, 고객은 결제됐지만
리포트 접근 권한을 받지 못한다.
(Codex 리뷰 Major 5 반영 — 초판은 결과를 `failed` 하나로 단정했다. 통제된 실패 경로
테스트는 수행하지 않았으므로 최종 상태는 저장소 회복 시점에 따라 갈린다.)

08-DATA는 이를 명시적으로 금지한다:
> "PG 성공·내부 저장 실패는 unknown/reconcile 상태로 보존하고 성공을 다시 호출하지 않는다."

그런데 **`status` CHECK enum에 `unknown`이 없다.**
정본 SQL의 허용값은 `ready, approving, paid, viewed, cancelled, failed` **6개뿐**이다.
즉 08-DATA가 요구하는 불확정 상태를 **현재 스키마로는 표현할 수 없다.**

16-ACCEPTANCE **A13**("PG 성공 후 DB 저장 실패 → intent 유지·대사 복구")과
**A12**("PG 성공 후 응답 유실 → unknown→대사 성공, 이중 취소 없음")를
현재 구조로 충족할 수 없다. 근거는 **불확정 상태를 담을 표현이 스키마에 없다**는 점이며,
이것은 스키마 사실이므로 실패 경로 테스트 없이도 성립한다.

→ **U22 신설.** T15(금융 이벤트·상태 투영) 착수 전에 다음이 필요하다:
- `status` enum에 불확정 상태 추가(또는 별도 `payment_operations.state`로 분리)
- `catch`가 승인 성공 여부를 구분해 `failed` 대신 불확정으로 기록
- 08-DATA의 `financial_events` append-only 원장으로 PG 결과를 먼저 기록

**현재 심각도 — 잠재적이다.** 운영 `/api/payment/config`가 `checkoutEnabled: false`이고
`INICIS_SIGNKEY`가 어떤 환경에도 없으므로(T01 §4, T02 운영 실측) **지금 실제 결제가 발생하지 않는다.**
따라서 이 결함으로 피해를 본 주문은 현재 없을 것으로 보인다(운영 DB 조회 없이는 단정 불가 → U4).

그러나 **TASK-007(Inicis SignKey 설정)로 결제를 켜는 순간 이 경로가 활성화된다.**
→ 결제 활성화 **전에** U22를 해소해야 한다. 순서 의존성을 명시한다:
`U22 해소 → TASK-007(결제 활성화)`.

이 항목은 조사 범위 밖의 코드 수정이 필요하므로 **T03에서 고치지 않는다.**
`19-DECISIONS`의 "구현 전 확인 항목"에 해당하는 운영 리스크로 기록한다.

### 2.6 `amount` 스냅샷 — 경로별 보증이 다르다

| 경로 | 동작 | amount 보존 |
| --- | --- | --- |
| postgres | `ON CONFLICT (order_id) DO UPDATE SET status, tid, pay_method, approval_code, message, report_id, updated_at` — **amount 미포함** | **스키마가 보장** |
| supabase REST | `POST` + `prefer: resolution=merge-duplicates`로 **전체 row upsert** (amount 포함) | 호출자가 `current.amount`를 넘겨야만 보존 |
| memory | 객체 교체 | 호출자 의존 |

현재 `updatePaymentOrder`가 항상 current를 읽어 병합하므로 실질 동작은 같다.
그러나 **REST 경로는 스키마가 아니라 호출 규약으로만 보호된다.**
→ T02 §7의 "가격 변경은 신규 주문만 적용 — 이미 충족" 판정을 이렇게 **정정**한다:
  postgres 경로는 충족, REST 경로(= 운영 경로)는 **관례 의존**.
  06-SCREENS S02의 요구를 확실히 하려면 REST upsert 본문에서 `amount`를 제외하거나
  `amount`를 갱신하지 않는 별도 PATCH 경로를 쓰는 것이 옳다.

## 3. `cheongi_reports`

### 3.1 정본 스키마 (`supabase-reports.sql`)

| 열 | 타입 | 비고 |
| --- | --- | --- |
| `report_id` | text | **primary key.** 사용자+서비스+정규화 입력의 sha256 지문 (안정 캐시 키) |
| `payload` | jsonb | **not null.** 전체 스냅샷 — 내부 프롬프트·생성 시도 포함 |
| `user_id` | **uuid** | **references auth.users(id) on delete cascade** |
| `user_email` | text | |
| `auth_provider` | text | |
| `admin_status` | text | not null default `'new'` |
| `public_id` | text | 공개 URL 판별자 (unique partial index) |
| `service_key` | text | |
| `status` | text | |
| `progress_complete` | integer | |
| `progress_total` | integer | |
| `order_id` | text | |
| `input_fingerprint` | text | |
| `created_at` / `updated_at` | timestamptz | not null default now() |

권한·정책:
- `enable row level security`
- 소유자 정책 **4개 생성**(select/insert/update/delete, `auth.uid() = user_id`)
- 그런 다음 `revoke all from public, anon, authenticated` + 열 단위 revoke
- `grant ... to service_role`

> **정책은 있으나 grant가 없다.** 파일 주석이 의도를 밝힌다:
> "Full snapshots contain internal prompts and generation attempts. Only the server may
> access this table … Deploy the service-role report-store path before revoking legacy user access."
> 즉 정책은 레거시 호환용으로 남기고 실효 접근은 service_role로 좁힌 상태다.
> task-002의 anon 키 REST 조회가 **HTTP 401 코드 42501**을 준 것이 이 상태와 일치한다.

인덱스 7개:
`(user_id)`, `unique (public_id) where public_id is not null`,
`(service_key, created_at desc)`, `(status, updated_at desc)`,
`(user_id, service_key, updated_at desc)`,
`unique ((payload->>'resultId')) where payload->>'resultId' is not null`,
`(user_id, updated_at desc)`.

### 3.2 [중대] 관리자 분석 열 8개를 애플리케이션이 기록하지 않는다

애플리케이션이 실제로 기록하는 열은 **7개뿐**이다
(`report-store.ts:519-545`, `:389`, `:427` 기준):

```
report_id, payload, user_id, user_email, auth_provider, created_at, updated_at
```

정본 SQL이 "admin analytics columns"로 선언한 아래 **8개를, 검토한 현재 쓰기 경로 중 어느 것도 쓰지 않는다**:

`admin_status`(default 'new'만), `public_id`, `service_key`, `status`,
`progress_complete`, `progress_total`, `order_id`, `input_fingerprint`

확인 방법: `INSERT INTO cheongi_reports (...)` 목록, REST `select=`·본문 목록,
저장소 코드 전체에서 위 열 이름 검색 — 기록하는 지점이 없다.
`scripts/verify-report-db.sql`도 `insert into public.cheongi_reports(report_id,payload)`만 쓴다.
저장소에 backfill 스크립트도 없다.

> **증거 경계 (Codex 리뷰 Major 2 반영).** 이것은 **현재 저장소 코드에 대한 사실**이다.
> 운영 DB의 과거 행이 수동 쓰기·이전 배포·별도 마이그레이션으로 채워졌는지는
> **확인하지 않았다**(운영 쿼리 불가). 따라서 "운영에서 비어 있다"로 단정하지 않는다.
> 안전한 결론은 하나다: **T10은 운영 측정과 backfill 결정 없이 이 열들에 의존할 수 없다.**
> 필요한 측정: 열별 null/non-null 건수 집계 (고객 payload는 읽지 않는 읽기 전용 쿼리).

**따라서 유용성이 불확실해진 인덱스 4개**:
`(service_key, created_at desc)`, `(status, updated_at desc)`,
`(user_id, service_key, updated_at desc)`, `unique (public_id) where public_id is not null`.

관리자 설계에 미치는 영향 (T10/T11의 실제 작업량):
- 06-SCREENS **S07 리포트 목록**은 `reportId, 서비스, 마스킹 소유자, 결제 접근 상태,
  완료/전체 항목, 상태, 생성 시작·완료, 최종 오류, 버전`을 요구한다.
  이 중 **서비스·상태·진행률·주문 연결은 현재 열에서 읽을 수 없다.**
- 유일한 대안은 `payload` jsonb 파싱이지만 07-ARCHITECTURE가 금지한다:
  "운영 집계는 인덱스 기반 read model로 분리하고 원본 JSON 전수 파싱을 요청마다 수행하지 않는다."
- 따라서 T10은 다음 중 하나를 **선택하고 마이그레이션을 동반해야** 한다:
  1. 기존 8개 열을 애플리케이션 쓰기 경로에 연결 + 과거 행 backfill
  2. 별도 read model 테이블 신설 (08-DATA의 `analytics_daily` 계열과 별개)
  3. jsonb 표현식 인덱스로 필요한 필드만 노출
- `public_id` 열은 애플리케이션이 쓰지 않으며(운영 실제 값은 미확인), 실제 공개 URL 판별자는 **`payload->>'resultId'`** 다
  (`report-store.ts:196-198`: `resultId → publicId → /r/{resultId}`).
  관리자 조회는 `public_id` 열이 아니라 `payload->>'resultId'` 인덱스를 써야 한다.

### 3.3 코드 fallback (`ensureDb()` + `ensureReportOwnerColumns()`)

```
CREATE TABLE IF NOT EXISTS cheongi_reports (report_id TEXT PRIMARY KEY, payload JSONB NOT NULL,
                                            created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
ALTER TABLE ... ADD COLUMN IF NOT EXISTS user_id TEXT, user_email TEXT, auth_provider TEXT,
                                         admin_status TEXT NOT NULL DEFAULT 'new'
CREATE INDEX IF NOT EXISTS cheongi_reports_user_id_idx (user_id)
```

| 차이 | 정본 SQL | 코드 |
| --- | --- | --- |
| `user_id` 타입 | **uuid + FK cascade** | **TEXT, FK 없음** |
| 분석 열 8개 중 | 8개 선언 | **`admin_status`만** (7개 없음) |
| RLS·정책 | RLS + 정책 4개 | **없음** |
| grant/revoke | 전면 회수 + service_role | **없음** |
| 인덱스 | 7개 | **1개** (`user_id`) |

### 3.4 낙관적 동시성 — 4개 모드 전부 구현됨

`revision`은 **열이 아니라 `payload` jsonb 안의 필드**다. 정본 SQL에 `revision` 열이 없다.

| 모드 | CAS 방식 |
| --- | --- |
| file | `localFiles.compareAndSwap(stored, current.revision ?? 0)` |
| memory | `memoryReports.get(id)?.revision !== current.revision` → 재시도 |
| supabase REST | 쿼리 파라미터 `payload->>revision` = `eq.<n>` (또는 `is.null`) |
| postgres | `UPDATE ... WHERE report_id=$1 AND COALESCE((payload->>'revision')::int,0)=$3` |

불변 필드 강제 (`report-store.ts:626`): `reportId`, `resultId`, `owner.id`,
`report.publicId`, `birth`, `context` 중 하나라도 바뀌면
`저장된 결과의 ID·소유자·입력은 변경할 수 없습니다.` 예외.
→ **ADR-05(완료 리포트 불변)가 코드로 강제되고 있다.** A34의 근거 코드다.

`scripts/verify-report-db.sql`이 같은 계약을 DB 수준에서 검증한다:
first-write immutability(`on conflict do nothing`), CAS 1행 갱신,
stale CAS 0행, `payload->>'resultId'` 재조회, 정확한 정리 — 전부 rollback.

### 3.5 저장 모드 4종 — 08-DATA에 없는 `file` 모드

```
storageMode(): file | postgres | supabase | memory
```

`file` 조건: `!isProductionStorage && (REPORT_STORAGE_DIR || (!isTest && !pool && !supabaseRestUrl))`
→ `FileReportStorage(REPORT_STORAGE_DIR || '.cache/report-snapshots')`

`isProductionStorage = Boolean(process.env.VERCEL) || NODE_ENV === 'production'`
→ **Vercel 배포에서는 file 모드가 절대 선택되지 않는다.** 로컬 전용이다.

안전장치 `assertDurableReportStorage()`:
- `supabase` 모드면 `assertSupabaseServerKey()` (service_role 키 필수)
- `memory` 모드인데 Vercel/production이면 **예외**:
  `영구 리포트 저장소가 설정되지 않아 생성을 시작할 수 없습니다.`
→ A17("운영에서 memory fallback이면 쓰기 차단")이 **리포트 생성에는 이미 구현되어 있다.**
  주문 저장소에는 같은 장치가 없다(§2.4).

### 3.6 접근 판정 — `assertReportOwner`의 레거시 규칙

```ts
if (record.owner?.id && record.owner.id !== owner?.id) throw 'REPORT_ACCESS_DENIED'
if (!record.owner?.id && owner?.id)                     throw 'REPORT_ACCESS_DENIED'
```

두 번째 줄이 중요하다: **소유자가 없는 구형 레코드는 인증된 사용자가 볼 수 없다.**
(비인증 요청만 접근 가능하고, 그 경로는 `developmentReportAccess`가 false여서 401로 막힌다.)

관리자 영향:
- T10의 관리자 리포트 조회는 이 함수를 **우회해야** 한다. 그러면 13-SECURITY의
  "관리자 서버 접근은 기존 고객 소유권 검사를 대체하지 않는다"와 충돌하지 않게
  **직원 scope 검사를 별도로** 세워야 한다.
- 소유자 없는 구형 레코드가 존재한다면 관리자만 볼 수 있는 상태가 된다.
  실제 존재 여부는 운영 DB 쿼리가 필요하다(U4).

### 3.7 구형 payload 폴백 3종 (수용 조건)

| 구형 상황 | 폴백 | 위치 |
| --- | --- | --- |
| `section.generationId` 없음 | `legacy_<sha256(reportId:sectionId)[0:28]>` 생성 | `report-store.ts:186` |
| `resultId` 없음 | `record.resultId ?? report.publicId ?? record.reportId` | `report-store.ts:196` |
| `revision` 없음 | `undefined`로 취급, REST CAS는 `is.null`로 조회 | `report-store.ts:648` |

**fixture 확보**: `tests/unit/report-persistence.test.ts:102`
"reopens completed legacy records without metadata migration or regeneration on retry" —
`resultId: undefined`, `sections[0].status: undefined`, `sections[0].generationId: undefined`인
레코드를 저장·재열람한다. **A32/A34의 회귀 기준으로 그대로 재사용 가능하다.**

## 4. `cheongi_user_profiles`

### 4.1 정본 SQL이 없다

저장소 루트에 `supabase-user-profiles.sql`이 **존재하지 않는다.**
`supabase-payment-orders.sql`, `supabase-reports.sql` 두 개뿐이다.
따라서 이 테이블의 **Supabase 측 실제 스키마·RLS·grant는 저장소에 기록되어 있지 않다** → U4.

코드 `ensureDb()`(postgres 경로)가 만드는 스키마:

| 열 | 타입 |
| --- | --- |
| `user_id` | **UUID PRIMARY KEY** |
| `name` | TEXT NOT NULL |
| `birth_year` / `birth_month` / `birth_day` / `birth_hour` | INTEGER NOT NULL |
| `birth_minute` | INTEGER NOT NULL DEFAULT 0 |
| `gender` | TEXT NOT NULL |
| `calendar` | TEXT NOT NULL DEFAULT 'solar' |
| `is_leap_month` | BOOLEAN NOT NULL DEFAULT FALSE |
| `birth_time_known` | BOOLEAN NOT NULL DEFAULT TRUE |
| `profile_payload` | JSONB NOT NULL DEFAULT '{}' |
| `created_at` / `updated_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() |

RLS·grant·인덱스: **없음** (FK도 없음 — `auth.users` 참조 없음).

08-DATA 기재(`user_id(UUID)`, 생년월일·시간·성별·달력·`profile_payload`)와 **일치**한다.

### 4.2 [중대] 접근 모델이 나머지 둘과 완전히 다르다

| 스토어 | REST 키 | Authorization | RLS |
| --- | --- | --- | --- |
| `order-store` | `SUPABASE_SERVICE_ROLE_KEY` | 레거시 JWT 키일 때만 `Bearer <service key>` | **우회** |
| `report-store` | `SUPABASE_SERVICE_ROLE_KEY` | 동일 | **우회** |
| `profile-store` | `SUPABASE_PUBLISHABLE_KEY` ?? `SUPABASE_ANON_KEY` | **`Bearer <고객 accessToken>`** | **통과** |

`profile-store`는 `owner.accessToken`이 없으면:
- 조회: `return null` (조용히 없음 처리)
- 저장: `회원 인증 정보가 없어 사주 프로필을 저장하지 못했습니다.` 예외

→ 02-EVIDENCE의 충돌 노트("프로필은 사용자 토큰 기반 REST 경로가 있고 주문·보고서와
저장소 접근 방식이 다르다. 동일 접근 정책으로 일괄 변경하지 않는다")가 **코드로 확인됐다.**

관리자 영향 (T10 회원 상세):
- 관리자는 **고객의 accessToken을 가질 수 없다.** 따라서 `profile-store`의 현재 함수로는
  관리자가 프로필을 조회할 수 없다.
- 09-API `POST /members/:id/reveal`(민감 원문 열람)을 구현하려면
  **service_role 경유의 별도 관리자 adapter**가 필요하다.
- 그때 `cheongi_user_profiles`의 Supabase RLS·grant를 먼저 확인해야 한다(U4).
  13-SECURITY 경고: "사용자 profile 저장 경로를 일괄 서버권한으로 전환하지 않는다."
  → 고객 경로는 그대로 두고 관리자 경로만 추가하는 방식이어야 한다.

### 4.3 `service_role` 키 형식 처리 (Supabase 신 키 모델)

`order-store.ts:129-137` / `report-store.ts:208-228`:

```ts
if (!key.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) {
  headers.authorization = `Bearer ${key}`   // 레거시 JWT 키만
}
// sb_secret_* 은 opaque API 키이므로 apikey 헤더만 사용
```

주석: "Hosted secret keys are opaque API keys, not JWTs. Only legacy JWT service keys
belong in Authorization; never substitute a customer's session token."
→ 신·구 키 모델을 모두 지원한다. `keyKind: 'secret' | 'legacy-jwt' | 'missing' | 'unknown' | 'none'`
진단 값도 있다. T02 리서치 F10(키 모델 전환)의 코드 측 준비는 이미 되어 있다.

## 5. 저장 모드·영속성 종합표

| 스토어 | 모드 | 선택 조건 | 영속성 | 운영 memory 차단 |
| --- | --- | --- | --- | --- |
| order-store | postgres | `DATABASE_URL` | 영속 | — |
| | supabase | `SUPABASE_URL` + `SERVICE_ROLE_KEY` | 영속 (**운영 실측**) | — |
| | memory | 그 외 | **휘발** | **없음** ⚠ |
| report-store | file | 비운영 + `REPORT_STORAGE_DIR` 또는 다른 저장소 없음 | 로컬 파일 | — |
| | postgres | `DATABASE_URL` | 영속 | — |
| | supabase | `SUPABASE_URL` (키는 assert로 강제) | 영속 | — |
| | memory | 그 외 | 휘발 | **있음** (`assertDurableReportStorage`) |
| profile-store | postgres | `DATABASE_URL` | 영속 | — |
| | supabase | `SUPABASE_URL` + **publishable 키** | 영속 | — |
| | memory | 그 외 | 휘발 | **없음** ⚠ |

⚠ **주문·프로필 저장소에는 A17에 해당하는 운영 memory 차단 장치가 없다.**
리포트 생성만 막힌다. 관리자 쓰기 기능(T14)은 세 저장소 모두에 대해
readiness 실패를 반환하도록 별도 구현해야 한다.

## 6. T02 인계 항목 처리

| 인계 항목 | 결과 |
| --- | --- |
| **U9** `developmentReportAccess` 환경별 값 | **부분 해소.** 소스 사실: `!SUPABASE_URL && !SUPABASE_PUBLIC_KEY && !VERCEL && NODE_ENV!=='production'` (app.ts:927) — 즉 Supabase URL과 공개키가 **둘 다 비어 있고** Vercel도 production도 아닌 런타임에서만 true다. T01 §4에서 두 변수가 로컬·Dev·Preview·Production에 **이름 기준으로 설정됨**을 확인했으므로 그 환경들에서는 false로 판정된다. 다만 이는 **설정 의존 결과**이며 각 런타임의 실효값을 직접 확인한 것은 아니다(Codex 리뷰 Major 3 반영). 위험 형태: Supabase 설정이 비어 있는 임의 런타임(예: 설정 누락된 컨테이너)에서는 미로그인 리포트 접근이 열린다. A33/A39는 그 조건에서만 문제가 된다 |
| **U12** `serviceHrefForKey('saju_master')`=undefined의 실제 영향 | **부분 판정.** 저장 시 `context.serviceKey`가 무엇인지가 관건이다. `app.ts:1184`가 클라이언트 payload에 `record.context?.serviceKey \|\| 'cmdg'`로 폴백하므로, `context.serviceKey`가 비어 있으면 `cmdg`가 되어 `/cmdg/` 링크가 정상 동작한다. `saju_master`가 **저장된** 레코드가 있으면 링크가 유실된다. 실제 분포 확인은 운영 DB 쿼리가 필요하다 → **U4로 이관** |
| 주문 `amount` 스냅샷 | **경로별로 다르다** (§2.6). postgres는 스키마 보장, REST(운영)는 호출 규약 의존. T02 §7의 "이미 충족"을 정정 |

## 7. 마이그레이션 차이 종합 (T03 산출물)

| 대상 | 정본 SQL | 코드 `ensureDb()` | 위험 |
| --- | --- | --- | --- |
| orders `owner_id` | uuid + FK restrict | TEXT, FK 없음 | 새 DB에서 타입 불일치. 관리자 조인 전략이 환경에 따라 달라짐 |
| orders `status` | 6값 CHECK | CHECK 없음 | 잘못된 상태값 저장 가능 |
| orders RLS/grant/index | 전부 있음 | 전부 없음 | 개발 환경이 운영 제약을 재현하지 못함 |
| reports `user_id` | uuid + FK cascade | TEXT | 동일 |
| reports 분석 열 8개 | 8개 선언 | **`admin_status` 1개만** | 개발 환경에서 관리자 열 7개를 테스트할 수 없음 |
| reports RLS/정책/index | RLS + 정책 4개 + **인덱스 7개** | RLS·정책 없음, **인덱스 1개** | 동일 |
| profiles 전체 | **정본 SQL 부재** | 코드가 유일한 정의 | Supabase 실제 스키마·RLS 미확인 (U4) |

08-DATA의 마이그레이션 절차("기존 스키마 스냅샷 → additive → backfill dry-run →
dual read 판단 → 제한 rollout → 구버전 호환 검증")를 적용할 때,
**첫 단계인 "기존 스키마 스냅샷"이 이 표의 우측 열 때문에 환경마다 다르다**는 점을 전제해야 한다.
TASK-004(Supabase migrations baseline)의 실제 필요성이 여기서 확인된다.

## 8. 검증 증거 — 성공·거절·실패 사례 (pack 요구)

| 구분 | 사례 | 결과 |
| --- | --- | --- |
| **성공** | `report-store` CAS 4개 모드 구현 확인 | file/memory/REST/postgres 전부 revision 조건부 갱신 |
| **성공** | 구형 레코드 재열람 회귀 테스트 존재 | `tests/unit/report-persistence.test.ts:102` |
| **스크립트 커버리지 검토** (미실행) | `verify-report-db.sql` | first-write·CAS·stale 거절·UUID 재조회를 전부 rollback으로 검증하도록 작성됨. **이 Task에서 실행하지 않았다** |
| **스크립트 커버리지 검토** (미실행) | `verify-payment-db.sql` | RLS·service_role CRUD·anon/authenticated 무권한·public grant 없음을 메타데이터로 검사하도록 작성됨. **미실행** |
| **선행 Task 실측** | anon 키로 3개 테이블 REST 조회 | HTTP 401 코드 `42501` — **task-002에서 실행**한 결과 (`CreamAI/reports/task-002_analysis.md` §3.3) |
| **거절 (코드 경로)** | `assertReportOwner` 소유자 불일치 | `REPORT_ACCESS_DENIED` (report-store.ts:86) |
| **거절 (코드 경로)** | 소유자 없는 구형 레코드 + 인증 사용자 | `REPORT_ACCESS_DENIED` (레거시 규칙, report-store.ts:87) |
| **거절 (코드 경로)** | 불변 필드 변경 시도 | `저장된 결과의 ID·소유자·입력은 변경할 수 없습니다.` (report-store.ts:626) |
| **거절 (코드 경로)** | `profile-store` supabase 모드 + accessToken 없음 | 조회 `null` / 저장 예외 |

> 위 "거절" 항목은 **코드 경로 분석**이며 HTTP 요청이나 DB 쿼리로 실행하지 않았다.
> 실행 검증은 T04(회귀 기준) 또는 T09/T11의 회귀 케이스로 넘긴다.
> `report-persistence.test.ts`의 구형 레코드 케이스는 `npm test` 373건에 포함되어 **실제로 통과한다**
> (T01 §8에서 실행). 그것만이 이 Task 범위에서 실행된 검증이다.
| **성공** | PG 리턴 순차 중복 | 상태 가드가 `paid`/`viewed`를 재승인 없이 통과시킨다 (app.ts:1550) |
| **실패(설계 공백)** | 주문 **동시** 갱신 | 조건부 갱신·멱등키 없음 → 두 요청이 상태 가드를 함께 통과하면 둘 다 진행 |
| **실패(운영 리스크)** | PG 승인 성공 + 내부 저장 실패 | `catch`가 무조건 `failed` 기록. 불확정 상태가 enum에 없어 대사 복구 불가 (§2.5) |
| **실패(설계 공백)** | 관리자가 리포트 목록을 서비스·상태로 필터 | 해당 열이 비어 있어 불가 |
| **실패(설계 공백)** | 관리자가 고객 프로필 조회 | 고객 accessToken이 필요한 경로뿐 |

## 9. 미확인·신규 항목

| ID | 내용 | 영향 | 해제 조건 |
| --- | --- | --- | --- |
| U4 (유지) | 운영 DB의 실제 스키마·grant·RLS 적용 상태. 특히 `cheongi_user_profiles` | T05, T06, T10 | service_role 접근 또는 `verify-*.sql` 실행 결과 확보 |
| U12 (이관) | `context.serviceKey`의 저장된 실제 분포, 소유자 없는 구형 레코드 존재 여부 | T10, T11 | 운영 DB 조회 (U4에 종속) |
| **U17** | 주문 저장소에 낙관적 동시성 수단이 없다 | **T06, T15, T17 (A08/A09/A10)** | `revision` 열 추가 또는 `payment_operations` unique 제약 설계 |
| **U18** | `cheongi_reports` 관리자 분석 열 8개 미기입 + 인덱스 4개 무용 | **T10, T11 (S07)** | 쓰기 경로 연결 + backfill, 또는 별도 read model 결정 |
| **U19** | `cheongi_user_profiles` 정본 SQL 부재 | T10, TASK-004 | 스키마 파일 작성 또는 운영에서 추출 |
| **U20** | 주문·프로필 저장소에 운영 memory 차단 장치 없음 | T14 (A17) | readiness 게이트 구현 |
| **U21** | REST upsert가 `amount`를 전체 row로 덮어씀 (관례 의존) | T15, T17 | upsert 본문에서 금액 제외 또는 전용 PATCH 경로 |
| **U22** | **PG 성공 후 내부 저장 실패가 `failed`로 기록됨. `status` enum에 불확정 상태 없음** | **T15, T17, T19 (A12/A13)** | enum에 불확정 상태 추가 또는 `payment_operations`/`financial_events` 분리 + catch 분기 수정 |

## 10. T03 수용 조건 대조

| 수용 조건 | 결과 |
| --- | --- |
| 타입·접근·영속성·마이그레이션 차이표 산출 | 충족 — §2~§5, §7 |
| **`owner_id` 타입 확보** | 충족 — `uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT`. 08-DATA 기재 오류 검출 |
| **구형 payload fixture 확보** | 충족 — `tests/unit/report-persistence.test.ts:102` + 폴백 3종 위치 |
| 운영 DB 무변경 | 충족 — 쿼리 자체를 실행하지 않았다 |

## 11. 다음 ready task

**T04 (기존 회귀 기준 수집)** — 선행 T01 충족. 경계: `package.json`, `tests/unit`.
T01 §8에서 이미 typecheck·unit·통합 baseline을 수집했으므로 T04는 그 결과를
`16-ACCEPTANCE`의 재사용 테스트 목록과 대조해 확정하는 작업이 된다.

T05(직원 RBAC)는 **U2(개발용 영속 저장소)** 로 여전히 blocked이다.
T03이 추가한 항목의 선행 관계:

| 항목 | 착수 전 결정이 필요한 Task |
| --- | --- |
| **U17** 주문 직렬화·멱등키 부재 | **T06**(감사·멱등 기반), T15, T17 |
| **U20** 주문·프로필 memory 차단 장치 부재 | **T14**(영속 작업·outbox), A17 |
| **U22** 불확정 상태 표현 부재 | **T15**, T17, T19 — 그리고 **TASK-007(결제 활성화)보다 앞서야 한다** |
| **U21** REST upsert가 amount 덮어씀 | T15, T17 |
| **U18** 분석 열 미기입 | **T10**, T11 (S07 목록·필터) |
| **U19** profiles 정본 SQL 부재 | T10, TASK-004 |
| **U4** 운영 스키마·grant·RLS 미확인 | T05, T06, T10 — profiles adapter는 특히 선행 필수 |

T04는 위 어느 항목에도 막히지 않는다. 로컬 회귀 기준 수집이므로 즉시 진행 가능하다.
