# ProjectOps Final Report

task_id: task-009
date: 2026-09-10
title: `origin/main` 통합 + Codex 리뷰 반영 (U13 / U15 / U23 / U25 해소)

## Definition of Done
- backlog_goal_met: YES — 충돌 24건 해소, 병합 커밋 생성, U13·U15·U23·U25 해소
- scope_contained: YES — push·배포 미수행. 미추적 작업물 미커밋(TASK-008 유지)
- tests_passed: YES — typecheck 0 오류, `npm test` **417/417**, `check:*` 15/15, `qa:all-services` PASS
- codex_review_done: YES — `CreamAI/logs/review/task-009_merge-resolution-review.md`
- critical_major_resolved: YES — **Critical 1 수정**(`67b4d7b`), Major 4 중 2 수정 / 2 출시 게이트 등록
- memory_candidate: `CreamAI/memory/candidates/task-009_memory.md`
- sensitive_data_stored: false (Codex 독립 확인)

## 커밋
| 커밋 | 내용 |
| --- | --- |
| `659ba7f` | merge: `origin/main` 21커밋 통합, 충돌 24건 해소 |
| `67b4d7b` | fix(wedding): 병합이 남긴 중복 analyze 라우트 수정 + 회귀 테스트 2건 |

**푸시하지 않았다** (`ahead 23`). 복구 지점 `backup/pre-merge-20260910` = `dac3835`.

## Changed Files
병합 커밋 `659ba7f`: tracked 184개 (`android/` 98개 포함).
리뷰 반영 `67b4d7b`: `src/server/app.ts`, `src/day/wedding-service.ts`,
`tests/unit/day-wedding-service.test.ts`, `tests/unit/wedding-api-integration.test.ts`.
미커밋 잔여: `.env.example`(staged), `README.md`(unstaged) — TASK-003 산출물, TASK-008 범위.

## 검증 (병합 전 → 후)
| 검증 | 전 | 후 |
| --- | --- | --- |
| `npm run typecheck` | 오류 0 | **오류 0** |
| `npm test` | 373 / 373 | **417 / 417** |
| `check:*` 15개 | 4 PASS / 11 FAIL | **15 PASS / 0 FAIL** |
| `qa:all-services` | PASS | **PASS** |

## 해소된 항목
- **U13** 21커밋 통합 / **U15** 결혼택일 우리 구현 정본 판정 /
  **U23** cat 자기 코퍼스 검색 확보 / **U25** stale guard 11개 PASS

## Codex 리뷰 — Critical 1건이 실질적이었다
`/api/day/wedding/analyze`가 병합으로 **두 번 등록**되어 앞쪽 핸들러가 뒤쪽을 가렸다.
그 결과 이 병합에서 지키려 했던 두 동작이 **런타임에서 죽어 있었다**:
`input.birthTimeKnown` 배선(출생시각 미상 가드)과 `buildWeddingTeaser` 조립.
즉 내가 "우리 가드를 지켰다"고 보고한 것이 실제로는 동작하지 않는 상태였다.

수정: 핸들러를 하나로 합쳐 정규화된 오류 응답(저쪽) + 배선·티저(우리)를 모두 살렸다.
추가로 `parseTime`이 `known`을 반환하게 해 `partnerBirthTimeKnown`의 근거를 단일화했다
(이전 정규식은 `9:30`을 미상으로 처리해 용신 판단을 불필요하게 껐다).

회귀 테스트 2건을 추가하고, **배선을 임시로 제거해 테스트가 실제로 실패하는 것을 확인**했다.

## Risks
- **운영은 여전히 병합 전 상태다.** 배포하지 않았으므로 결제 문구의 환경변수 노출,
  고양이 궁합 RAG 단계 누락, 공용 GNB 미반영이 운영에서 계속된다 → TASK-015
- **Play/Android는 출시 게이트 G6~G9로 차단**했다 (`plan.md`):
  토큰 재사용 차단 부재, U22 불확정 상태가 Play 경로에도 적용,
  `assetlinks.json` 서명 지문 placeholder, Android 빌드·기기 검증 미수행
- 결혼택일에서 저쪽의 RAG 렌더링을 버렸고 `sectionBody`가 `_chunk`를 받고도 쓰지 않는다.
  삭제한 저쪽 테스트 3건의 커버리지도 아직 대체되지 않았다 → TASK-013 (P1)
- T04 baseline manifest 해시는 무효. 새 기준은 `67b4d7b` / 417 tests

## Next Actions
1. **TASK-015 배포 결정** — `check:production-source`의 차단 요인이 2건 → **1건**으로 줄었다.
   남은 것은 작업 트리 청결뿐이므로 **TASK-008(커밋 전략)** 이 선행이다
2. TASK-013 결혼택일 RAG 렌더링·테스트 커버리지 복구 (P1)
3. TASK-014 Android 앱 셸 인수 — 출시 게이트 G6~G9
4. **U22를 Inicis·Play 양쪽 결제 활성화보다 앞세울 것**
5. TASK-011 브랜드 표기 통일 (보류 중)
