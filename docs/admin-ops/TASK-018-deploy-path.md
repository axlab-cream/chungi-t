# TASK-018 — 배포 경로 정상화 제안

- 작성일: 2026-09-10
- 해소 대상: **U14** (초판 서술: "Vercel Git 연동 부재" — §0에서 정정됨. 실제 대상은 **CLI 배포가 연동 배포를 우회하는 문제**)
- 상태: **완료 (D1~D6 전부 수행·검증).** 단 아래 §0의 중대한 정정이 있다.
- 근거 사건: `docs/admin-ops/production-state-20260910-1511.md`

## 0. [중대 정정] U14 판단이 틀렸다 — Git 연동은 이미 있었다

`vercel git connect` 실행 결과:

```
> Connecting GitHub repository: https://github.com/axlab-cream/chungi-t
> axlab-cream/chungi-t is already connected to your project.
```

그리고 `git push origin fix/umsh-qa-ux`와 `git push origin HEAD:main` 직후
**Preview 배포와 Production 배포가 각각 자동으로 시작됐다.**

```
28s  chungi-21q32w1y1  ● Building  Production   ← main push 로 트리거됨
57s  chungi-nzsuwzkaw  ● Building  Preview      ← 브랜치 push 로 트리거됨
```

→ **2026-09-10 16:25 시점에 Git 연동이 연결되어 있고 자동 배포가 동작한다.**

> **이 정정에도 경계가 있다** (Codex 리뷰 Major 1).
> `vercel git connect`의 응답은 **그 명령을 실행한 시점의 연결 상태**를 증명하고,
> push 후 배포 발생은 **그 시점의 라우팅**을 증명한다.
> **이전 배포 당시의 연동 상태는 현재 증거로 확정할 수 없다.** 그 3건이 CLI 배포였다는 것도
> 확정이 아니다 — git 메타데이터 부재는 CLI 배포와 양립하지만 단독 증거가 아니다.
> 여기서 확정된 것은 **"Git 연동이 없다"는 초판의 결론이 틀렸다**는 것뿐이다.

### 내가 왜 틀렸나

근거로 삼은 두 가지가 모두 연동 여부를 판정하지 못하는 신호였다.

| 내가 본 것 | 내가 내린 결론 | 실제 |
| --- | --- | --- |
| `vercel project inspect`에 Git 섹션 없음 | 연동 없음 | **CLI 출력이 Git 섹션을 표시하지 않을 뿐** |
| Production 배포 3건에 git 메타데이터 없음 | CLI 배포뿐 → 연동 없음 | 메타데이터 부재는 CLI 배포와 **양립**하지만 배포 경로를 **식별하지 못한다.** 그 3건의 경로는 여전히 미확정 |

즉 관측은 맞았고 **해석이 틀렸다.** "git 메타데이터가 없다"는 "그 배포가 CLI로 만들어졌다"는
뜻이지 "연동이 없다"는 뜻이 아니다.
Codex가 T02 리뷰에서 같은 종류의 지적을 이미 했는데(메타데이터 부재는 CLI 배포의 증거가
아니다) 그때는 가설로 낮췄다가, 이번에 다시 단정으로 올렸다. 같은 실수를 반복했다.

### 그래서 오늘 사고의 원인은 무엇이었나

연동 부재가 아니다. **CLI 배포가 연동 배포를 우회할 수 있다는 것**이다.
`vercel deploy --prod`는 Git 상태와 무관하게 로컬 작업 트리를 그대로 올린다.
따라서 연동이 있어도 누군가 로컬에서 `--prod`로 올리면 `main`에 없는 소스가 운영이 된다.

09-09 17:06 배포와 09-10 15:11 배포가 **그 경우와 부합한다** — 둘의 콘텐츠가 서로 다른
두 로컬 소스와 일치하고 `main`과는 일치하지 않았다. 단 배포 경로 자체는 미확정이다.

**진짜 규칙은 이것이다: `--prod` CLI 배포를 쓰지 않는다. `main` push로만 배포한다.**
`check:production-source`가 여전히 필요한 이유도 같다 — push 전에 HEAD가 최신
`origin/main`을 포함하는지 확인해야 한다.

