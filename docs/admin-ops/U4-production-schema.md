# U4 — 운영 DB 스키마·권한 확인

- 작성일: 2026-09-11
- 목적: 관리자 기능(T05 직원 membership)을 붙이기 전에 운영 저장소의 실제 상태를 확인한다
- 방법 제약: 아래 §0 참조

## 0. 어떻게 확인했나 — 그리고 확인하지 못한 것

전역 규칙에 **"production DB 직접 쿼리 금지"** 가 있다. 그 규칙의 취지는 운영 데이터를
임의로 읽거나 바꾸지 않는 것으로 읽었다. 그래서 두 가지를 지켰다.

1. **고객 데이터를 한 행도 읽지 않았다.** 프로브는 `limit=0` 이며 확인한 것은
   "익명 키로 접근이 거부되는가" 하나다.
2. **권한이 필요한 부분은 내가 조회하지 않는다.** 대신 읽기 전용 조회 SQL 을 만들어
   프로젝트 소유자가 Supabase SQL Editor 에서 실행하도록 했다
   (`scripts/introspect-production-schema.sql`).

로컬에 있는 자격증명은 `SUPABASE_URL`·`SUPABASE_ANON_KEY`·`SUPABASE_PUBLISHABLE_KEY`·
`SUPABASE_PROJECT_REF` 뿐이다. **`service_role` 키도 `DATABASE_URL` 도 없다.**
그래서 스키마·정책·grant 열람은 애초에 불가능하다.

## 1. 확인된 것 (2026-09-11 실측)

### 익명 접근은 세 테이블 모두에서 차단된다

| 키 | `cheongi_reports` | `cheongi_payment_orders` | `cheongi_user_profiles` |
| --- | --- | --- | --- |
| `SUPABASE_PUBLISHABLE_KEY` | **401** permission denied | **401** permission denied | **401** permission denied |
| `SUPABASE_ANON_KEY` | **401** permission denied | **401** permission denied | **401** permission denied |

응답 메시지가 `permission denied for table …` 이다. 이것은 **RLS 가 행을 걸러낸 것이
아니라 테이블 grant 자체가 없다**는 뜻이다. 저장소의
`revoke all on table … from public, anon, authenticated` 와 일치한다.

→ **A-등급 보안 요구(익명이 결제·리포트·프로필을 읽지 못한다)는 충족된다.**

### 이 확인의 한계
`anon` 역할이 막혔다는 것이 `authenticated` 역할도 막혔다는 뜻은 아니다.
앱은 `SUPABASE_PUBLISHABLE_KEY` + **회원 access token** 으로 프로필을 읽는다
(`src/user/profile-store.ts`). 즉 `cheongi_user_profiles` 에는 `authenticated` grant 가
있어야 동작한다. 그 여부는 위 프로브로 알 수 없다.

## 2. 저장소가 기대하는 스키마

| 테이블 | 저장소 SQL | 비고 |
| --- | --- | --- |
| `cheongi_reports` | `supabase-reports.sql` | 15컬럼, RLS 4정책(owner select/insert/update/delete), anon·authenticated revoke, service_role 전권 |
| `cheongi_payment_orders` | `supabase-payment-orders.sql` | 16컬럼, `status` 는 6값 체크, `owner_id` → `auth.users` on delete **restrict** |
| `cheongi_user_profiles` | **없음** | **U19.** 코드(`src/user/profile-store.ts`)만 참조한다. 운영에는 존재한다(익명 401 로 확인) |

**`cheongi_user_profiles` 의 스키마가 버전 관리되지 않는다.** 지금 운영에 무엇이 있는지
저장소만 보고는 알 수 없고, 재구축·복구 절차도 없다. §3 의 조회 결과가 유일한 정본이 된다.

## 3. 확인이 필요한 것 — 실행 요청

`scripts/introspect-production-schema.sql` 을 Supabase SQL Editor 에서 실행하고
결과를 주시면 이 문서에 기록한다. 그 스크립트는 **아무것도 바꾸지 않는다.**

| § | 확인 대상 | 왜 필요한가 |
| --- | --- | --- |
| §1 | 테이블 존재·RLS 활성 | RLS 가 실제로 켜져 있는지 |
| §2 | 컬럼 정의 | 저장소 SQL 과의 드리프트. **프로필 테이블은 이것이 정본** |
| §3 | RLS 정책 본문 | `auth.uid() = user_id` 가 맞는지 |
| §4 | 테이블 권한 | `authenticated` 가 프로필에 어떤 권한을 갖는지 |
| §5 | 컬럼 단위 권한 | 저장소 SQL 이 컬럼 단위로도 revoke 한다 |
| §6 | 집계 2건 | 과거 리포트 중 상대 생년월일시를 담은 건수 (U26 소급 정리 규모) |
| §7 | 인덱스·제약 | 성능·무결성 |

§6 만 집계값을 세며 **내용은 읽지 않는다** (`payload -> 'context' -> 'partner' ? 'birth'`
키 존재 여부만 센다).

## 4. 다음 단계와의 연결

사용자 지시 순서는 (1) T07 → (2) 최소 관리자 → (3) U4 였고, **(2) 를 하려면 권한 근거가
먼저 필요해서 (3) 을 앞당겼다.** 선택지 C(U4 먼저) → A(`staff_members`) 로 진행한다.

`supabase-staff-members.sql` 을 함께 준비했다. 요점:
- 권한 근거를 **레거시 unlock 이메일 목록에서 분리**한다
- 회수는 `is_active = false` 한 줄이고 회수 시각이 트리거로 남는다
- 판정은 이메일이 아니라 **계정 id** 로 한다 (이메일은 바뀌고 재사용될 수 있다)
- `service_role` 만 읽는다. 직원 자신도 직접 읽지 않는다 — 직원 목록 자체가 노출 대상이다

§4 결과를 보고 이 스크립트의 grant 를 운영 관례와 맞춘 뒤 적용을 요청한다.
