# ProjectOps Memory Candidate

task_id: task-t04
date: 2026-09-10
case_type: success (quality_gate) + failure (tool_error)
failure_type: tool_error
success_pattern: quality_gate
problem: |
  "테스트가 통과하니 baseline은 건강하다"는 판단은 위험하다. 이 프로젝트는
  `npm test` 373/373 PASS, typecheck 0 오류인데도 **정적 가드 스크립트 16개 중 12개가 실패**하고
  있었다. 두 검증 층이 서로 다른 답을 내는데 아무도 몰랐다.
  게다가 같은 60개 테스트 파일을 **실행 형태만 바꿔** 돌리면 365/8이 나온다.
  즉 baseline 자체가 조건부였다.
solution: |
  회귀 기준을 수집할 때 4가지를 함께 한다.

  1. **검증 층 전수 실행.** `npm test`만 보지 말고 `package.json`의 모든 검증 스크립트를 돌린다.
     비용이 걱정되면 먼저 각 스크립트의 import를 보고 네트워크·LLM 의존을 판별한다
     (`grep -lE "fetch\(|OPENAI" scripts/*.mjs`). 이 프로젝트는 16개 중 1개만 네트워크였다.
  2. **실패마다 성격을 분류한다.** 단순히 "실패 목록"으로 두면 쓸모가 없다.
     최소 3분류: `stale guard`(검증 코드가 옛 심볼을 가리킴) / `실제 코드 차이` / `정당한 실패`.
     분류 근거를 남기지 않으면 다음 사람이 같은 조사를 반복한다.
  3. **실행 형태를 바꿔 한 번 더 돌린다.** glob 인자 vs 명시 파일 목록처럼 형태만 바꿔
     결과가 갈리면 baseline은 조건부다. 이때 결론을 "순서 의존"으로 단정하지 말고
     **"실행 형태 의존, 원인 미특정"** 으로 남긴다 — 인자 전달·glob 해석 주체·러너 실행 모드가
     동시에 바뀌므로 단일 원인으로 귀속할 근거가 없다.
  4. **baseline에 조건을 붙인다.** 명령 문자열, 런타임 버전, cwd, 대상 파일 manifest 해시.
     이것이 없으면 "이 실패가 신규인가"를 판정할 수 없다.
root_cause: |
  가드 실패의 실제 원인: 리팩터 커밋이 심볼을 옮겼고(예: 서비스별 손코딩 헬퍼
  → 공용 테이블 + 공통 검색 함수), 가드 스크립트를 따라 고친 커밋이 **다른 브랜치에만** 있었다.
  브랜치가 갈린 채 양쪽이 진행되면 "코드는 신 형태, 가드는 구 형태"인 조합이 만들어진다.
  이때 가드 실패를 "코드 유실"로 오독하기 쉽다.
why_it_worked: |
  가드 실패를 곧바로 "코드 유실"로 결론짓지 않고 3단 확인을 했다.
  (1) 가드가 찾는 문자열이 무엇인지 → (2) 다른 브랜치의 가드는 무엇을 찾는지 →
  (3) 그 신 심볼이 우리 코드에 있는지. 세 번째에서 "있다"가 나오면 stale guard로 확정된다.
  리팩터 커밋이 우리 HEAD의 조상인지(`git merge-base --is-ancestor`)까지 확인해 못을 박았다.
  이 절차를 실패한 가드 **전부**에 적용한 것이 결정적이었다 — 표본 5개로 일반화했더니
  리뷰가 즉시 지적했고, 전수로 바꾸자 예외 1건(cat)이 드러났다.
reuse_condition: |
  회귀 기준을 처음 수집할 때. 또는 "테스트는 통과하는데 뭔가 이상하다" 할 때.
  또는 정적 가드/린트가 대량 실패하는데 코드가 정상으로 보일 때.
do_not_use_when: |
  검증 층이 하나뿐인 소규모 프로젝트. 그때는 3·4번만 적용하면 충분하다.
related_files:
  - docs/admin-ops/T04-regression-baseline.md
  - CreamAI/logs/review/task-t04_admin-ops-t04-review.md
  - scripts/check-save.mjs
  - scripts/check-production-source.mjs
  - scripts/qa-all-services.ts
  - package.json
recommended_prompt: |
  "가드/린트가 실패하면 '코드 유실'로 결론짓기 전에 3단 확인을 하라:
   (1) 가드가 찾는 문자열, (2) 다른 브랜치 가드가 찾는 문자열,
   (3) 그 신 심볼이 현재 코드에 있는지. 실패한 가드 전부에 적용하고 표본 일반화하지 마라."
