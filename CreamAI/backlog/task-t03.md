---
task_id: task-t03
pack_task: T03
status: done
active: false
owner: claude-pm
created: 2026-09-10
milestone: M0
priority: P0
depends_on: [task-t01]
requirement: R01
baseline: "로컬 HEAD dac3835 (fix/umsh-qa-ux) = 운영 배포 계열. U1/U7 해소 후 운영 기준"
---
# task-t03 — 저장소 스키마·권한 조사 (admin-ops T03)

## Purpose
관리자가 주문·리포트·회원 프로필을 조회·변경하려면 실제 타입, 접근 경로, 영속성 보장,
그리고 정본 스키마와 코드 fallback 사이의 마이그레이션 차이를 알아야 한다.
08-DATA는 논리 설계이므로 실제 코드·SQL과 대조해 확정한다.

## Scope
- Implement:
  - `cheongi_payment_orders`, `cheongi_reports`, `cheongi_user_profiles` 타입·제약·인덱스 확정
  - 정본 SQL(`supabase-*.sql`) vs 코드 `ensureDb()` 차이표
  - 3개 스토어의 접근 모델(키 종류, RLS 통과 여부) 비교
  - 저장 모드 전수 및 영속성 보장 수준
  - 낙관적 동시성(revision/CAS) 구현 여부
  - `owner_id` / `user_id` 타입 확정 (수용 조건)
  - 구형 payload fixture 확보 (수용 조건)
  - T02 인계 항목: U9, U12, 주문 `amount` 스냅샷
- Do not implement:
  - 스키마 변경, migration 생성, backfill (T22 / TASK-004)
  - 운영 DB 쿼리 (service_role 키 없음)
  - 관리자 adapter 구현 (T08, T10)
  - 코드 수정
  - git 커밋/푸시

## Success Criteria
- [x] 3개 테이블의 타입·제약·인덱스 기록
- [x] `owner_id`=uuid+FK, `user_id`=uuid+FK 확정. 08-DATA "TEXT" 기재 오류 검출
- [x] 정본 SQL vs `ensureDb()` 차이 열 단위 특정
- [x] 3개 스토어 접근 모델 차이 명시 (profiles는 고객 토큰 + RLS)
- [x] 구형 payload fixture — `tests/unit/report-persistence.test.ts:102`
- [x] U9 부분 해소, U12는 U4로 이관
- [x] 운영 DB 미조회 명시 + 증거 경계 기재

## Deliverables
- `docs/admin-ops/T03-storage-schema.md`
- `docs/admin-ops/HANDOFF.md` T03 항목

## Verification Steps
- `supabase-payment-orders.sql`, `supabase-reports.sql` 전문 대조
- `src/payment/order-store.ts`, `src/report/report-store.ts`, `src/user/profile-store.ts` 정독
- `scripts/verify-payment-db.sql`, `scripts/verify-report-db.sql` 검증 의도 확인
- `tests/unit/report-persistence.test.ts` 구형 레코드 케이스 확인
- 코드에서 실제로 기록하는 열 목록 추출 (INSERT/PATCH 본문 기준)

## Collaboration Logs
- research: 해당 없음 (내부 코드·SQL 조사)
- review: CreamAI/logs/review/
- harness: CreamAI/logs/harness/

## Key Findings
1. `owner_id`는 **uuid + FK(auth.users, on delete restrict)**. 08-DATA의 "TEXT"는 오류.
2. 정본 SQL과 코드 `ensureDb()`가 **서로 다른 스키마**를 만든다 (타입·FK·CHECK·RLS·grant·인덱스).
3. 3개 스토어 접근 모델이 다르다. **profiles만 고객 accessToken + RLS 통과** →
   관리자는 현재 함수로 프로필을 읽을 수 없다.
4. reports는 4개 저장 모드 전부 `revision` CAS + 불변 필드 강제 (ADR-05 코드로 확인).
5. orders는 상태 가드만 있고 직렬화·멱등키 없음 → A09/A10 미충족 (U17).
6. `cheongi_reports` 관리자 분석 열 8개를 애플리케이션이 기록하지 않는다 → S07 목록 서빙 불가 (U18).
7. PG 승인 성공 후 저장 실패를 담을 **불확정 상태가 enum에 없다** → A12/A13 미충족 (U22).
   현재 `checkoutEnabled=false`라 잠재적이나 **TASK-007보다 앞서 해소 필요**.
8. `cheongi_user_profiles` 정본 SQL 부재 (U19). 운영 grant·RLS 미확인.

## Review Outcome (2026-09-10)
- Codex review: `CreamAI/logs/review/task-t03_admin-ops-t03-review.md` — Critical 0 / Major 5 / Minor 3
- 전부 수용, 반려 0건. 지적은 대부분 **증거 경계 초과**였다.
- Major 1: 헤더의 "3개 테이블 모두 service_role 전용" → profiles는 미확인으로 분리
- Major 2: "미기입/비어 있음"을 사실로 단정 → "현재 쓰기 경로가 기록하지 않는다" + 운영 미확인으로 수정
- Major 3: `developmentReportAccess` "항상 false" → 술어는 소스 사실, 결과는 설정 의존으로 수정
- Major 4: `verify-*.sql`을 "성공"으로 표기 → "스크립트 커버리지 검토(미실행)"로 재분류.
  코드 경로 판정과 선행 Task 실측을 분리 표기
- Major 5: U22의 최종 상태 단정 → 저장소 회복 시점에 따라 `failed`/`approving`으로 갈림
- Minor: 저장 모드 "5종"→4종, 마이그레이션 표 분석열 7→8·인덱스 6→7, §11에 U21/U22 포함
