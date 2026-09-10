---
task_id: task-018
status: active
active: true
owner: claude-pm
created: 2026-09-10
priority: P0
depends_on: [task-015]
resolves: [U14]
---
# task-018 — 배포 경로 정상화

## Purpose
Vercel 프로젝트에 Git 연동이 없어 배포가 CLI 전용이다. 그 결과 두 사람이 각자 로컬에서
배포하면 나중에 올린 쪽이 앞선 쪽의 작업을 덮는다. **2026-09-10에 실제로 발생했다** —
15:11 배포가 공개 SEO·FAQ·about 페이지를 404로 만들었고, 배포된 소스의 커밋 SHA를
확인할 수단이 없어 정적 마커와 API 응답을 비교해 운영 소스를 추정해야 했다.

## Scope
- Implement:
  - Git 연동 부재 확정 (U14)
  - `README.md`의 거짓 서술 정정
  - 전환 제안서 작성 (순서·위험·대안 포함)
  - 로컬 `main` 브랜치 성격 판정
- Do not implement:
  - `vercel git connect` 실행 (Vercel 설정 변경 — 승인 필요)
  - `git push` (권한 차단 + 승인 사안)
  - GitHub Actions 워크플로 생성 (TASK-005)

## 확정된 사실
- `vercel project inspect`에 **Git 섹션 부재** (출력 533자)
- `vercel git ls`에 조회 서브커맨드 없음 (`connect`/`disconnect`만)
- Production 배포 3건 모두 **git 메타데이터 없음**
- → 배포는 `vercel deploy --prod` CLI로만 일어난다. `git push`는 배포를 트리거하지 않는다

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
- [x] Git 연동 부재를 도구 출력으로 확정 (U14 해소)
- [x] `README.md` 정정 — 연동 부재, 실제 절차, 게이트 선행 이유, 브랜치 기준
- [x] 전환 제안서 작성 (`docs/admin-ops/TASK-018-deploy-path.md`)
- [x] 로컬 `main` 성격 판정
- [ ] `git push origin HEAD:main` (승인 + 권한 필요)
- [ ] `vercel git connect` (승인 필요)

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
- `vercel project inspect` / `vercel git ls` 출력 확인
- `git merge-base --is-ancestor origin/main HEAD`
- 로컬 `main` 전용 파일이 현재 코드에서 참조되는지 grep
- 연동 후: `main`에 커밋 push → 자동 배포 발생 + 배포 정보에 git 메타데이터 표시 확인
