---
task_id: task-009
status: done
active: false
owner: claude-pm
created: 2026-09-10
priority: P0
depends_on: [task-t04]
resolves: [U13, U23, U25]
---
# task-009 — `origin/main` 20커밋 통합

## Purpose
T01~T04에서 확인된 3개 미해결 항목이 모두 `origin/main` 병합 하나로 수렴한다.

- **U13** `origin/main`의 20커밋(결혼택일, 공용 GNB·하단 메뉴, 브랜드 UMSH→운명상회 통일,
  모바일 프레임 정합, QA 자동 규칙)이 운영·로컬 모두에 미반영
- **U23** `src/pet/cat-service.ts`에 `retrieveCategoryOwnChunks`(자기 코퍼스 우선 검색) 부재.
  **판매 중인 서비스의 동작 차이** → 출시/병합 차단 항목
- **U25** `check:*` 11개 가드가 stale. 수정본이 `origin/main`에만 있음

## 안전장치 (실행 전 완료)
- 복구 지점: `backup/pre-merge-20260910` = `dac38355b5ef4bb5e91778fdcf458873fc63f29e`
- 미추적 29건 vs incoming 216건 충돌: **0건**
- 우리가 수정한 tracked 2건(`.env.example`, `README.md`)이 incoming에 포함되는지: **0건**
  → 병합이 미커밋 작업을 덮어쓰지 않는다
- 되돌리기: `git merge --abort` (병합 중) 또는 `git reset --hard backup/pre-merge-20260910` (병합 후)

## Scope
- Implement:
  - `git merge origin/main` 실행
  - 충돌 24건 수동 해소 (add/add 3건 포함)
  - `wedding_day` 병렬 구현 판정 (U15)
  - 병합 후 전수 검증: typecheck, `npm test`, `check:*` 16개, `qa:all-services`
  - U23·U25 해소 확인
- Do not implement:
  - **push 금지** (사용자 승인 없이 원격 반영 안 함)
  - 배포 금지
  - 미추적 산출물 커밋 (TASK-008 범위)
  - 새 기능 추가

## 진행 상태 — 완료 (2026-09-10)
**병합 완료.** 커밋 `659ba7f` (부모 2개: `dac3835` + `fb686b6`). **푸시하지 않았다.**
사용자 승인 선택지 (C): 브랜드 표기는 현행 유지, 브랜드 통일은 TASK-011로 분리.

### 최종 검증
| 검증 | 병합 전 | 병합 후 |
| --- | --- | --- |
| `npm run typecheck` | 오류 0 | **오류 0** |
| `npm test` | 373 / 373 pass | **415 / 415 pass** (+42) |
| `check:*` 15개 | 4 PASS / 11 FAIL | **15 PASS / 0 FAIL** |
| `qa:all-services` | PASS | **PASS** |

### 해소 확인
- **U13** — 실제 21커밋 통합 (T04의 `check:production-source` 가 fetch 를 수행해
  `origin/main` 이 `f010f55` → `fb686b6` 로 갱신되어 있었다. Android 앱 셸 포함)
- **U15** — 결혼택일은 **우리 구현을 정본**으로 판정. 근거: 저쪽은 절대위치 오버레이 레이아웃과
  2단락 본문(15/21)이어서 우리 readability QA를 통과하지 못한다. 저쪽 프롬프트의
  '손 없는 날·삼재 구분'과 확장된 금지 규칙은 채택했다
- **U23** — `cat-service.ts`에 `retrieveCategoryOwnChunks` 2건 확보, `check:cat` PASS
- **U25** — stale guard 11개 전부 PASS

### 부수 확보 (예상 못한 유입)
- **Android 하이브리드 앱 셸** (`android/`, Capacitor) + Play 결제
- `/api/payment/google/verify` 구글플레이 영수증 검증
- `/.well-known/assetlinks.json` Android App Links
- 결제 문구의 환경변수 노출 해소 (`PAYMENT_UNAVAILABLE_NOTICE`)

### 병합 부작용 정리
- `services-manifest.json`·`KNOWN_SERVICE_KEYS`의 `wedding_day` 중복 제거 (add/add 산물)
- `SERVICE_TERM_GUIDANCE` `wedding_day` 중복 키 제거
- `service-directory.ts` `home_pungsu` hidden 해제, portal 카드·풍수 칩 주석 해제

### 1차 시도 기록 (참고)
**abort 후 계획 수립.** 충돌 24건의 내용을 전부 확인하고 파일별 해소 방침을 확정했다.
계획: `docs/admin-ops/TASK-009-merge-plan.md`
저장소는 안전하게 복원됐다 (HEAD `dac3835` 불변, 충돌 0건, dirty 31건 = 시도 전과 동일).
**blocked 사유:** 브랜드 표기 결정 1건이 5개 파일의 해소 방향을 바꾼다.
병합 중(MERGING) 상태로 결정을 기다리는 것은 위험하므로 abort했다.

## 병합 시도로 확정된 사실
- 충돌 24건 = 결혼택일 11 / 정책·공개 페이지 5 / 테스트 3 / `app.ts` 1(2 hunk) /
  `registry.json` 1 / `portal.js` 1 / `couple 02 입력` 1 / `check-wedding.mjs` 1