## 1. 초판의 현재 상태 서술 (오판 포함 — 기록 목적)

| 확인 | 결과 |
| --- | --- |
| `vercel project inspect chungi-t` | **Git 섹션이 존재하지 않는다** (출력 533자, Install Command에서 끝) |
| `vercel git ls` | 서브커맨드가 `connect`/`disconnect` 뿐 — 연결 목록 조회 기능이 없다 |
| `vercel inspect <배포>` | 세 개의 Production 배포 모두 **git 메타데이터 없음** |
| `README.md` (수정 전) | "`main` 브랜치 push가 Production 배포를 트리거합니다" — **사실과 다름** |

→ ~~배포는 `vercel deploy --prod` CLI로만 일어난다. `git push`는 아무것도 배포하지 않는다.~~
**이 결론은 틀렸다. §0 참조.** `git push`는 배포를 트리거하며, CLI 배포는 그것을 우회하는
별개의 경로다.

## 2. 이 구조가 만든 실제 피해

2026-09-10 하루에 Production 배포가 **최소 4번** 일어났고, 그중 두 번은 서로 다른
소스에서 나왔다.

| 시각 | 배포 | 소스 계열 | 결과 |
| --- | --- | --- | --- |
| 09-09 17:06 | `dpl_8GJ6WM…` | `fix/umsh-qa-ux` | 공개 SEO·FAQ·about 서비스됨 |
| 09-10 15:10, 15:11 | `dpl_GvzMisx…` | `origin/main` | **SEO·FAQ·about이 404로. 집 풍수 목록에서 사라짐** |
| 09-10 16:1x | `chungi-387wmilw8` | 병합본 | 양쪽 복구 |

**그 배포들에는 git 메타데이터가 없어 "누가 무엇을 올렸는지" 저장소에서 추적할 수 없었다.**
커밋 SHA를 확인할 수단이 없어서, 운영 소스를 알아내려고 정적 파일 마커와 API 응답을
비교해야 했다(T01·T02).

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
   (이 검사가 "HEAD가 방금 fetch한 origin/main을 포함하는가"를 요구한다)
2. 배포한 사람이 배포 직후 `origin/main`에 push해 원격을 배포 상태와 일치시킨다.
3. 배포 기록을 `status.md`에 남긴다 (배포 URL + HEAD SHA).

이 규칙은 사람이 지켜야 하므로 연동보다 약하다.
오늘 사고에서 preflight 실행 여부는 **기록으로 확인되지 않았다.** 다만 이 검사는
CLI 배포를 자동 차단하지 않으므로, 실행했더라도 사고를 막지 못했을 수 있다.

## 6. 부수 정리 항목

| 대상 | 판단 |
| --- | --- |
| 로컬 `main` 브랜치 (`5269272`, 09-02) | **낡은 라인.** `origin/main` 대비 150 behind / 28 ahead. 그 28커밋의 기능(love_spouse, match_couple, love_mind, 결제 테스트모드)은 모두 현재 코드에 존재한다. `data/pungsu/**`와 `src/pungsu/home-service.ts`(607줄)는 외부 풍수 API(`PUNGSU_DATASET_API_BASE`) 연동으로 대체되어 **현재 코드에서 참조되지 않는다**. 삭제하지 말고 보관하되 배포 기준으로 쓰지 않는다 |
| `upstream` 원격 | `jaeyong-planner/chungi-t` (fetch only, push DISABLED). 현 상태 유지 |
| `README.md` | **재수정 완료** — §0 정정 반영. 배포 경로 2개(연동 push / CLI)와 CLI 경로가 연동을 우회하는 위험, 실제 절차, 게이트 선행 이유, 연동 배포 식별법(`vercel inspect`의 git 메타데이터), 브랜치 기준을 명시 |

## 7. 수행 결과 (2026-09-10 16:19~16:25)

