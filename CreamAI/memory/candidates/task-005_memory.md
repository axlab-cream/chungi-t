# ProjectOps Memory Candidate

task_id: task-005
date: 2026-09-10
case_type: success (quality_gate)
failure_type: null
success_pattern: quality_gate
problem: |
  여러 Task 에 걸쳐 게이트를 많이 만들었다 — 정적 노출 매트릭스, 상대 개인정보,
  RAG 배선, 브랜드·검색 기반, 20개 서비스 QA. **그런데 전부 내 로컬에서만 돌았다.**
  다른 사람 push 는 그 게이트를 거치지 않고 운영에 도달한다.
  `.github/workflows/` 는 빈 폴더였다.

  그리고 이 프로젝트에는 특수 제약이 있다. Vercel Git 연동이 이미 push 마다 빌드하므로
  Actions 에 배포를 넣으면 **push 한 번에 배포가 두 번** 돈다.
solution: |
  **CI 를 만들 때 "무엇을 돌릴지"와 함께 "무엇을 돌리지 않을지, 왜"를 파일에 적는다.**
  그리고 그 계약을 테스트로 고정한다.

  이 프로젝트의 CI 계약 5조:
  1. 어떤 워크플로에도 배포 단계가 없다 (정규식. 주석은 제외)
  2. 최상위 `permissions` 블록이 정확히 하나, 내용이 정확히 `contents: read` 하나
  3. 회귀 게이트가 전부 있다 (`npm ci`·typecheck·test·SEO·QA·`vercel-build`·`git diff`)
  4. `package.json` 의 모든 `check:*` 가 CI 에 있거나 **제외 이유가 워크플로에 적혀 있다**
  5. Node 버전을 `.nvmrc` 한 곳에서 읽는다

  4번이 핵심이다. 검사를 빼는 것 자체는 정당할 수 있지만 **이유 없이 빠지는 것**을 막는다.
root_cause: |
  게이트를 만드는 사람과 게이트를 돌리는 환경이 다르다. 로컬에서 만든 검사는
  만든 사람만 실행한다. CI 에 올리지 않으면 그 검사는 "있다"가 아니라 "내가 기억할 때만 있다".
why_it_worked: |
  **CI 를 push 해서 실제로 돌려 봤다.** 4번 실행하며 두 가지를 배웠다 —
  `actions/*@v4` 가 Node 20 deprecation 경고를 낸다는 것(v5 로 해소), 그리고
  `main` push 가 CI 1회 + Vercel 배포 1회를 만든다는 것(중복 배포 없음 실측).
  YAML 을 읽어서 판단하지 않고 **실행 결과로** 확인했다.
reuse_condition: |
  로컬에만 있는 검사를 CI 로 올릴 때. 특히 배포가 다른 경로(호스팅 Git 연동)로
  이미 일어나는 프로젝트에서.
do_not_use_when: |
  배포를 CI 가 담당하는 프로젝트. 그때는 배포 금지 계약이 반대로 해롭다.
related_files:
  - .github/workflows/ci.yml
  - .nvmrc
  - tests/unit/ci-workflow.test.ts
recommended_prompt: |
  "CI 를 만들면 게이트 목록과 함께 '제외한 것과 그 이유'를 워크플로 파일에 적고,
   그 계약을 테스트로 고정하라 — 배포 단계 금지, 권한 최소, 게이트 존재,
   제외 이유 존재, 버전 단일 출처. 그리고 push 해서 실제로 돌려 확인하라."
recommended_command: |
  # 어떤 스크립트가 CI 에서 돌 수 있는지 (env·네트워크 의존 확인)
  for f in scripts/*.mjs; do echo "$f env:$(grep -c process.env $f) net:$(grep -cE 'fetch\(|https?://' $f)"; done
  # 테스트가 .env 를 읽는지
  grep -rn "dotenv" src/ | head
  env -u <CRED1> -u <CRED2> npm test        # 자격증명 없이 도는지
  npm ci --dry-run                          # 락파일 정합성
  # 실제 실행 확인 (origin 이 여러 개면 --repo 를 지정해야 한다)
  gh run list --repo <owner/repo> --limit 3
  gh run watch <id> --repo <owner/repo> --exit-status
revalidation_command: |
  npm test → `tests/unit/ci-workflow.test.ts` 5건이 계약의 오라클이다.
  음성 대조 5개: 배포 단계 주입 / 게이트 삭제 / 권한 승격 / job 수준 권한 /
  `npx vercel@latest --prod`.
expires_at: 2026-12-31
privacy_level: internal
should_promote_to_rag: true

## 계약 테스트를 두 번 강화한 기록

처음 쓴 계약은 **자기가 선언한 정책보다 약했다.**

| 조항 | 1차 | 뚫리는 방식 | 2차 |
| --- | --- | --- | --- |
| 배포 금지 | 문자열 4개 목록 | `npx vercel@latest --prod` | 정규식 4개 + 다른 호스팅 액션 |
| 권한 최소 | `contents: read` 가 **있는지** | `pull-requests: write` 추가, job 수준 승격 | 블록 1개 · 내용 정확히 1줄 |

**"있는지 확인"과 "그것만인지 확인"은 다르다.** 보안 계약은 후자여야 한다.
Codex 가 둘 다 잡았고, 음성 대조(변형 주입)로 강화를 검증했다.

## `gh` 가 다른 저장소를 가리킬 수 있다

이 저장소에는 remote 가 둘이다 — `origin`(axlab-cream/chungi-t)과
`upstream`(jaeyong-planner/chungi-t, fetch only). `gh run list` 는 **upstream 쪽을**
골라 404 를 냈다. `--repo axlab-cream/chungi-t` 를 붙여야 한다.
**remote 가 여러 개인 저장소에서 `gh` 는 대상을 명시한다.**

## 놓쳤다가 Codex 가 채운 것 — 배포 빌드 검증

CI 에 typecheck·test·검수를 다 넣고도 **Vercel 이 실제로 실행하는 빌드**를 빼놨었다.
`vercel-build` 는 FAQ 126건·사이트맵을 생성하고 `public/` 로 자산을 복사한다.
복사 원본이 사라지면 **배포에서만** 깨진다.
→ 게이트로 추가하고, 뒤에 `git diff --exit-code` 를 붙여 "생성물이 커밋된 것과 같은지"
까지 본다. **"CI 가 로컬과 같은 것을 돌리는가"가 아니라 "CI 가 배포와 같은 것을 돌리는가"**
를 물어야 했다.

## Evidence
- `npm test` 498 → **503 pass / 0 fail**, typecheck 0 오류
- GitHub 실제 실행 **4회 모두 success** (1m53s · 2m15s · 2m20s · main)
- `main` push → CI 1회 + Vercel Production 1회 (중복 배포 없음)
- 배포 후 운영 스모크 200, `PROMPT.md` 404 유지
- 음성 대조 5건 전부 확인 후 복원
- Vercel `nodeVersion` = `24.x` = `.nvmrc` (드리프트 없음)
- Codex: Critical 0 / Major 2 / Minor 3 → Major 2 · Minor 1 반영, 나머지는 근거와 함께 보류
  (`CreamAI/logs/review/task-005_actions-ci.md`)

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
