---
task_id: task-018
status: done
active: false
owner: claude-pm
created: 2026-09-10
priority: P0
depends_on: [task-015]
resolves: [U14]
---
# task-018 — 배포 경로 정상화

## Purpose
~~Vercel 프로젝트에 Git 연동이 없어 배포가 CLI 전용이다.~~
**전제가 틀렸다(§정정 참조). 2026-09-10 16:25 시점에 Git 연동이 존재한다.**

진짜 문제는 **`vercel deploy --prod` CLI 배포가 Git 연동 배포를 우회한다**는 것이다.
CLI 배포는 Git 상태와 무관하게 로컬 작업 트리를 올리므로, 두 사람이 각자 로컬에서
배포하면 나중에 올린 쪽이 앞선 쪽의 작업을 덮는다. **2026-09-10에 실제로 발생했다** —
15:11 배포가 공개 SEO·FAQ·about 페이지를 404로 만들었고, CLI 배포에는 git 메타데이터가
없어서 정적 마커와 API 응답을 비교해 운영 소스를 추정해야 했다.

## Scope
- Implement:
  - 배포 경로 확정 (U14) — 초판은 "연동 부재"로 결론했고 §정정에서 뒤집혔다
  - `README.md`의 거짓 서술 정정
  - 전환 제안서 작성 (순서·위험·대안 포함)
  - 로컬 `main` 브랜치 성격 판정
- Do not implement:
  - `vercel git connect` 실행 (Vercel 설정 변경 — 승인 필요)
  - `git push` (권한 차단 + 승인 사안)
  - GitHub Actions 워크플로 생성 (TASK-005)

## 정정 — 초판의 "확정된 사실"이 틀렸다

초판은 아래 세 관측으로 "Git 연동 없음"을 확정했다.
- `vercel project inspect`에 Git 섹션 부재 (출력 533자)
- `vercel git ls`에 조회 서브커맨드 없음 (`connect`/`disconnect`만)
- Production 배포 3건 모두 git 메타데이터 없음

**관측은 맞았고 해석이 틀렸다.** `vercel git connect`가
`already connected to your project`를 반환했고, `main` push가 Production 배포를,
브랜치 push가 Preview 배포를 즉시 만들었다.
git 메타데이터 부재는 CLI 배포와 **양립**할 뿐 배포 경로를 식별하지 못한다.
Codex가 T02 리뷰에서 정확히 이 경계를 지적했는데 다시 넘었다 — **동일 실수 반복**.

**정정 초안에서도 반대 방향으로 또 넘었다** (Codex task-018 리뷰 Major 1).
증거는 **관측 시점의** 연결 상태와 라우팅만 증명한다.
**이전 배포 당시의 연동 상태와 그 배포들의 경로는 확정할 수 없다.**

## 확정된 사실 (정정 후)
- **2026-09-10 16:25 시점에 Git 연동 존재** (`already connected to your project`)
- **관측한** `main` push → Production 자동 배포 / **관측한** 브랜치 push → Preview 자동 배포
  (Production Branch 설정값 자체는 대시보드/API로 확인하지 않았다)
- CLI 배포는 Git 상태와 무관하게 로컬 작업 트리를 올린다 → 연동을 우회할 수 있다
- **규칙: 기본 경로는 `main` push. CLI Production 배포는 승인된 긴급 복구 예외로만 허용**
- **이 규칙에 자동 강제 수단은 없다.** `check:production-source`는 "Manual preflight only …
  does not intercept other deploys"(`scripts/check-production-source.mjs:5`)

## 미확정으로 남는 것
- 이전 배포 3건 당시의 연동 상태
- 그 3건의 배포 경로 (메타데이터 부재는 CLI 배포와 양립하나 단독 증거가 아니다)
- 15:11 배포에서 preflight 실행 여부 (명령 기록·CI 기록 없음)
- alias 형식(`chungi-t-git-<branch>-<scope>`)이 모든 연동 배포에 붙는지 (관측 1건)

## 브랜치 관계 (전환 순서를 결정하는 핵심)
```
git rev-list --left-right --count origin/main...HEAD  →  0    16
git merge-base --is-ancestor origin/main HEAD         →  성공
```
**`origin/main`이 우리 HEAD의 조상이다.** fast-forward 가능, 강제 push 불필요.
그러나 **`origin/main`에는 아직 우리 16커밋이 없다.**