- `data/corpus/registry.json`: 양쪽 packs **28개 id 완전 동일** → 텍스트 차이뿐
- `app.ts` 충돌 ②: 우리는 판매 게이트 필터 보유, 저쪽은 고객 문구 개선 →
  **양쪽 장점 결합 가능** (필터 유지 + `PAYMENT_UNAVAILABLE_NOTICE`)
- 정책 페이지: **우리 쪽이 기능적으로 우위** — nav가 `/about`·`/faq`를 가리키고
  두 페이지는 우리 브랜치에만 존재. 저쪽 채택 시 살아 있는 링크가 사라진다
- 결혼택일: 어느 쪽도 상위집합 아님. THEIRS가 RAG 정제·표현·공용 reader 연결에서 앞서고,
  OURS만 `birthTimeKnown` 정확성 가드를 가진다 → **THEIRS 기준 + 가드 이식**
- `src/pet/cat-service.ts`는 충돌 목록에 없음 → 저쪽 버전이 들어와 U23 해소 예상
- `scripts/check-*.mjs` 11개가 저쪽 버전으로 갱신되어 U25 해소 예상

## [별건 발견] 운영 정보 노출
`GET /api/payment/config`(무인증)가 `setupMessage`로 **내부 환경변수 이름을 고객에게 노출**한다:
`"결제 모듈 연결 전입니다. 남은 설정: 이니시스 MID·SignKey (INICIS_MID, INICIS_SIGNKEY)."`
`origin/main`의 `aca0bf3`이 이미 `PAYMENT_UNAVAILABLE_NOTICE`로 교체해 해소했다.
비밀값이 아니라 변수 이름이므로 즉시 악용 가능한 취약점은 아니지만 노출할 이유가 없다.
→ 병합의 부수 효과로 해소된다.

## Success Criteria
- [x] 충돌 24건 전부 해소, 병합 커밋 `659ba7f` 생성
- [x] `npm run typecheck` 오류 0건
- [x] `npm test` 415/415 (373 → 415, +42는 저쪽 테스트 유입 및 합집합)
- [x] `check:*` 15개 전부 PASS (U25 해소)
- [x] `check:cat` PASS (U23 해소)
- [x] `wedding_day` 우리 구현 정본 판정, 근거 기록 (U15)
- [x] 병합 전/후 대조표 작성
- [x] push·배포 미수행 (1차 시도에서 `git fetch`와 `merge --abort`만 수행)

## Risks
- 충돌 24건 중 `src/server/app.ts`(양쪽 대폭 수정)와 `data/corpus/registry.json`이 가장 위험
- `wedding_day` add/add 3건은 어느 구현을 살릴지 사람 판정 필요
- 병합 후 `npm test` 개수가 바뀔 수 있다(양쪽 테스트 합산). 증감을 반드시 설명한다
- 정책 페이지 5건(privacy/terms/refund/support/portal)은 양쪽이 **반대 브랜드 결정**을 했다
  (우리: `UMSH 운명상회` + `v=20260909-logo` / origin: `운명상회` + `v=20260901-policy-pages`).
  시각상 **우리 쪽이 더 최신이며 현재 운영 표기**다(`dac3835` 09-09 17:06).
  그러나 `origin/main`의 `e777c43`은 "고객에게 UMSH가 보이던 곳을 전부 운명상회로"라는
  의도적 정리이고, 우리 브랜치는 그 커밋을 받은 적이 없어 **모른 채 진행**했다.
  → **사용자 결정 대상.** 권고는 선택지 (C): 병합은 (A) 현행 유지로 진행하고
  브랜드 통일은 SEO 영향까지 함께 볼 별도 Task로 분리

## Verification Steps
- `git status` 충돌 목록 확인
- 파일별 해소 후 `git diff --check`
- `npm run typecheck`
- `npm test` (npm 스크립트로 — T04 회귀 오라클 조건)
- `check:*` 16개 전수
- `npm run qa:all-services`
- `npm run check:production-source` (작업트리 비청결은 예상)

## Collaboration Logs
- review: CreamAI/logs/review/
- harness: CreamAI/logs/harness/

## Review Outcome (2026-09-10)
- Codex review: `CreamAI/logs/review/task-009_merge-resolution-review.md` — **Critical 1 / Major 4 / Minor 2**
- **Critical 1건 수정 완료** (`67b4d7b`): `/api/day/wedding/analyze` 중복 등록으로 앞쪽 핸들러가
  뒤쪽을 가려, `input.birthTimeKnown` 배선과 `buildWeddingTeaser` 조립이 런타임에서 죽어 있었다.
  병합에서 지키려 한 출생시각 미상 가드가 실제로는 동작하지 않았다. 핸들러를 하나로 합쳤다.
- Major 2건 수정: `parseTime`이 `known`을 반환하게 해 확인 여부 단일 출처화(`9:30` 문제),
  회귀 테스트 2건 추가(배선 제거 시 실패 확인).
- **Major 2건은 출시 게이트로 등록** (`plan.md` G6~G9): Play 토큰 재사용 차단 부재,
  U22 불확정 상태가 Play 경로에도 적용, `assetlinks.json` 서명 지문 placeholder,
  Android 빌드·기기 검증 미수행.
- Minor 2건은 TASK-013/TASK-014에서 함께 처리 (android README 경로 오기, EOF 공백).
- 재검증: typecheck 0 / `npm test` **417/417** / `check:*` 15/15 / `qa:all-services` PASS
- 반려한 지적: 없음.
