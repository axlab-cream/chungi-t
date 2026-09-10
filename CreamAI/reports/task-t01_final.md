# ProjectOps Final Report

task_id: task-t01
pack_task: T01
date: 2026-09-10
title: 기준 소스·운영 차이 기록 (admin-ops M0 첫 작업)

## Definition of Done
- backlog_goal_met: YES — HEAD·dirty·라우트·환경별 차이표 산출, E01~E16 재검증, U1~U9 도출
- scope_contained: YES — 조사·문서화만. 프로덕션 소스 변경 0건, 커밋·푸시·배포·스키마 변경 0건
- tests_passed: YES — `npm run typecheck` 0 오류, `npm test` 373/373 (기존 실패는 결제 계열뿐)
- codex_review_done: YES — `CreamAI/logs/review/task-t01_admin-ops-t01-review.md`
- critical_major_resolved: YES — Critical 0. Major 5 전부 반영. Minor 4 전부 반영. 반려 0건
- memory_candidate: `CreamAI/memory/candidates/task-t01_memory.md` (should_promote_to_rag: true)
- sensitive_data_stored: false (Codex 지적에 따라 하드코딩 이메일 인용도 제거)

## 산출물
- `docs/admin-ops/T01-baseline.md` — T01 본문 (정정 이력 포함)
- `docs/admin-ops/HANDOFF.md` — living 인계 기록 (패키지 20-HANDOFF 양식)
- `docs/adr/ADR-0002.md` — 관리자 UI 배치·디자인 방향
- `CreamAI/backlog/task-t01.md`
- `plan.md` — admin-ops T01~T38 큐 + READY* 조건 + U1~U9
- `goal.md` — admin-ops를 최우선 목표로 추가
- `tests.md` — V-015~V-023
- `status.md` — task-003 PAUSED, task-t01 DONE 기록

프로덕션 소스(`src/`, `api/`, `vercel.json`, `package.json`) 변경 **없음**.

## 핵심 결과
1. **HEAD는 운영 소스가 아니다** — `fix/umsh-qa-ux`는 `origin/main` 대비 -20/+10 (U1)
2. 패키지 "현재 확인된 API" 15개 **전부 실재** (충돌 0건). 미기재 실제 API **23건**
3. `GET /api/report/:reportId`는 `/api/reports/:reportId` 별칭과 함께 존재하고
   `verifySupabaseUser` 소유자 검증을 한다. `developmentReportAccess`가 우회 플래그 (U9 신설)
4. `express.static`(683~684행)은 파일이 있으면 **인증 없이 서빙** → 관리자 UI는 정적 루트 밖 배치
5. `src/auth/admin.ts`의 하드코딩 관리자 목록은 환경변수로 회수 불가 → T05에서 RBAC와 완전 격리
6. 로컬 주문 저장 모드 `memory` 실측 (Dev/Preview 미검증) → A17 대응 필요 (U2)
7. `/admin`, `/api/admin` 경로 충돌 없음

## 검증 결과
| 검증 | 결과 |
| --- | --- |
| `admin-ops-execution-pack` MANIFEST SHA-256 | PASS (ALL OK, 21 files) |
| `npm run typecheck` | PASS (0 오류) |
| `npm test` | PASS (373/373, 29 suites) |
| `node scripts/check-integrations.mjs` (운영) | 8 PASS / 2 FAIL (Inicis 계열) |
| 동 명령 `--base http://localhost:8790` | 7 PASS / 3 FAIL (Inicis 2 + storage memory) |
| 로컬 `GET /api/payment/config` | storage=memory, checkoutEnabled=false, testMode=false |
| 라우트 재추출 (배열 등록 포함) | 등록문 145 / 경로엔트리 286 / `/api` 39 |
| Codex 리뷰 | Critical 0 / Major 5 / Minor 4 — 전부 수용·반영 |

## Risks
- U1 미해소 상태에서 T02·T03을 진행하면 결과를 운영 현재값으로 오인할 수 있다
  → 산출물에 "로컬 HEAD `dac3835` 기준" 라벨 필수
- U2 미해소 시 관리자 쓰기 기능을 개발 단계에서 검증할 수 없다 (A17 상시 발동)
- U9(`developmentReportAccess`)가 어느 환경에서 참이면 미로그인 리포트 접근이 열린다
- 패키지 정본 인계 문서(`20-HANDOFF.md`)가 여전히 "T01~T38: todo" — 사용자 결정 대기
- 작업 트리 미커밋 파일 다수. 커밋 전략은 TASK-008

## Next Actions
1. 사용자 승인 후 **T02 (20종 키·노출 매핑)** — "로컬 HEAD 기준" 라벨 조건
2. 사용자 결정 필요: U1 기준 브랜치, `20-HANDOFF.md` 갱신 여부(A/B), ADR-0002 승인
3. T05는 U1·U2 해소 전 blocked 유지
4. 별건: `run-projectops-harness.ps1`의 ProjectRoot 계산 오류로 test 모드가 실제 테스트를 실행하지 않음