→ Git 연동을 먼저 켜고 누군가 `main`에 push하면 **불완전한 main이 자동 배포되어
15:11 회귀가 재발한다.** 따라서 `main` 전진이 연동보다 **반드시 앞선다.**

## 로컬 `main` 판정
`5269272` (2026-09-02). `origin/main` 대비 **150 behind / 28 ahead**.
- 28커밋의 기능(love_spouse, match_couple, love_mind, 결제 테스트모드)은 **모두 현재 코드에 존재**
- `data/pungsu/**`, `src/pungsu/home-service.ts`(607줄)는 현재 트리에 없으나
  외부 풍수 API(`PUNGSU_DATASET_API_BASE`) 연동으로 대체되어 **코드에서 참조되지 않는다**
  (현재는 `src/pungsu/dataset-client.ts` 하나)
→ **낡은 라인.** 삭제하지 말고 보관하되 배포 기준으로 쓰지 않는다.

## Success Criteria
- [x] 배포 경로 확정 (U14 **정정 후 해소**) — Git 연동 존재, CLI 배포가 우회 경로
- [x] `README.md` 정정 — 배포 경로 2개, CLI 경로의 위험, 게이트 선행 이유, 브랜치 기준
- [x] 제안서 작성 + §0 정정 (`docs/admin-ops/TASK-018-deploy-path.md`)
- [x] 로컬 `main` 성격 판정
- [x] `git push origin fix/umsh-qa-ux` — `dac3835..0556e49`
- [x] `git push origin HEAD:main` — `f825d26..0556e49` fast-forward
- [x] `vercel git connect` 확인 — 이미 연결됨
- [x] 연동 배포 검증 — `dpl_42CkhxK2KC4CAKbPEwMQVQDAVXs1` Ready, alias `chungi-t-git-main-…`
- [x] 운영 회귀 복구 실측 — SEO/FAQ/about 200, 서비스 15종, 결제 문구 노출 0건

## Deliverables
- `docs/admin-ops/TASK-018-deploy-path.md`
- `README.md` 배포 섹션 정정

## Risks
- **순서 위반**: 연동을 먼저 켜면 불완전한 main이 자동 배포된다
- **중복 배포**: 연동 후 Actions에 `vercel deploy`를 넣으면 push 한 번에 배포 2회
  (T02 리서치 F9) → Actions는 CI 전용으로 제한. TASK-005 범위 제약
- **연동하지 않는 선택**도 가능하나 사람이 규칙을 지켜야 하므로 약하다.
  오늘 사고는 `check:production-source`를 건너뛴 결과다

## Verification Steps
- ~~`vercel project inspect` / `vercel git ls` 출력 확인~~ — **이 검사로는 연동 여부를
  판정할 수 없다.** CLI 출력에 Git 섹션이 없어도 연동은 존재한다
- `git merge-base --is-ancestor origin/main HEAD`
- 로컬 `main` 전용 파일이 현재 코드에서 참조되는지 grep
- **유효한 연동 검사: `main`에 push → Production 배포가 자동 생성되는지 본다.**
  연동 배포는 `chungi-t-git-<branch>-<scope>.vercel.app` alias를 가진다
- 배포 후 운영 실측: SEO 경로 HTTP 코드, `GET /api/services` 개수, `/api/payment/config` 노출 여부

## 재사용 규칙
**도구 출력에 어떤 섹션이 없다는 것은 그 기능이 없다는 단독 증거가 아니다.**
설정 상태는 그 속성에 맞는 **긍정 증거**와 **행위 관측**을 함께 써서 판정한다.

**그리고 행위 관측은 관측 시점의 효과만 증명한다.** 과거 상태를 증명하지 않는다.
캐시된 상태, 간접 자동화, 다른 설정이 같은 효과를 낼 수도 있다.
→ 부재 주장을 뒤집을 때 **반대 방향으로 과잉 주장하지 않도록** 시점을 문장에 박아둔다.
(이 Task에서 실제로 그 실수를 했다)
