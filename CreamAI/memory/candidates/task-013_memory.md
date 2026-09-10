# ProjectOps Memory Candidate

task_id: task-013
date: 2026-09-10
case_type: failure (privacy_risk) + success (quality_gate)
failure_type: security_risk
success_pattern: quality_gate
problem: |
  병합 정본에 남은 두 결함을 고치는 작업이었다.
  (1) `sectionBody(groupId, frame, _analysis, name, _chunk)` — RAG 검색은 수행하는데
      결과를 **미사용 매개변수로 받아 버렸다.** 검색 비용만 쓰고 근거는 본문에 없었다.
  (2) 리포트 문맥이 고정 문구뿐이어서 계산해 둔 후보일 판정·요일·조건 수가 LLM에
      전달되지 않았다. 본문이 사실을 지어 쓸 여지가 있었다.

  그리고 **고치는 과정에서 내가 개인정보 노출을 새로 만들었다.**
  반대편 구현을 그대로 이식하면서 `context.partner.birth`에 상대의 연·월·일·시·분·
  성별·달력을 실었다. 이 문맥은 리포트 payload 로 저장되고 응답으로도 나간다.
solution: |
  **미사용 매개변수(`_` 접두사)는 죽은 배선의 신호다.** 문법적으로 합법이라
  타입체크·린트가 통과하고 테스트도 통과한다. 그래서 "비용은 쓰는데 결과는 버리는"
  상태가 조용히 유지된다. `_` 로 시작하는 매개변수를 보면 그 값이 어디서 오는지
  거슬러 올라가, **계산·검색 비용이 실제로 발생하는지** 확인한다.

  **배선 테스트는 반드시 음성 대조를 한다.** 배선을 끊고 그 테스트만 실패하는지 본다.
  통과만 보면 마커를 하드코딩해도 통과한다. 여기서는 한 걸음 더 가서
  **근거 문자열이 실제 코퍼스에서 왔는지** `buildCorpusIndex()`와 대조했다.

  **이식은 복사가 아니다.** 반대편 구현을 옮길 때 그 코드가 **어디로 흘러가는지**
  다시 확인한다. 같은 코드가 다른 저장·전송 경로에 놓이면 개인정보 등급이 달라진다.
  해법은 sanitize 가 아니라 **애초에 담지 않는 것**을 먼저 고른다(최소수집).
root_cause: |
  미사용 매개변수는 "나중에 쓸 자리"처럼 보여서 결함으로 읽히지 않는다.
  그리고 이식 작업은 "이미 검증된 코드"라는 인식 때문에 영향 경로 재확인을 건너뛴다.
why_it_worked: |
  코퍼스 전수 불변식을 쓴 것이 결정적이었다. Codex 는 개별 케이스 테스트를 제안했는데,
  전수 검사로 바꾸자 **내가 처음 쓴 불변식이 너무 세다는 것을 코퍼스가 반증했다**
  (`mr-001`은 원문에 마침표가 없다 — 절단 문제가 아니다).
  개별 케이스만 썼다면 그 사실을 못 봤고, 잘못된 규칙을 규칙으로 굳혔을 것이다.
reuse_condition: |
  다른 브랜치·구현의 코드를 이식할 때. 미사용 매개변수를 발견했을 때.
  RAG/검색 결과가 본문에 반영되는지 확인할 때.
do_not_use_when: |
  전수 불변식은 대상 집합이 작거나(수십 건 미만) 외부 API 호출을 수반하면 쓰지 않는다.
  이 경우 363건이 로컬 파일이라 전수가 싸다.
related_files:
  - src/day/wedding-service.ts
  - src/rag/knowledge-block.ts
  - src/flow/newyear-service.ts
  - tests/unit/rag-retriever.test.ts
  - tests/unit/day-wedding-service.test.ts
recommended_prompt: |
  "`_` 로 시작하는 매개변수를 찾아 그 값의 출처를 거슬러 올라가라. 계산이나 검색 비용이
   실제로 드는데 결과를 버리고 있다면 결함이다. 배선을 고친 뒤에는 배선을 끊어 그
   테스트만 실패하는지 확인하고, 렌더된 값이 실제 데이터 출처에서 왔는지 대조하라.
   다른 구현을 이식할 때는 그 데이터가 저장·전송되는 경로를 다시 확인하라."
recommended_command: |
  # 죽은 배선 후보
  grep -rn "(_[a-z][A-Za-z]*:" src --include=*.ts
  # 음성 대조 (배선 제거 → 그 테스트만 실패해야 한다)
  cp <file> /tmp/bak && <배선 제거> && npx tsx --test <test> ; cp /tmp/bak <file>
  # 렌더된 값의 출처 대조
  #   buildCorpusIndex() 결과에 그 문자열이 있는지 확인
  # 개인정보 경로 확인
  grep -rn "partner?\.birth\|partner\.birth" src --include=*.ts
revalidation_command: |
  npm test  → 430 pass 유지. `검색한 근거가 본문에 실린다`, `상대의 생년월일시 원본은
  문맥에 실리지 않는다`, `모든 청크의 근거 문장이 …` 세 건이 이 지식의 오라클이다.
expires_at: 2026-12-31
privacy_level: internal
should_promote_to_rag: true

## 리뷰 지적을 근거로 반박한 사례

Codex 가 `partner.pillars`의 한자에도 독음을 붙이라고 했다(Major). **반영하지 않았다.**

1. 검수기(`src/report/interpretation-validation.ts:47`)의 한자 검사 대상은 **생성된 본문**
   (`text`)이고 `context`가 아니다.
2. `partner.pillars`를 한자 그대로 넣는 것은 6개 서비스(`love/again`, `love/mind`,
   `love/signal`, `match/couple`, `match/marry`)의 공통 규약이다. 한 서비스만 바꾸면 어긋난다.

→ 위험 자체는 인정하되 **프로젝트 전역 사안(U27)** 으로 올렸다.
**리뷰 지적을 전부 수용하는 것이 항상 옳지는 않다.** 다만 반박은 코드 근거를 갖춰서 한다.

## 부수 발견 — 같은 청크가 여러 대분류에 배정된다

배선을 살리자마자 **같은 근거 문단이 3개 대분류에 반복**되는 것이 드러났다.
검색을 대분류마다 상위 2건 받아 `[0]`만 쓰고 있었기 때문이다.
상위 4건을 받아 **아직 쓰지 않은 청크를 먼저 고르도록** 바꾸자 6개 대분류가 서로 다른
근거를 받고, 각 근거가 그 대분류 주제에 실제로 맞아떨어졌다.

**교훈: 죽은 배선을 살리면 그 뒤에 숨어 있던 품질 문제가 함께 드러난다.**
배선 복구를 "한 줄 수정"으로 끝내지 말고 산출물을 눈으로 확인한다.

## Evidence
- `npm test` 417 → **430 pass / 0 fail**, typecheck 0 오류
- 음성 대조: 배선 제거 시 `검색한 근거가 본문에 실린다`만 실패 → 복원
- 코퍼스 실측(363청크): 출력 최대 170자, 170자 초과 0건, 문장경계 없는 초과 0건, `。` 0건
- `check:wedding` `check:newyear` `check:polish` `check:service-contracts`
  `check:prompt-guide` PASS, `qa:all-services` 20/20
- Codex: Critical 2 / Major 2 / Minor 4 → Critical 2건 반영, Major 1건 반영·1건 근거 반박
  (`CreamAI/logs/review/task-013_wedding-rag-context.md`)

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
