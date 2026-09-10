# TASK-018 — 배포 경로 정상화 제안

- 작성일: 2026-09-10
- 해소 대상: **U14** (Vercel Git 연동 부재 · `README.md` 서술 불일치)
- 상태: **제안. Vercel 설정 변경은 승인 후 적용한다.**
- 근거 사건: `docs/admin-ops/production-state-20260910-1511.md`

## 1. 현재 상태 (확정된 사실)

| 확인 | 결과 |
| --- | --- |
| `vercel project inspect chungi-t` | **Git 섹션이 존재하지 않는다** (출력 533자, Install Command에서 끝) |
| `vercel git ls` | 서브커맨드가 `connect`/`disconnect` 뿐 — 연결 목록 조회 기능이 없다 |
| `vercel inspect <배포>` | 세 개의 Production 배포 모두 **git 메타데이터 없음** |
| `README.md` (수정 전) | "`main` 브랜치 push가 Production 배포를 트리거합니다" — **사실과 다름** |

→ **배포는 `vercel deploy --prod` CLI로만 일어난다.** `git push`는 아무것도 배포하지 않는다.

## 2. 이 구조가 만든 실제 피해

2026-09-10 하루에 Production 배포가 **최소 4번** 일어났고, 그중 두 번은 서로 다른
소스에서 나왔다.

| 시각 | 배포 | 소스 계열 | 결과 |
| --- | --- | --- | --- |
| 09-09 17:06 | `dpl_8GJ6WM…` | `fix/umsh-qa-ux` | 공개 SEO·FAQ·about 서비스됨 |
| 09-10 15:10, 15:11 | `dpl_GvzMisx…` | `origin/main` | **SEO·FAQ·about이 404로. 집 풍수 목록에서 사라짐** |
| 09-10 16:1x | `chungi-387wmilw8` | 병합본 | 양쪽 복구 |

**Git 연동이 없으므로 "누가 무엇을 올렸는지" 저장소에서 추적할 수 없다.**
배포된 소스의 커밋 SHA를 확인하는 수단이 없어서, 운영 소스를 알아내려고
정적 파일 마커와 API 응답을 비교해야 했다(T01·T02).

## 3. 전환 제안 — 순서가 중요하다

> **경고: 순서를 바꾸면 사고가 재발한다.**
> `origin/main`에는 지금도 우리 브랜치의 16커밋이 없다.
> Git 연동을 먼저 켜고 누군가 `main`에 push하면, **불완전한 main이 자동 배포되어
> 오늘 15:11과 같은 회귀가 다시 일어난다.**

### 3-1단계. `main`을 완전한 상태로 만든다 (선행 필수)

현재 분기 상태:
```
git rev-list --left-right --count origin/main...HEAD   →  0    16
git merge-base --is-ancestor origin/main HEAD          →  성공
```
**`origin/main`은 우리 HEAD의 조상이다.** 따라서 fast-forward가 가능하고 강제 push가 필요 없다.

```bash
git fetch origin
npm run check:production-source          # PASS 확인
git push origin fix/umsh-qa-ux           # 브랜치 자체 보존
git push origin HEAD:main                # main 을 fast-forward
```

마지막 명령이 `origin/main`을 우리 HEAD로 전진시킨다. 되돌리려면
`git push origin f825d269:main --force-with-lease`로 이전 지점으로 되돌릴 수 있다
(이전 `origin/main` = `f825d26`).

### 3-2단계. `main`이 운영과 일치하는지 확인

```bash
git rev-list --left-right --count origin/main...HEAD   #  0  0 이어야 한다
```

### 3-3단계. Git 연동 연결

```bash
vercel git connect https://github.com/axlab-cream/chungi-t.git --scope ax-lab-cream
```

연결 후 Vercel 설정에서 확인할 것:
- **Production Branch = `main`**
- Preview: 다른 브랜치 push마다 Preview 배포가 생긴다

### 3-4단계. 연결 후 첫 배포로 검증

`main`에 사소한 커밋 하나(예: README 수정분)를 push해 자동 배포가 도는지 확인하고,
배포 정보에 **git 메타데이터가 실리는지** 본다. 실리면 이후 운영 소스를 SHA로 추적할 수 있다.

## 4. 연결 후 달라지는 것

| 항목 | 지금 | 연결 후 |
| --- | --- | --- |
| 배포 트리거 | `vercel deploy --prod` 수동 | **`main` push마다 자동** |
| 운영 소스 추적 | 불가 (마커 비교로 추정) | 배포별 커밋 SHA |
| 다른 사람의 작업을 덮을 위험 | 높음 (각자 로컬에서 배포) | 낮음 (main이 단일 창구) |
| Preview | 수동 | 브랜치 push마다 자동 |
| `check:production-source` | 수동 preflight | 그대로 유지 — **연동이 있어도 필요하다**. push 전에 origin/main 포함을 확인하는 용도 |

### 주의: 중복 배포를 만들지 말 것

T02 리서치(F9)가 확인한 사항이다. Git 연동이 켜진 뒤 GitHub Actions에
`vercel deploy`를 넣으면 **push 한 번에 배포가 두 번** 돈다(빌드 시간 중복, PR 체크 2세트,
Preview URL 경쟁). 따라서 Actions는 **CI 전용**(typecheck + test + `check:*`)으로 두고
배포는 넣지 않는다. 이는 TASK-005(GitHub Actions CI)의 범위 제약이다.

## 5. 대안 — 연결하지 않는 선택

연결을 원하지 않는다면 최소한 아래를 규칙으로 둔다.

1. 배포 전 **반드시** `npm run check:production-source`를 돌리고 PASS만 배포한다.
   (이 검사가 "HEAD가 방금 fetch한 origin/main을 포함하는가"를 강제한다)
2. 배포한 사람이 배포 직후 `origin/main`에 push해 원격을 배포 상태와 일치시킨다.
3. 배포 기록을 `status.md`에 남긴다 (배포 URL + HEAD SHA).

이 규칙은 사람이 지켜야 하므로 연동보다 약하다. 오늘 사고는 1번을 건너뛴 결과다.

## 6. 부수 정리 항목

| 대상 | 판단 |
| --- | --- |
| 로컬 `main` 브랜치 (`5269272`, 09-02) | **낡은 라인.** `origin/main` 대비 150 behind / 28 ahead. 그 28커밋의 기능(love_spouse, match_couple, love_mind, 결제 테스트모드)은 모두 현재 코드에 존재한다. `data/pungsu/**`와 `src/pungsu/home-service.ts`(607줄)는 외부 풍수 API(`PUNGSU_DATASET_API_BASE`) 연동으로 대체되어 **현재 코드에서 참조되지 않는다**. 삭제하지 말고 보관하되 배포 기준으로 쓰지 않는다 |
| `upstream` 원격 | `jaeyong-planner/chungi-t` (fetch only, push DISABLED). 현 상태 유지 |
| `README.md` | **수정 완료** — Git 연동 부재, 실제 배포 절차, 게이트 선행 이유, 브랜치 기준을 명시 |

## 7. 승인이 필요한 항목

1. **`git push origin HEAD:main`** — `origin/main`을 우리 HEAD로 fast-forward.
   현재 push 권한이 이 세션에서 차단되어 있어 사용자가 직접 실행해야 한다.
2. **`vercel git connect`** — Vercel 프로젝트 설정 변경. 연결 후 `main` push가 곧 배포가 된다.
3. Production Branch를 `main`으로 둘 것인지, 아니면 다른 브랜치로 할 것인지.

1번 없이 2번을 하면 사고가 재발한다. **1 → 2 순서를 반드시 지킨다.**
