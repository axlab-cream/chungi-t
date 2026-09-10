# 결론

지난 여러 Task 에서 만든 게이트가 **내 로컬에서만** 돌고 있었다. 이제 push·PR 마다 돈다.
**배포 단계는 넣지 않았고**, 그 제약을 계약 테스트로 고정했다.

`main` push 로 **CI 1회 + Vercel Production 배포 1회**를 실측했다 — 중복 배포 없음.

# 근거

## 무엇이 돌게 됐나

| 단계 | 내용 |
| --- | --- |
| `npm ci` | 락파일과 어긋난 의존성으로 통과하지 않게 |
| typecheck · test | 503건 |
| 검수 15개 | `check:pass-angle` … `check:service-contracts` |
| 검색 기반 (커밋 상태) | `verify-seo-foundation.mjs` |
| 20개 서비스 QA | `qa:all-services` |
| **배포 빌드 검증** | `vercel-build` — FAQ 126건·사이트맵 생성, 검색 기반 재검증, `public/` 복사 |
| **생성물 최신** | `git diff --exit-code` |

제외 2개와 이유를 워크플로 파일에 적었다 — `check:integrations`(실계정 필요),
`check:production-source`(배포 직전 preflight, main 보다 뒤처진 브랜치에서 정상 실패).

## 검증

| 항목 | 결과 |
| --- | --- |
| `npm test` | **503 pass / 0 fail** (변경 전 498) |
| **GitHub 실제 실행** | **4회 모두 success** — 1m53s · 2m15s · 2m20s · main. 10단계 녹색 |
| `main` push 결과 | CI 1회 + Production 배포 **1회** (중복 없음) |
| 배포 후 운영 | `/` `/faq` `/privacy` `/robots.txt` 200, `PROMPT.md` **404 유지** |
| 음성 대조 5건 | 배포 단계 주입 / QA 게이트 삭제 / 권한 승격 / job 수준 권한 / `npx vercel@latest --prod` — 전부 실패 확인 후 복원 |
| Node 정합 | `.nvmrc` `24` = Vercel `nodeVersion` **`24.x`** (드리프트 없음) |
| 자격증명 없이 | 전부 unset 후 `npm test` 통과 — 테스트는 `.env` 를 읽지 않는다 |

# 리스크

1. **계약 테스트는 실수 방지용이다.** 권한 있는 사람이 의도적으로 우회하는 것을 막지 못한다
   (Codex 지적 수용). 그 범위를 테스트 주석에 적었다.
2. **U34 — 액션이 mutable 태그(`@v5`)로 참조된다.** 공식 `actions/*` 만 쓰므로 즉시 위험은
   아니지만 태그 재지정 시 재현성이 약하다. SHA pin + Dependabot 은 별건.
3. **lint 가 없다.** Codex 도 지금은 불필요로 판단했다 — typecheck·유닛 테스트·도메인
   검수가 기능 회귀 게이트로 충분하다. 반복되는 정적 오류가 확인될 때 도입한다.
4. **CI 는 배포를 차단하지 못한다.** Vercel 연동 배포는 CI 와 **병렬로** 시작한다.
   CI 가 빨간불이어도 배포는 이미 진행된다. 차단이 필요하면 GitHub 브랜치 보호 규칙
   (required status check)이나 Vercel 쪽 설정이 필요하다 — 별건이며 사용자 판단 사항이다.

# 다음 행동

1. 다음 Task 후보: **U32**(공개 자산 전용 디렉터리 — 경로 기반 모델),
   **U28**(cmdg 레거시 love_this_year 분기), **U26 잔여**(과거 리포트 레코드 소급 정리),
   **U34**(액션 SHA pin), 그리고 **브랜치 보호 규칙**(위 리스크 4).
2. admin-ops M1(T05~T13)은 여전히 U2/U3/U4/U17/U24 에 막혀 있다.

# 인사이트

**로컬에만 있는 검사는 "있다"가 아니라 "내가 기억할 때만 있다".**
게이트를 만드는 것과 게이트가 돌게 하는 것은 다른 작업이다.

**"CI 가 로컬과 같은 것을 돌리는가"가 아니라 "CI 가 배포와 같은 것을 돌리는가"를 물어야 했다.**
typecheck·test·검수를 다 넣고도 Vercel 이 실제로 실행하는 `vercel-build` 를 빼놨다.
그 안에 FAQ 생성과 `public/` 복사가 있어서, 복사 원본이 사라지면 배포에서만 깨진다.
Codex 가 잡았고, 뒤에 `git diff --exit-code` 를 붙여 생성물 최신성까지 보게 했다.

**"있는지 확인"과 "그것만인지 확인"은 다르다.** 처음 쓴 계약 테스트는 자기가 선언한
정책보다 약했다 — `contents: read` 가 **있는지만** 봐서 `pull-requests: write` 추가나
job 수준 승격을 놓쳤고, 배포 금지는 문자열 목록이라 `npx vercel@latest --prod` 를 놓쳤다.
보안 계약은 후자여야 한다.

**CI 는 push 해서 실제로 돌려 봐야 안다.** 4번 돌리며 두 가지를 배웠다 —
`actions/*@v4` 의 Node 20 deprecation 경고(v5 로 해소), 그리고 `main` push 가 배포를
한 번만 만든다는 것. YAML 을 읽어서 판단하지 않았다.

**`gh` 는 remote 가 여러 개면 다른 저장소를 가리킨다.** 이 저장소의 `upstream` 을 골라
404 를 냈다. `--repo` 를 명시해야 했다.

## ProjectOps 기록
- task_id: task-005 (done)
- tests: `npm test` **503 pass / 0 fail**, typecheck 0 오류, 음성 대조 5건,
  GitHub 실행 4회 success, 중복 배포 없음 실측
- review: `CreamAI/logs/review/task-005_actions-ci.md` — Critical 0 / Major 2 / Minor 3
  → Major 2 · Minor 1 반영, 나머지(SHA pin·lint·샤딩)는 근거와 함께 보류
- memory_candidate: `CreamAI/memory/candidates/task-005_memory.md`
- reusable_rule: CI 에는 "무엇을 돌릴지"와 함께 "무엇을 돌리지 않을지, 왜"를 파일에 적고
  계약을 테스트로 고정한다. 배포와 같은 빌드를 돌리는지 확인한다.
  보안 계약은 "있는지"가 아니라 "그것만인지"를 검사한다. push 해서 실제로 확인한다.
- repeated_failure_prevented: task-020 memory("요청을 보내서 판단한다")를 CI 에 적용해
  YAML 검토가 아니라 실제 실행으로 확인했다. 그 덕에 deprecation 경고와 중복 배포 부재를
  둘 다 실측으로 확정했다.
