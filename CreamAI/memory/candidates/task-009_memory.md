# ProjectOps Memory Candidate

task_id: task-009
date: 2026-09-10
case_type: success (reliability_improve)
failure_type: null
success_pattern: reliability_improve
problem: |
  오래 갈라진 두 브랜치를 병합할 때, 충돌 목록만 보고는 "어느 쪽을 택할지"를 결정할 수 없다.
  이 프로젝트는 24건 충돌이었고, 그중 11건이 같은 기능(결혼택일)을 양쪽이 병렬로 만든
  add/add였다. 충돌 마커를 순서대로 고르는 방식으로는 한쪽의 정확성 가드나
  다른 쪽의 표현 개선이 조용히 사라진다. 게다가 결정 하나(브랜드 표기)가
  5개 파일의 해소 방향을 바꾸는데, 그 결정을 기다리는 동안 저장소를 MERGING 상태로
  둘 수는 없다.
solution: |
  **"병합해서 확인"이 아니라 "병합 시도로 정찰하고, 되돌린 뒤 계획을 세운다."**

  1. 사전 안전: 복구 지점 브랜치 생성. 그리고 **미추적 파일과 incoming 파일의 교집합**을 먼저 확인한다
     (`git diff --name-only HEAD..origin/main` ∩ `git status --porcelain | grep '^??'`).
     교집합이 0이면 병합이 미커밋 작업을 덮어쓰지 않는다.
  2. `git merge --no-commit --no-ff`로 시도해 충돌 전체를 실제로 만들어 본다.
  3. **병합 상태에서만 볼 수 있는 것을 수집한다**: `git show :2:<file>`(ours),
     `git show :3:<file>`(theirs). 두 버전의 선언 목록·심볼 존재를 대조하면
     "어느 쪽이 상위집합인가"를 판정할 수 있다.
  4. 파일을 그룹으로 묶어 방침을 정한다: 자동 판정(근거 확정) / 우리 쪽 / 저쪽 /
     저쪽 기준+이식 / 결정 필요.
  5. **결정이 필요한 항목이 남으면 abort하고 계획서를 낸다.** 계획서에는 파일별 방침과
     근거, 그리고 결정 선택지를 적는다. 승인 후 한 번에 실행한다.
root_cause: |
  브랜치가 갈린 채 양쪽이 같은 기능을 만들면, 병합은 텍스트 문제가 아니라 **제품 결정**이 된다.
  결정 항목과 기계적 항목을 분리하지 않으면 둘 다 잘못 처리된다.
why_it_worked: |
  `git show :2:`/`:3:`로 두 버전의 **선언 목록을 나란히** 뽑은 것이 결정적이었다.
  줄 수만 보면 THEIRS(727)가 OURS(597)보다 크니 THEIRS를 택하기 쉽지만,
  선언 대조로 **OURS에만 있는 정확성 가드**(`birthTimeKnown`을 판정 함수까지 전달)를 발견했다.
  그 가드가 없으면 출생시간 미상이 확정 판정으로 둔갑한다 — 판매 중인 서비스의 오답이다.
  결론이 "THEIRS 채택"에서 "THEIRS 기준 + 가드 이식"으로 바뀌었다.
reuse_condition: |
  merge base가 오래된 브랜치를 병합할 때. 특히 add/add 충돌이 있을 때
  (= 양쪽이 같은 파일을 각자 만들었다는 신호).
do_not_use_when: |
  충돌이 없거나 한쪽이 명백히 다른 쪽의 조상일 때. 그때는 그냥 병합한다.
related_files:
  - docs/admin-ops/TASK-009-merge-plan.md
  - CreamAI/backlog/task-009.md
  - src/day/wedding-service.ts
  - src/server/app.ts
  - 사주/privacy.html
recommended_prompt: |
  "병합 전에 (1) 복구 지점 브랜치를 만들고 (2) 미추적 파일과 incoming의 교집합을 확인하고
   (3) --no-commit으로 시도해 충돌을 만든 뒤 (4) 각 충돌 파일의 :2:/:3: 선언 목록을 대조해
   상위집합 여부를 판정하고 (5) 결정이 필요한 항목이 남으면 abort하고 계획서를 내라.
   줄 수가 큰 쪽을 상위집합으로 가정하지 마라."
recommended_command: |
  git branch backup/pre-merge-<date> HEAD
  comm -12 <(git diff --name-only HEAD..origin/main|sort) <(git status --porcelain|grep '^??'|sed 's/^?? //'|sort)
  git merge origin/main --no-commit --no-ff
  git diff --name-only --diff-filter=U
  git show :2:<file> | grep -nE "^(export )?(const|function|interface|type) "
  git show :3:<file> | grep -nE "^(export )?(const|function|interface|type) "
  git merge --abort
revalidation_command: |
  git rev-parse HEAD → dac38355b5ef4bb5e91778fdcf458873fc63f29e 이면 계획서가 아직 유효.
  git rev-list --left-right --count origin/main...HEAD → 20 10 이면 분기 상태 동일.
expires_at: TASK-009 병합 완료 시점 (또는 origin/main이 갱신되는 시점)
privacy_level: internal
should_promote_to_rag: true

## 이 프로젝트의 병합 결정 (재사용)

| 충돌 그룹 | 방침 | 결정 근거 |
| --- | --- | --- |
| `data/corpus/registry.json` | 어느 쪽이든 | packs 28개 id 완전 동일 — 텍스트 배치 차이뿐 |
| `src/server/app.ts` payment config | **우리 필터 + 저쪽 문구** | 우리에만 판매 게이트 필터, 저쪽에만 고객용 문구. 결합이 최적 |
| 정책 페이지 5건 | **우리 쪽** | 우리 nav가 `/about`·`/faq`를 가리키고 두 페이지는 우리 브랜치에만 존재. 저쪽 채택 시 살아 있는 링크가 사라진다 |
| 결혼택일 11건 | **저쪽 기준 + `birthTimeKnown` 이식** | 저쪽은 RAG 정제·카피 가독성·공용 verified reader 연결이 앞서고, 우리만 출생시간 미상 오판 방지 가드를 가진다 |
| `couple 02 입력`, `portal-newyear` 테스트 | 저쪽 | 모바일 프레임 정합·카드 live 전환이 저쪽 의도 |
| 브랜드 표기 | **사용자 결정** | 양쪽이 반대로 결정했고 둘 다 명시적 커밋. 우리가 더 최신이며 현재 운영 표기 |

## 부수 발견 — 운영 정보 노출

`GET /api/payment/config`는 무인증 엔드포인트이고 `setupMessage`에
**내부 환경변수 이름을 담아 고객에게 보낸다**:
`"… 남은 설정: 이니시스 MID·SignKey (INICIS_MID, INICIS_SIGNKEY)."`

`origin/main`의 `aca0bf3 fix(chrome): … stop showing env vars at checkout`이
`PAYMENT_UNAVAILABLE_NOTICE`로 교체해 이미 해소했다.
교훈: **설정 진단 메시지를 고객 응답에 그대로 넣지 않는다.**
운영자용 상세 메시지와 고객용 문구를 분리한다.

## Evidence
- `git merge --abort` 후 복원 검증: HEAD 불변, 충돌 0, dirty 31(시도 전과 동일), 작업물 전부 보존
- 사전 충돌 검사: 미추적 29 ∩ incoming 216 = 0
- 선언 대조: `src/day/wedding-service.ts` OURS 597줄 / THEIRS 727줄
- 운영 실측: `curl https://umsh.kr/api/payment/config`

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
- 비고: 노출되는 것은 변수 **이름**이며 값이 아니다. 값은 이 문서에 없다.
