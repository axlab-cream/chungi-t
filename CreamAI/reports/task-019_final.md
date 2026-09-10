# 결론

**상대(파트너)의 생년월일시를 리포트 문맥에서 걷어냈다.** 상대는 이 서비스의 사용자가
아니어서 동의 절차도 삭제 요청 창구도 없는데, 그 데이터가 저장·API 응답·LLM 프롬프트로
흐르고 있었다. 6개 서비스 전부와 네 종류의 경계를 처리했다.

**그리고 정리하면서 두 경로를 놓쳤고 Codex 가 잡았다** — `featureJson.userContext` 와
저장된 상담. 둘 다 반영했다.

# 근거

## 처리한 경계 — 데이터가 나가는 곳을 센다

| 경계 | 지점 | 처리 |
| --- | --- | --- |
| 쓰기(저장) | `love/again`, `love/mind`, `love/signal`, `match/couple`, `match/marry` | partner 블록에서 `birth` 제거 |
| 쓰기(저장) | `enrichReportContext`(`app.ts:878`) | 원본으로 명식 계산 후 버림 |
| 응답 | `app.ts` 231·1183·1193·1991·1995·2577·2590 | `publicReportContext` 통과 |
| LLM 프롬프트 | `sectionPrompt`의 `context` | 입구에서 sanitize |
| LLM 프롬프트 | **`featureJson`** (`groundedReportFeatures` → `buildSajuFeatureJson`의 `userContext`) | **Codex Critical 1.** 함수 자신이 sanitize |
| 파생 저장 | **저장된 상담**(`saved-chat.ts:141`) — 부모 문맥을 복사해 새 레코드로 저장 + 시스템 메시지로 전송 | **Codex Critical 2.** `publicReportContext(parent.context)` |

남은 `partner.birth` 독자는 3곳뿐이다: 요청 파싱(`app.ts:833`)과 love_this_year
명식 계산(`874`·`878`, 계산 후 버림).

## 검증

| 항목 | 결과 |
| --- | --- |
| `npm test` | **446 pass / 0 fail** (변경 전 430) |
| `npm run typecheck` | 0 오류 |
| 음성 대조 3건 | 궁합 서비스 / `/api/report/:id` / 저장된 상담 — 각각 되돌려 해당 테스트만 실패함을 확인 후 복원 |
| `check:*` | **15/15 PASS** |
| `qa:all-services` | 20/20 |
| ProjectOps test 하네스 | `npm test` exit 0 (task-013 에서 고친 하네스로 실제 실행됨) |

## 사용자 결정 2건
1. `love_this_year`도 저장·응답에서 제거 — 저장된 해석 재열람 시 상대 입력 폼이 비는 것을 감수
2. 과거 레코드는 삭제하지 않고 응답에서만 가림

# 리스크

1. **저장소의 과거 레코드에는 원본이 그대로 남아 있다.** 응답·프롬프트에서만 가린다.
   되돌리기는 코드 한 줄이지만, **DB 안에는 여전히 있다.** 소급 정리를 하려면 영향
   레코드 수를 먼저 세야 한다 (별건).
2. **U28 — cmdg 의 레거시 love_this_year 분기.** 정리된 레코드를 복원하면
   `partnerMode='known'`인데 상대 생년월일·성별이 공란이 되어, 수정 없이 제출하면
   검증 오류가 난다(런타임 오류는 없다). **다만 그 제출 경로 자체가 이미 400 으로 막혀 있다**
   (`app.ts:2511-2513`). 라이브 경로는 `사주/js/thisyear-service.js`다.
   이미 동작하지 않는 경로의 표시 문제라 프런트엔드를 바꾸지 않았다.
3. **`publicReportContext`는 `savedChat`도 제거한다.** 프롬프트·featureJson 에서
   내부 저장 구조가 빠지는 것은 개선이지만, 문맥 형태 변화다.

# 다음 행동

1. 이 변경분 커밋 + `main` push (연동 배포 자동).
2. 다음 Task 후보: **TASK-011**(브랜드 표기 통일), **TASK-005**(Actions CI 전용),
   **U28**(cmdg 레거시 분기 정리), 과거 레코드 소급 정리 판단.

# 인사이트

**개인정보를 걷어낼 때는 "필드를 지우는 곳"이 아니라 "데이터가 나가는 경계"를 센다.**
경계는 네 종류였다 — 저장, 응답, 외부 모델 프롬프트, 그리고 **그 데이터를 복사해 다시
저장하는 파생 경로.** 나는 앞의 둘을 세고 고쳤다는 감각을 가졌고, 뒤의 둘을 놓쳤다.
프롬프트는 문맥이 두 번(`context`, `featureJson`) 실리는데 코드만 보면 한 번처럼 보인다.

**sanitize 는 호출자가 아니라 데이터를 내보내는 함수 자신이 해야 한다.**
`sectionPrompt` 입구에서 막았는데 테스트가 `groundedReportFeatures`를 직접 호출하자
여전히 새었다. 호출자만 고치면 다음 호출자가 다시 샌다.

**프롬프트는 목킹 없이 검사할 수 있었다.** 저장된 상담은 모델로 보낼 메시지를 레코드에
그대로 저장한다(`savedChat.messages`). 그것을 읽으면 실제 전송 내용을 검사할 수 있다.
**검사하려는 값이 이미 어딘가에 저장돼 있는지 먼저 찾아본다.**

**dead path 판정은 호출 그래프만으로 안 된다.** `parseOptionalPartnerContext`가 살아
있는지 확인하려고 호출자를 따라갔고, 마지막에 **그 라우트의 가드를 읽어서야**
`love_this_year`는 400 으로 막힌다는 것을 알았다. 가드를 읽지 않으면 "코드가 있으니
살아 있다"고 판단한다.

**맞바꿈이 있는 결정은 혼자 내리지 않았다.** love_this_year 의 상대 정보는 입력 폼 복원
기능이었다. 개인정보와 UX 가 맞바꿈이어서 각 선택지의 대가를 적어 사용자에게 물었다.

## ProjectOps 기록
- task_id: task-019 (done)
- tests: `npm test` **446 pass / 0 fail**, typecheck 0 오류, 음성 대조 3건, `check:*` 15/15
- review: `CreamAI/logs/review/task-019_partner-birth-privacy.md` — Critical 2 / Major 0 / Minor 2
  → **Critical 2건 반영**, Minor 1건은 레거시 경로라 U28 로 기록, Minor 1건은 OK 확인
- memory_candidate: `CreamAI/memory/candidates/task-019_memory.md`
- reusable_rule: 개인정보를 걷어낼 때 경계를 센다 — 저장·응답·외부 프롬프트·파생 저장.
  sanitize 는 내보내는 함수 자신이 한다. 경계마다 되돌려 음성 대조한다.
  dead path 판정은 호출 그래프 + 그 경로의 가드까지 읽는다.
- repeated_failure_prevented: task-013 memory("이식은 복사가 아니다 — 저장·전송 경로를
  다시 확인한다")를 적용해 이번엔 경계를 목록화하고 시작했다. 그래도 프롬프트의 두 번째
  필드와 파생 저장을 놓쳤다 → **경계 목록에 그 두 종류를 추가해 memory 로 승격한다.**
