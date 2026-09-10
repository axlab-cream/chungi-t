# ProjectOps Final Report

task_id: task-t03
pack_task: T03
date: 2026-09-10
title: 저장소 스키마·권한 조사 (admin-ops M0)

## Definition of Done
- backlog_goal_met: YES — 타입·접근·영속성·마이그레이션 차이표 산출, 수용 조건 2개 충족
- scope_contained: YES — 조사·문서화만. 프로덕션 코드 0건, 운영 DB 쿼리 0건
- tests_passed: YES(선행) — `npm test` 373/373 (구형 레코드 케이스 포함, T01에서 실행)
- codex_review_done: YES — `CreamAI/logs/review/task-t03_admin-ops-t03-review.md`
- critical_major_resolved: YES — Critical 0. Major 5·Minor 3 전부 반영. 반려 0건
- memory_candidate: `CreamAI/memory/candidates/task-t03_memory.md` (should_promote_to_rag: true)
- sensitive_data_stored: false

## 수용 조건 결과
| 수용 조건 | 결과 |
| --- | --- |
| `owner_id` 타입 확보 | **`uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT`** — 08-DATA의 "TEXT"는 오류 |
| 구형 payload fixture 확보 | `tests/unit/report-persistence.test.ts:102` (resultId·status·generationId 전부 undefined) |
| 타입·접근·영속성·마이그레이션 차이표 | §2~§5, §7 |

## 핵심 결과
1. **정본 SQL과 코드 `ensureDb()`가 서로 다른 스키마를 만든다.**
   orders: uuid+FK+status CHECK+RLS+grant+index vs TEXT만. reports: 분석열 8 vs 1, 인덱스 7 vs 1.
   `IF NOT EXISTS`라 기존 DB는 안전하지만 새 DB는 약한 스키마가 된다.
2. **`cheongi_user_profiles` 정본 SQL 부재.** 코드가 유일한 정의이고 운영 grant·RLS 미확인 (U19).
3. **스토어 3개 접근 모델이 다르다.** orders·reports는 service_role(RLS 우회),
   **profiles는 고객 accessToken + publishable 키(RLS 통과)** → 관리자는 현재 함수로 프로필을 읽을 수 없다.
4. **reports는 4개 저장 모드 전부 `revision` CAS + 불변 필드 강제** (ADR-05가 코드로 확인됨).
5. **orders는 상태 가드만 있고 직렬화·멱등키·row lock이 없다** → A09/A10 미충족 (U17).
6. **`cheongi_reports` 관리자 분석 열 8개를 앱이 기록하지 않는다** → S07 목록·필터 서빙 불가 (U18).
   실제 공개 URL 판별자는 `public_id` 열이 아니라 `payload->>'resultId'`.
7. **PG 승인 성공 후 저장 실패를 담을 불확정 상태가 `status` enum에 없다** → A12/A13 미충족 (U22).
   현재 `checkoutEnabled=false`라 잠재적이나 **TASK-007(결제 활성화)보다 앞서 해소해야 한다.**
8. U9 부분 해소 (`developmentReportAccess` 술어 확정, 결과는 설정 의존).

## 검증 결과
| 검증 | 결과 |
| --- | --- |
| 정본 SQL vs `ensureDb()` 열 단위 대조 | PASS (orders 6항목·reports 5항목 차이 확정) |
| `owner_id`/`user_id` 타입 확정 | PASS (uuid+FK) |
| 구형 payload fixture | PASS (`npm test` 373건에 포함되어 통과) |
| 주문 낙관적 동시성 | **FAIL** (U17) |
| PG 승인 후 저장 실패의 상태 표현 | **FAIL** (U22) |
| 운영 DB 스키마·grant·분석열 집계 | NOT_RUN (service_role 키 미보유 — U4) |
| `verify-payment-db.sql` / `verify-report-db.sql` | NOT_RUN (커버리지만 검토) |
| Codex 리뷰 | Critical 0 / Major 5 / Minor 3 — 전부 수용·반영 |

## Codex 리뷰 반영
Major 지적 5건 중 4건이 **증거 경계 초과**였다. 결론은 유지되고 주장 강도만 정확해졌다.
- 헤더의 "3개 테이블 모두 service_role 전용" → profiles는 미확인으로 분리
- "미기입/비어 있음" 단정 → "현재 쓰기 경로가 기록하지 않는다" + 운영 미확인
- `developmentReportAccess` "항상 false" → 술어는 소스 사실, 결과는 설정 의존
- `verify-*.sql`을 "성공"으로 표기 → "스크립트 커버리지 검토(미실행)"로 재분류
- U22의 최종 상태 단정 → 저장소 회복 시점에 따라 `failed`/`approving`으로 갈림
- Minor: 저장 모드 5종→4종, 마이그레이션 표 분석열 7→8·인덱스 6→7, §11에 U21/U22 포함

## Risks
- **U22가 TASK-007보다 앞서야 한다.** 순서를 지키지 않으면 결제 활성화 직후
  PG 승인/내부 상태 불일치가 조용히 누적될 수 있다
- U4(운영 스키마·grant, 특히 profiles) 미확인 상태로 T10을 설계하면 동작하지 않는 adapter가 나온다
- U18을 측정 없이 가정하면 사용 가능한 데이터를 버리거나 잘못된 마이그레이션 전제를 세운다
- U17 미해소 상태로 T06을 시작하면 09-API의 `expectedRevision` 계약을 구현할 수 없다
- M0는 T04로 완료되지만 **M1은 U2·U4·U17 해소 전 착수 불가**

## Next Actions
1. 사용자 승인 후 **T04 (기존 회귀 기준 수집)** — M0 마지막 Task. 어떤 U 항목에도 막히지 않는다
2. 운영 자격 필요: **U4** — service_role 접근으로 운영 스키마·grant·RLS·분석열 null 집계 확인
   (고객 payload는 읽지 않는 읽기 전용 메타데이터 쿼리)
3. 설계 결정 필요: **U17**(주문 직렬화), **U22**(불확정 상태), U20(readiness 게이트)
4. 기존 대기: U10(hidden 판매 정책), U13(origin/main 병합), ADR-0002 승인
