---
task_id: task-004
status: blocked
active: true
owner: claude-pm
created: 2026-09-11
priority: P0
depends_on: []
resolves: [U4, U19]
---
# task-004 — 운영 DB 스키마·권한 확인 (U4) 과 직원 membership 준비

## 왜 지금인가
사용자 지시 순서는 (1) T07 → (2) 최소 관리자 → (3) U4 였다.
**(2) 를 하려면 권한 근거가 먼저 필요하다.** T07 리뷰에서 Codex 가 확인했듯,
T05(직원 membership) 없이 주문·리포트 데이터 API 를 열면 A02/A03 위반이다.
그래서 (3) 을 앞당겨 C(U4 먼저) → A(`staff_members`) 로 간다. 사용자 승인 완료.

## 방법 제약
전역 규칙에 "production DB 직접 쿼리 금지" 가 있다. 취지를 운영 데이터를 임의로
읽거나 바꾸지 않는 것으로 읽고 두 가지를 지켰다.
1. 고객 데이터를 한 행도 읽지 않는다 (`limit=0` 프로브)
2. 권한이 필요한 조회는 내가 하지 않고 **읽기 전용 SQL 을 만들어 소유자가 실행**한다

로컬 자격증명은 anon·publishable 뿐이다. **service_role 키도 `DATABASE_URL` 도 없다.**

## 확인된 것
익명 접근이 세 테이블 모두에서 **401 permission denied** 다 (publishable·anon 양쪽).
메시지가 `permission denied for table` 이므로 RLS 필터가 아니라 **테이블 grant 부재**다.
→ 익명이 결제·리포트·프로필을 읽지 못한다는 A-등급 요구는 충족.

**한계**: `anon` 차단이 `authenticated` 차단을 뜻하지 않는다. 앱은 publishable 키 +
회원 토큰으로 프로필을 읽으므로 `cheongi_user_profiles` 에는 `authenticated` grant 가
있어야 한다. 그 여부는 이 프로브로 알 수 없다.

## 발견 — U19 확정
`cheongi_user_profiles` 는 **저장소에 SQL 이 없다.** 코드만 참조하고 운영에는 존재한다.
스키마가 버전 관리되지 않아 재구축·복구 절차가 없다.

## Scope
- Implement:
  - `scripts/introspect-production-schema.sql` — 읽기 전용 조회 7절 (변경 없음)
  - `supabase-staff-members.sql` — 직원 membership 최소판 (적용 전 단계)
  - `docs/admin-ops/U4-production-schema.md` — 방법·확인된 것·한계·요청 사항
- Do not implement:
  - **운영 DB 변경** — 조회 결과 확인 후 별도 승인
  - 관리자 데이터 API (T08~T10) — membership 적용 후

## Blocked on
소유자가 `scripts/introspect-production-schema.sql` 을 실행하고 결과를 전달하는 것.
그 전까지 §2~§7(컬럼·정책·grant·인덱스·소급 정리 규모)은 미확인이다.

## Success Criteria
- [x] 익명 접근 차단 실측 (데이터 미열람)
- [x] 저장소 기대 스키마 정리
- [x] U19 확정 — 프로필 테이블 SQL 부재
- [x] 읽기 전용 조회 SQL 작성
- [x] `staff_members` 마이그레이션 초안 (레거시 unlock 과 분리)
- [ ] 조회 결과 수령 및 기록
- [ ] `staff_members` 적용 승인·실행
- [ ] 관리자 권한 판정을 membership 으로 교체 (T05 → T07 잔여)
