# ProjectOps Final Report

task_id: task-t02
pack_task: T02
date: 2026-09-10
title: 20종 키·노출 매핑 + 운영 소스 정본 확인 (U1/U7 해소)

## Definition of Done
- backlog_goal_met: YES — 20종 매핑표, 누락 0건, alias 충돌 2건, hidden 자동공개 없음 확인
- scope_contained: YES — 조사·문서화만. 프로덕션 코드 변경 0건
- tests_passed: YES — `npm run check:service-contracts` 통과. 런타임 검증 4건
- codex_review_done: YES — `CreamAI/logs/review/task-t02_admin-ops-t02-review.md`
- critical_major_resolved: YES — Critical 0. Major 3·Minor 2 전부 반영. 반려 0건
- memory_candidate: `CreamAI/memory/candidates/task-t02_memory.md` (should_promote_to_rag: true)
- sensitive_data_stored: false

## 산출물
- `docs/admin-ops/T02-service-mapping.md` — T02 본문 (20행 매핑표, 충돌 분석, 필드 소유자 표)
- `docs/admin-ops/production-source-of-truth.md` — U1/U7 해소, origin/main 분기 분석
- `docs/admin-ops/HANDOFF.md` — T02 인계 항목
- `CreamAI/backlog/task-t02.md`
- `docs/admin-ops/T01-baseline.md` §2.1·§7 정정 (U1 결론 반전)
- `plan.md` — T02 DONE, U1/U7/U8 해소, U10~U16 추가, TASK-009/010(병합·배포경로) 신설
- `status.md`, `tests.md` (V-022, V-024~V-030)

## 핵심 결과

### T02 본체
1. **20종 누락 0건** — canonical 20 = manifest 20 = 프롬프트 파일 20
2. **[중대] `cmdg ↔ saju_master` 브리지 부재** — `loadServiceSystemPrompt('cmdg')` THROW.
   `/api/saju/analyze`가 400으로 거절해 현재 사용자 영향은 없으나,
   관리자가 paymentKey를 프롬프트·코퍼스 조회에 넘기면 500이 된다
3. `home` 정규화 방향이 축마다 반대 (prompt ↔ directory)
4. hidden 자동 공개 없음 — `listServiceDirectory()` 15건
5. **[신규] 노출 15종 ≠ 판매 19종** — `PUBLICLY_DISABLED_PRODUCT_KEYS`가 빈 Set.
   hidden 4종이 운영 결제 catalog에 노출되고 신규 주문이 가능하다 (운영 API 실측)
6. **[신규] 06-SCREENS S02 요구 17개 필드 중 코드 상수 10 / 부재 7 → 관리자 편집 가능 0개**
7. `returnPath ≠ landingPath` 8건
8. 18-SERVICES 표는 20행 중 19행 정확

### U1/U7 해소 (사용자 질문 계기)
- **운영은 `origin/main`이 아니다.** 운영 배포 `dpl_8GJ6WMBmoaBZeQy4YFQtcwZ8JeKZ`의
  라이브 콘텐츠가 로컬 HEAD 계열과 일치한다
- **T02 감사 표면은 운영과 일치** — 운영 `/api/services` 15건·`/api/payment/config` 19건이
  로컬 매핑표와 순서까지 동일
- **`origin/main`의 20 커밋이 운영·로컬 모두에 미반영** (결혼택일·공용 GNB·브랜드 통일·
  모바일 프레임 정합). 병합 dry-run 충돌 24파일, `wedding_day` add/add
- `README.md`의 "main push가 Production 트리거" 서술이 현재 사실과 다름

## 검증 결과
| 검증 | 결과 |
| --- | --- |
| `npm run check:service-contracts` | PASS (20종 계약 QA) |
| `listServiceDirectory()` | 15건 |
| `loadServiceSystemPrompt('cmdg')` | THROW (의도된 실패 케이스) |
| 운영 `GET /api/services` | 15건, 로컬 매핑표와 완전 일치 |
| 운영 `GET /api/payment/config` | catalog 19건, `storage=supabase`, `checkoutEnabled=false` |
| 운영 `GET /robots.txt`, `/sitemap.xml`, `/privacy` | HEAD 마커와 일치 |
| `git merge-tree` dry-run | exit 1, 충돌 24파일 |
| Codex 리뷰 | Critical 0 / Major 3 / Minor 2 — 전부 수용·반영 |

## Risks
- U10(hidden 판매 정책) 미확정 상태에서 T22의 `availability` 정의를 확정할 수 없다
- U13(origin/main 미병합)을 방치하면 분기가 계속 벌어지고 공용 GNB·브랜드 통일이 운영에 없다
- U16(운영 트리 전체 동일성 미확인) — 이후 Task에서 "운영 == 로컬"을 전제로 삼으면 안 된다
- T05는 U2(개발용 영속 저장소)로 여전히 blocked
- 작업 트리 미커밋 파일 다수. 커밋 전략은 TASK-008

## Next Actions
1. 사용자 승인 후 **T03 (저장소 스키마·권한 조사)**. 넘기는 확인 요청:
   U12(저장된 `context.serviceKey` 분포), 주문 `amount` 스냅샷, U9(`developmentReportAccess`)
2. 사용자 결정 필요: U10(hidden 판매 정책), U13(origin/main 병합 시점), ADR-0002 승인
3. TASK-009(병합)는 admin-ops와 병행하지 않는다. 수행 시 373 테스트 전수 재검증 필수
4. 별건: `README.md` 배포 서술 정정 (U14), 하네스 ProjectRoot 계산 오류