recommended_command: |
  grep -lE "fetch\(|localhost|OPENAI" scripts/*.mjs        # 네트워크 의존 판별
  for s in <all check scripts>; do npm run check:$s; echo $?; done
  git diff HEAD <other-branch> -- scripts/check-*.mjs      # 가드 드리프트 확인
  git merge-base --is-ancestor <refactor-sha> HEAD         # 리팩터가 우리 코드에 있는가
  ls tests/unit/*.test.ts | sort | sha256sum               # 대상 manifest 고정
revalidation_command: |
  npm test  (npm 스크립트로) → 373/373이면 유효.
  ls tests/unit/*.test.ts | sort | sha256sum → 202b69511bda7f40 이면 대상 동일.
expires_at: origin/main 병합 완료 시점 (그때 baseline 전면 재수집 필요) 또는 2026-12-31
privacy_level: internal
should_promote_to_rag: true

## 재사용 가능한 도메인 지식 (이 프로젝트 전용)

- **회귀 baseline (HEAD `dac3835`, Node v24.13.1 / tsx v4.23.12, Windows, cwd=루트)**
  - `npm run typecheck` → 0 오류
  - `npm test` → 373 tests / 29 suites / 373 pass / 0 fail (약 76s)
  - `qa:all-services` → PASS (정적. `output/`에 산출물을 쓴다)
  - `check:*` 4 PASS (wedding, polish, prompt-guide, service-contracts) / 12 FAIL
- **12개 FAIL 중 11개는 stale guard다.** 리팩터 `fdc80f2`가 서비스별
  `GROUP_LENS`/`ragLineFrom`/`dohwaLine`/`partnerStarLine`/`GROUP_PALACE`/`palaceLine`을
  공용 `reading-content.js`·`practical-readings.js` 테이블 + `retrieveCategoryOwnChunks`로 대체했고,
  가드 수정본(`7a4ef1c`, `00453e0`, `f6402cd`)은 `origin/main`에만 있다.
  → 이 실패를 "코드 유실"로 읽지 말 것.
- **예외 1건: `src/pet/cat-service.ts`에 `retrieveCategoryOwnChunks`가 없다.**
  형제 5개 서비스와 `origin/main`에는 2건씩 있다. 고양이 궁합만 자기 코퍼스 우선 검색이 빠졌다.
  판매 중인 서비스이므로 **병합/출시 차단 항목**으로 다룬다.
- **unit 결과가 실행 형태에 따라 갈린다.** `npm test`(glob) 373/0 vs 명시 목록 365/8.
  실패 8개는 `report-content-guards`(1) / `report-generator`(2) / `report-persistence`(5).
  → `report-store.ts`를 건드리는 작업(T10) 전에 이 8개를 먼저 확인한다.
- **`check:production-source`가 수동 배포 preflight다.** 작업트리 청결 + HEAD가 fetch한
  `origin/main`을 포함할 것을 요구한다. 배포를 차단하지는 않는다(스크립트 자체 고지).
- `admin.test.ts`가 하드코딩 관리자 이메일을 테스트로 고정하고 있다.
  직원 RBAC를 만들 때 이 테스트를 "고쳐서 통과"시키면 레거시 unlock 분리 요구를 위반한다.
- A01~A40 중 기존 테스트로 **완전히 덮인 것은 2개뿐**(A33 소유권, A34 완료 불변).
  이 둘이 "관리자를 만들며 절대 깨뜨리면 안 되는 선"이다.

## Evidence
- review: `CreamAI/logs/review/task-t04_admin-ops-t04-review.md` — Critical 0 / Major 4 / Minor 3, 전부 수용
- Codex 독립 검증: stale-guard 근거 (a)~(e) PASS, (f) 12/11 표기 오류만 지적. U23 수치 정확
- 실행: typecheck, `npm test` ×2, 명시목록 ×2, `check:*` ×16, `qa:all-services`

## 이 Task에서 내가 틀린 것 (재발 방지)
1. `qa:all-services`를 "LLM 호출 추정"으로 **실행하지 않고** NOT_RUN 처리했다.
   실제로는 정적 스크립트였다. → **추정으로 NOT_RUN 처리하지 말고 import를 먼저 본다.**
2. 실패 8개의 소속 파일을 추측으로 귀속했다(`daily-report`·`report-store`).
   실제는 `report-content-guards`·`report-generator`·`report-persistence`였다.
   → **파일 귀속은 러너 출력에서 직접 읽는다.**
3. stale guard를 표본 5개로 일반화했다. → **전수 확인.**
4. A32·A39를 "덮임"으로 과대 분류했다. 시나리오가 요구하는 UI·경로가 없었다.
   → **시나리오 문장을 끝까지 읽고 요구 요소별로 대조한다.**

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
- 비고: `admin.test.ts`가 고정하는 이메일 주소는 이 문서에 옮기지 않았다.
