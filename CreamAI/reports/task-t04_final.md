# ProjectOps Final Report

task_id: task-t04
pack_task: T04
date: 2026-09-10
title: 기존 회귀 기준 수집 (admin-ops M0 마지막 Task)

## Definition of Done
- backlog_goal_met: YES — typecheck·unit baseline 산출, 기존 실패 13건 고정 및 성격 분류
- scope_contained: YES — 조사·문서화만. 프로덕션 코드 0건. `git fetch` 외 git 변경 0건
- tests_passed: YES — typecheck 0 오류, `npm test` 373/373 (2회), `qa:all-services` PASS
- codex_review_done: YES — `CreamAI/logs/review/task-t04_admin-ops-t04-review.md`
- critical_major_resolved: YES — Critical 0. Major 4·Minor 3 전부 반영. 반려 0건
- memory_candidate: `CreamAI/memory/candidates/task-t04_memory.md` (should_promote_to_rag: true)
- sensitive_data_stored: false

## 수용 조건 결과
| 수용 조건 | 결과 |
| --- | --- |
| typecheck·unit baseline 산출 | 충족 — 명령·환경·파일 manifest 해시까지 고정 |
| **실패가 기존인지 신규인지 구분** | 충족 — 기존 실패 13건을 고정하고 각 실패를 stale guard / 실제 코드 차이 / 정당한 실패로 분류 |

## 고정된 baseline
```
HEAD  dac38355b5ef4bb5e91778fdcf458873fc63f29e (fix/umsh-qa-ux)
환경  Node v24.13.1 / tsx v4.23.12 / cwd=루트 / Windows 11
대상  tests/unit/*.test.ts 60개
      경로 목록 sha256[0:16] = 202b69511bda7f40
      내용 합본 sha256[0:16] = d08cc1c098bd0494

typecheck                PASS (0 오류)
npm test                 PASS (373/373, 29 suites, 약 76s)  ※ npm 스크립트로만
qa:all-services          PASS (정적. output/ 산출물 부작용)
check:wedding            PASS
check:polish             PASS
check:prompt-guide       PASS
check:service-contracts  PASS
check:production-source  FAIL (작업트리 비청결 + HEAD가 origin/main 미포함)
check:pass-angle/marry/save/quit/couple/signal/thisyear/jobchoice/lucky/newyear
                         FAIL ×10 (stale guard — U25)
check:cat                FAIL (실제 코드 차이 — U23)
check:integrations       FAIL 2건 (Inicis MID·SignKey / checkout enabled)
```

## 핵심 결과
1. **`check:*` 실패 12개의 성격을 전수 규명했다.**
   - **11개는 stale guard.** 리팩터 `fdc80f2`(HEAD 조상)가 서비스별 헬퍼를 공용 테이블 +
     `retrieveCategoryOwnChunks`로 대체했고, 가드 수정본은 `origin/main`에만 있다.
     11개 가드 각각에 대해 옛 심볼 / 신 심볼 / 우리 코드 존재를 표로 검증했다. **코드 유실 아님.**
   - **1개는 실제 코드 차이.** `src/pet/cat-service.ts`에 `retrieveCategoryOwnChunks`가 없다
     (HEAD 0 / origin/main 2 / 형제 5개 서비스 2). 고양이 궁합만 자기 코퍼스 우선 검색이 빠졌다.
     **판매 중인 서비스이므로 병합/출시 차단 항목으로 격상** (U23).
2. **unit 결과가 실행 형태에 따라 결정적으로 갈린다.** `npm test` 373/0 vs 명시 파일 목록 365/8
   (각 2회 재현). **원인은 특정하지 않았다** (U24). 따라서 baseline은 명령·환경·manifest를
   함께 고정해야 유효한 조건부 기준이다.
3. **`check:production-source`가 저장소의 수동 배포 preflight**이고 현재 exit 1이다.
   작업트리 청결 + HEAD가 fetch한 `origin/main` 포함을 요구한다. 단 배포를 차단하지는 않으므로
   과거 배포가 이를 무시했는지는 미확인 (U14).
4. **16-ACCEPTANCE 지정 재사용 테스트 9개 전부 존재·통과.** 단 `admin.test.ts`가 하드코딩
   관리자 목록을 테스트로 고정하므로 T05에서 "고쳐서 통과" 금지.
5. **A01~A40: 덮임 2 / 부분 17 / 없음 21.** 완전히 덮인 것은 A33(소유권)·A34(완료 불변) 2개뿐이며,
   이 둘이 "관리자를 만들며 절대 깨뜨리면 안 되는 선"이다.

## Codex 리뷰 반영
Critical 0 / Major 4 / Minor 3 — 전부 수용, 반려 0건.
- Major 1: "순서 의존" 단정 → "실행 형태 의존, 원인 미특정"으로 하향. 환경·manifest 해시 추가
- Major 2: "운영 배포가 정책 위반" → "현재 소스가 preflight를 통과하지 못한다"로 하향
- Major 3: A32·A39를 덮임 → 부분으로 하향 (A32는 관리자 "미기록" UI 없음, A39는 `/orders` 미검증).
  합계 4/15/21 → **2/17/21**로 정정
- Major 4: `qa:all-services` NOT_RUN 사유가 오류 → 실행해 PASS 확인, `output/` 부작용 기록
- Minor: check diff 11→12(wedding 포함, 통과), "병합하면 해소"→"해소 예상+전수 재실행",
  회귀 오라클에 조건 명시
- 추가로 Codex가 실패 8개의 파일 귀속을 정정해 주었다(내 추측이 틀렸다).

## Risks
- **M0 종료 게이트 미완결.** U13(병합)·U23(cat)·U25(stale guard)가 남아 있고 세 항목 모두
  `origin/main` 병합으로 수렴한다. Codex도 "M0 완료 선언 불가"로 동일 판정
- U23은 판매 중 서비스의 동작 차이 — 출시/병합 차단
- U24 미해소 상태의 baseline은 조건부. T10이 `report-store.ts`를 건드릴 때 8개를 먼저 확인
- 병합 후에는 `check:*` 16개 + `npm test` baseline을 **전수 재수집**해야 한다

## Next Actions
**다음 행동은 Task 실행이 아니라 사용자 결정이다.**
1. **U13 `origin/main` 병합 결정** — 충돌 24건. 병합으로 U23·U25가 함께 수렴
2. U10 hidden 4종 판매 정책
3. ADR-0002 승인 (관리자 UI 배치·디자인)
4. **U22 불확정 상태 설계 — TASK-007(결제 활성화)보다 선행**
5. 운영 자격: U4 (service_role 읽기 전용으로 운영 스키마·grant·분석열 집계)
6. 설계 결정: U17(주문 직렬화), U20(readiness 게이트), U24(테스트 격리)

T05는 위 항목이 해소되기 전까지 착수하지 않는다.