| 단계 | 명령 | 결과 |
| --- | --- | --- |
| D1 | `git push origin fix/umsh-qa-ux` | `dac3835..0556e49` (exit 0) |
| D2 | `git push origin HEAD:main` | `f825d26..0556e49` **fast-forward** (exit 0) |
| D3 | `git rev-list --left-right --count origin/main...HEAD` | `0  0` |
| D4 | `vercel git connect … --yes` | **이미 연결됨** → §0 정정의 근거 |
| D5 | 라우팅 관측 | 관측한 `main` push는 **Production** 배포를, 관측한 브랜치 push는 **Preview** 배포를 만들었다. **2회 재현.** 단 **Production Branch 설정값 자체는 대시보드/API로 확인하지 않았다** |
| D6 | 연동 배포 검증 | `dpl_42CkhxK2KC4CAKbPEwMQVQDAVXs1` Ready(46s), alias **`chungi-t-git-main-ax-lab-cream.vercel.app`**, `umsh.kr` 이동 |

**배포 경로를 대조할 단서를 얻었다 — 단 단독 판정자로 쓰지 않는다.**

`main` push로 만들어진 Production 배포 **2건**이 모두 Aliases에
`chungi-t-git-main-ax-lab-cream.vercel.app`를 가졌다.

| 배포 | 트리거 | 이 alias |
| --- | --- | --- |
| `dpl_42CkhxK2KC4CAKbPEwMQVQDAVXs1` (16:19) | `main` push `f825d26..0556e49` | 있음 |
| `dpl_Ekm6XBuS8JFTCUxvny4xaRGREj2q` (16:39) | `main` push `0556e49..dfb3e37` | 있음 |

같은 두 push가 브랜치 push로 Preview 배포도 각각 만들었다.
→ **관측한 라우팅은 2회 재현됐다.** 그래도 이것은 이 프로젝트에서의 관측이며,
**alias 형식이나 메타데이터 유무만으로 모든 배포의 경로를 판정하지 않는다.**
배포 target, git 관련 메타데이터, alias, 생성 시각을 저장소의 push 기록과 함께 대조한다.
(Codex 리뷰 Major 2 — 같은 단일 신호 오류를 반복하지 않기 위한 제약)

### 운영 회귀 복구 실측

| 검증 | 결과 |
| --- | --- |
| `/robots.txt` `/sitemap.xml` `/about` `/faq` `/my` | **전부 200** (404에서 복구) |
| `/.well-known/assetlinks.json` | **200** (origin/main 개선 유지) |
| `GET /api/services` | **15종, `home_pungsu` 포함** (14종에서 복구) |
| `GET /api/payment/config` | 환경변수 이름 노출 **0건**, catalog 19종, 문구 정상 |
| `/privacy` 마커 | `UMSH 운명상회` / `v=20260909-logo` |

되돌리기(필요 시): `git push origin f825d269:main --force-with-lease`

## 8. 남은 규칙

1. **기본 배포 경로는 `main` push다.** CLI Production 배포는 **승인된 긴급 복구 예외**로만
   허용한다. 쓴 경우 직후에 같은 커밋을 `main`에 push해 원격과 운영을 일치시키고
   `status.md`에 남긴다.
2. **이 규칙에는 자동 강제 수단이 없다.** `check:production-source`는 스스로
   "Manual preflight only: this command does not intercept other deploys or verify a
   remote deployment artifact"라고 밝힌다(`scripts/check-production-source.mjs:5`).
   즉 `vercel deploy --prod`를 차단하지 못하고 원격 산출물도 검증하지 않는다.
   **CLI 금지는 기술적 통제가 아니라 운영 절차 규칙이다.**
3. GitHub Actions에 `vercel deploy`를 넣지 않는다 (push 1회에 배포 2회 — TASK-005 범위 제약).
4. push 전에 `npm run check:production-source`를 돌린다. 연동이 있어도 필요하다 —
   HEAD가 방금 fetch한 `origin/main`을 포함하는지 확인하는 용도다.
4. 다른 저장소(네이티브앱 폴더)의 push는 이 프로젝트 배포에 영향을 주지 않는다 (사용자 확인).
