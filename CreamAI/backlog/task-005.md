---
task_id: task-005
status: done
active: false
owner: claude-pm
created: 2026-09-10
priority: P1
depends_on: [task-018, task-020]
resolves: [U33]
---
# task-005 — GitHub Actions CI (검사 전용)

## Purpose
지난 여러 Task 에서 만든 게이트가 **내 로컬에서만** 돌고 있었다 —
정적 노출 매트릭스(task-011·020), 상대 개인정보(task-019), RAG 배선(task-013),
브랜드·검색 기반(task-011), 20개 서비스 QA. 다른 사람 push 는 그것을 거치지 않고
운영에 도달한다. `.github/workflows/` 는 **빈 폴더**였다.

## 제약 — 배포 단계를 넣지 않는다
Vercel Git 연동이 이미 push 마다 빌드한다(task-018 §0). Actions 에 `vercel deploy` 를
넣으면 push 한 번에 배포가 두 번 돌고 PR 체크가 두 벌이 되며 Preview URL 이 경쟁한다
(T02 리서치 F9). 이 제약을 `tests/unit/ci-workflow.test.ts` 가 고정한다.

## 구성
| 항목 | 값 |
| --- | --- |
| 트리거 | `push` 전 브랜치 + `pull_request` |
| 권한 | `contents: read` (최상위 하나만) |
| 동시성 | 같은 ref 진행분 취소 |
| Node | `.nvmrc` = `24` — `setup-node` 가 `node-version-file` 로 읽는다 |
| 단계 | checkout@v5 → setup-node@v5 → `npm ci` → typecheck → test → 검수 15개 → 검색 기반(커밋 상태) → 20개 서비스 QA → **`vercel-build`(배포 빌드 검증)** → **`git diff --exit-code`(생성물 최신)** |

### CI 에서 제외한 2개와 이유 (워크플로 주석에도 적었다)
- `check:integrations` — Supabase·이니시스 실계정을 호출한다. PR 에 비밀값을 노출하지 않는다
- `check:production-source` — 배포 직전 preflight 다. 작업 트리 청결과 "HEAD 가 방금
  fetch 한 origin/main 을 포함하는가"를 요구하므로 main 보다 뒤처진 기능 브랜치에서는
  **정상적으로** 실패한다. Codex 확인: `main` push 에서 돌려도 Vercel 배포가 이미
  병렬로 시작하므로 **차단 게이트가 되지 못한다**

## Node 버전 — 드리프트 없음을 확인
`.vercel/project.json` 의 `nodeVersion` 이 **`24.x`** 이고 `.nvmrc` 도 `24` 다.
`package.json` 에 `engines.node` 를 추가하지 않았다 — 단일 출처를 늘리지 않고,
Vercel 의 런타임 선택에 영향을 주는 변경을 이 Task 에서 하지 않는다.

## Success Criteria
- [x] 게이트가 push·PR 마다 실행된다
- [x] 배포 단계가 없다 (계약 테스트로 고정)
- [x] `npm test` 전수 통과 (498 → **503**)
- [x] **GitHub 실제 실행 4회 모두 success** — 브랜치 3회 + `main` 1회
- [x] `main` push 로 CI 1회 + Vercel Production 배포 **1회** (중복 배포 없음 실측)
- [x] Codex 리뷰 Major 2건 · Minor 1건 반영

## Codex 리뷰 (`CreamAI/logs/review/task-005_actions-ci.md`)

### Major 1 — CI 가 Vercel 실제 빌드를 돌리지 않았다
`vercel-build`(= `prepare-vercel-public.mjs` + typecheck)가 FAQ 126건·사이트맵 생성,
검색 기반 재검증, `public/` 자산 복사를 한다. CI 에서 돌리지 않으면 **복사 원본 누락이나
경로 변경처럼 배포에서만 깨지는 회귀**가 통과한다.
→ 게이트로 추가했다. 배포 명령이 아니라 빌드 검증이다.
→ 덧붙여 `git diff --exit-code` 를 뒀다. 생성물이 커밋된 것과 다르면 누군가 원본만
바꾸고 재생성하지 않은 것이다. (로컬 실측: `vercel-build` 후 트리 변경 0건)

### Major 2 — 권한 계약이 정책보다 약했다
`contents: read` 가 **있는지만** 봤다. `pull-requests: write` 를 추가하거나 job 수준에서
승격해도 통과했다. → 최상위 `permissions` 블록이 **정확히 하나**이고 그 내용이
**정확히 `contents: read` 하나**인지 검사한다.

### Minor — 배포 금지 검사가 문자열 목록이었다
`npx vercel@latest --prod` 를 놓친다. → 정규식으로 바꾸고 다른 호스팅 배포 액션도 막는다.
**이것은 실수 방지 계약이며 권한 있는 사람의 의도적 우회를 막는 통제가 아니다**(Codex 지적 수용).

### Codex 가 확인해 준 것 (OK)
- lint 부재만으로 차단할 근거는 없다. typecheck·유닛 테스트·도메인 검수가 기능 회귀
  게이트로 충분하다. 반복되는 정적 오류가 확인될 때 도입을 검토한다
- 약 2분 CI 를 지금 샤딩할 필요는 확인되지 않았다. 큐 대기나 실행 시간이 커질 때 측정 근거와 함께
- `check:integrations` 를 fork PR CI 에서 제외한 판단은 적절하다
- 액션은 공식 `actions/*` 만 쓰므로 mutable 태그가 즉시 차단 사유는 아니다.
  SHA pin 이 더 안전하다는 점은 남는다

## Verification Steps
- 로컬: typecheck 0 오류 / `npm test` **503 pass** / 워크플로의 검수 루프 15개 전부 PASS
- 로컬: 자격증명 전부 unset 후 `npm test` 통과 (테스트는 `.env` 를 읽지 않는다 —
  `src/env/load.ts` 가 `--test` 를 감지해 dotenv 를 건너뛴다)
- 로컬: `npm ci --dry-run` 으로 락파일 정합성 확인
- 음성 대조 5건: 배포 단계 주입 / QA 게이트 삭제 / 권한 승격 / job 수준 권한 /
  `npx vercel@latest --prod` — 전부 실패 확인 후 복원
- **GitHub**: run 34468263114(1m53s), 34468459325(2m15s), 34469251646(2m20s),
  34469490228(main) 모두 success. `actions/*@v4` 의 Node 20 deprecation 경고는 v5 로 해소
- **배포 경로**: `main` push → CI 1회 + Production 배포 1회. 운영 스모크 200,
  `PROMPT.md` 404 유지

## 남긴 것
- **U34**: 액션을 커밋 SHA 로 pin 하고 Dependabot 으로 갱신할지 (지금은 공식 액션 태그)
- lint 도입은 근거가 생길 때 (Codex 도 지금은 불필요로 판단)
