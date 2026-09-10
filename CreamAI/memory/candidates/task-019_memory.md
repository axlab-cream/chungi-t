# ProjectOps Memory Candidate

task_id: task-019
date: 2026-09-10
case_type: failure (privacy_risk) + success (quality_gate)
failure_type: security_risk
success_pattern: quality_gate
problem: |
  리포트 문맥(`context.partner.birth`)에 **상대의 생년월일시**가 들어 있었다.
  상대는 이 서비스의 사용자가 아니다 — 동의 절차도 삭제 요청 창구도 없다.
  그 문맥은 리포트 payload 로 저장되고 API 응답으로 나가고 LLM 프롬프트로도 갔다.
  6개 서비스가 같은 형태였다.

  task-013 에서 결혼택일 하나만 고쳤고, 나머지를 정리하는 것이 이 Task 였다.
  **그런데 정리하면서 두 경로를 놓쳤고 Codex 가 잡았다.**
solution: |
  **개인정보를 걷어낼 때는 "필드를 지우는 곳"이 아니라 "데이터가 나가는 경계"를 센다.**
  이 프로젝트에서 경계는 네 종류였다.

  1. **쓰기(저장)** — 서비스가 문맥을 만드는 지점 6곳
  2. **응답** — 7곳 (`specializedAnalyzeResponse`, `clientReportContext`,
     `birthStateFromRecord`, 그리고 `context: record.context` 를 그대로 싣는 4곳)
  3. **LLM 프롬프트** — `sectionPrompt` 의 `context` 필드 **그리고**
     `featureJson`(문맥을 `userContext` 로 통째로 싣는다). 여기를 놓쳤다.
  4. **파생 저장** — 저장된 상담이 부모 문맥을 복사해 **새 레코드로 저장하고** 시스템
     메시지로도 보낸다. 여기도 놓쳤다.

  그리고 **호출자에서 막지 말고 함수 자신이 막게 한다.**
  `sectionPrompt` 입구에서 sanitize 했는데, 테스트가 `groundedReportFeatures` 를
  직접 호출하자 여전히 새었다. 호출자만 고치면 **다음 호출자가 다시 샌다.**
root_cause: |
  같은 데이터가 여러 경로로 흐를 때, 한 경로를 막으면 "고쳤다"는 감각이 생긴다.
  특히 프롬프트는 필드가 두 번(context, featureJson) 실리는데 코드만 보면 한 번처럼 보인다.
  파생 저장(저장된 상담)은 원본 서비스 코드에서 멀리 떨어져 있어 시야에 들어오지 않는다.
why_it_worked: |
  경계마다 **음성 대조**를 했다. 세 경로의 sanitize 를 각각 되돌려 해당 테스트만
  실패하는지 확인했다. 그리고 저장된 상담 테스트는 **저장된 레코드 안의 `savedChat.messages`**
  를 검사했다 — 모델로 나가는 메시지가 레코드에 그대로 남으므로 LLM 을 목킹하지 않고
  실제 프롬프트를 검사할 수 있었다.
reuse_condition: |
  개인정보·비밀값을 데이터 구조에서 걷어낼 때. 특히 그 구조가 저장·응답·외부 API 로
  동시에 흐를 때.
do_not_use_when: |
  데이터가 단일 경로로만 흐르는 것이 코드로 증명될 때. 그때는 경계 목록이 과잉이다.
related_files:
  - src/report/public-context.ts
  - src/report/report-generator.ts
  - src/report/saved-chat.ts
  - tests/unit/partner-privacy.test.ts
  - tests/unit/partner-privacy-integration.test.ts
recommended_prompt: |
  "개인정보를 걷어낼 때 필드를 지운 곳이 아니라 데이터가 나가는 경계를 세라 —
   저장, 응답, 외부 모델 프롬프트, 그리고 그 데이터를 복사해 다시 저장하는 파생 경로.
   sanitize 는 호출자가 아니라 그 데이터를 내보내는 함수 자신이 하게 하라.
   경계마다 되돌려 보고 해당 테스트만 실패하는지 확인하라."
recommended_command: |
  # 경계 세기
  grep -rn "<민감필드>" src --include=*.ts            # 쓰는 곳
  grep -n "context: record.context\|res.json" src/server/app.ts   # 응답
  grep -rn "JSON.stringify(<문맥>)" src --include=*.ts            # 프롬프트 직렬화
  grep -rn "parent.context\|\.context)" src --include=*.ts        # 파생 저장
  # 프롬프트를 목킹 없이 검사 — 저장된 메시지를 읽는다
  #   record.context.savedChat.messages 에 실제 전송 메시지가 남는다
revalidation_command: |
  npm test → 446 pass 유지. `partner-privacy.test.ts`(13건)와
  `partner-privacy-integration.test.ts`(3건)가 이 지식의 오라클이다.
expires_at: 2026-12-31
privacy_level: internal
should_promote_to_rag: true

## dead path 판정법

`parseOptionalPartnerContext` 가 살아 있는 유입구인지 확인하는 데 세 단계를 썼다.
1. 호출자를 전수로 찾는다 → `parseReportContext` 하나
2. 그 호출자의 호출자를 찾는다 → `/api/saju/analyze` 하나
3. **그 라우트가 해당 조건을 어떻게 처리하는지 읽는다** → `love_this_year` 면 즉시 400

3단계를 빼면 "코드가 있으니 살아 있다"고 판단한다. Codex 도 이 판정에 동의했다.
**호출 그래프만 보지 말고 그 경로의 가드까지 읽어야 dead 인지 알 수 있다.**

## 제품 판단은 사용자에게 넘겼다

`love_this_year` 의 상대 생년월일시는 **저장된 해석을 다시 열 때 입력 폼을 복원하는
기능**(`birthStateFromRecord` 의 love_this_year 분기)이었다. 제거하면 그 폼이 빈다.
개인정보와 UX 가 맞바꿈 관계여서 **선택지를 만들어 사용자에게 물었다.**
결정: 제거(개인정보 우선) + 과거 레코드는 삭제하지 않고 응답에서만 가림.

**맞바꿈이 있는 결정을 혼자 내리지 않는다.** 대신 각 선택지의 대가를 구체적으로 적어 준다.

## Evidence
- `npm test` 430 → **446 pass / 0 fail**, typecheck 0 오류
- 경계 처리: 쓰기 6곳, 응답 7곳, 프롬프트 2곳(`context`·`featureJson`), 파생 저장 1곳
- 음성 대조 3건 전부 확인 후 복원
- `check:*` 15/15, `qa:all-services` 20/20
- Codex: Critical 2 / Major 0 / Minor 2 → **Critical 2건 반영**, Minor 1건은 레거시 경로라 기록
  (`CreamAI/logs/review/task-019_partner-birth-privacy.md`)

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
