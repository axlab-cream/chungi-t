---
task_id: task-019
status: done
active: false
owner: claude-pm
created: 2026-09-10
priority: P1
depends_on: [task-013]
resolves: [U26]
---
# task-019 — 상대의 생년월일시를 리포트 문맥에서 걷어낸다

## Purpose
TASK-013에서 결혼택일 하나만 고쳤다. **나머지 6개 서비스는 여전히
`context.partner.birth`에 상대의 연·월·일·시·분·성별·달력을 담는다.**
이 문맥은 리포트 payload 로 파일/DB/Supabase 에 저장되고 분석·조회 응답으로도 나간다.

상대는 **이 서비스의 사용자가 아니다.** 동의 절차도, 삭제 요청 창구도 없다.
본문 생성에 필요한 것은 계산 결과(명식·일간·오행·십신·시각 확정 여부)뿐이며
그것은 이미 같은 블록에 들어 있다. 원본은 **수집할 이유가 없다.**

## 실측 범위 (2026-09-10)

### A. 스스로 계산할 수 있어 원본이 불필요한 서비스 — 5개
`input.partnerBirth`를 이미 갖고 있으므로 문맥의 `birth`는 중복이다.
| 위치 | 서비스 |
| --- | --- |
| `src/love/again-service.ts:156` | 다시 만날까 |
| `src/love/mind-service.ts:179` | 그 사람 마음 |
| `src/love/signal-service.ts:260` | 연애 신호 |
| `src/match/couple-service.ts:339` | 궁합 |
| `src/match/marry-service.ts:303` | 결혼 궁합 |

### B. 원본이 전송 수단인 서비스 — 1개
`love_this_year`만 브라우저가 상대 정보를 보낸다.
- `parseOptionalPartnerContext`(`app.ts:820`)가 요청 본문에서 `partner.birth`를 읽는다
  (이 파서는 `app.ts:917`에서 **love_this_year 전용**으로만 쓰인다)
- `enrichReportContext`(`app.ts:872`)가 그 값으로 명식을 계산하는데,
  `...context.partner` 로 펼쳐서 **원본을 그대로 남긴다**
→ 계산 후 원본을 버려야 한다.

### C. 이미 저장된 과거 기록
쓰기 경로를 막아도 **기존 레코드에는 원본이 남아 있고 조회 응답으로 나간다.**
응답 경로: `app.ts:230`(specializedAnalyzeResponse), `1210`·`1947`(clientReportContext),
`1987`·`1991`·`2586`(`record.context` 원본 반환)
→ 읽기 경로에서도 걸러야 과거 기록이 덮인다.

### 원본을 실제로 읽는 곳 (제거 안전성 근거)
| 위치 | 용도 | 영향 |
| --- | --- | --- |
| `app.ts:873,877` | love_this_year 명식 계산 | B에서 계산 후 버리므로 유지 |
| `report-generator.ts:2059` | `birthTimeKnown=false`일 때 시·분 마스킹 | **과거 기록 방어로 남긴다** |
그 외 읽는 곳은 없다.

## Scope
- Implement:
  - A: 5개 서비스의 partner 블록에서 `birth` 제거
  - B: `enrichReportContext`가 계산 후 `birth`를 버림
  - C: 응답 경로 공용 sanitize (`publicReportContext`) — 과거 기록까지 덮음
  - 회귀 테스트: 서비스별 문맥에 원본 흔적이 없음 + 응답 sanitize 동작
- Do not implement:
  - **이미 저장된 레코드의 소급 삭제/마이그레이션** — 데이터 삭제는 사용자 승인 사안
  - `report-generator.ts:2059` 마스킹 제거 (과거 기록 방어로 필요)
  - 상대 정보 수집 UI 변경

## 사용자 결정 (2026-09-10)
1. **`love_this_year`도 저장·응답에서 제거한다** (개인정보 우선).
   저장된 해석을 다시 열 때 상대 입력 폼이 비게 되는 것은 감수한다.
2. **이미 저장된 과거 레코드는 삭제하지 않고 응답에서만 가린다.**

## Success Criteria
- [x] A·B 어디에서도 `context.partner.birth`를 새로 쓰지 않는다
- [x] `love_this_year`의 명식 계산은 그대로 동작한다 (pillars·dayMaster 유지)
- [x] 응답에 실리는 context 에 `partner.birth`가 없다 (과거 기록 포함)
- [x] `npm run typecheck` 0 오류, `npm test` **446 pass / 0 fail** (430 → 446)
- [x] Codex 리뷰 **Critical 2건 반영** (내가 놓친 유출 경로 2개)
- [x] (추가) 모델 프롬프트 경로도 막음 — `featureJson.userContext`, 저장된 상담

## Codex 리뷰 (`CreamAI/logs/review/task-019_partner-birth-privacy.md`)

### Critical 1 — `featureJson.userContext` 로 새어 나갔다
`sectionPrompt`의 `context` 필드만 가렸는데, 같은 프롬프트의
`featureJson: groundedReportFeatures(analysis, context)` 가 `buildSajuFeatureJson`
(`src/saju/analyzer.ts:488`)에서 문맥을 **`userContext` 로 통째로** 싣는다.
→ 과거 레코드에서 섹션을 재생성하면(`app.ts:2665`·`2757` → `report-queue.ts:55`)
상대의 생년월일시가 외부 모델로 나갔다.

**호출자에서 막는 것으로 시작했는데 그것이 틀렸다.** 테스트가
`groundedReportFeatures`를 직접 호출하자 여전히 실패했다.
→ **함수 자신이 걷어내도록** 고쳤다. 호출자만 고치면 다음 호출자가 다시 샌다.

### Critical 2 — 저장된 상담이 부모 문맥을 복사·저장·전송했다
`saved-chat.ts:141`이 `parent.context`에서 `savedChat`만 걸러 `baseContext`로 썼다.
그 값이 (a) 시스템 메시지로 직렬화되고 (b) 새 상담 레코드로 **저장**된다.
`/api/chat`은 `parentReportId`를 받으므로 과거 레코드의 원본이 다시 퍼졌다.
→ `publicReportContext(parent.context)` 로 교체.

### Minor (프런트엔드) — 기록만 하고 고치지 않았다
`사주/cmdg/index.html:4448-4457`이 정리된 레코드를 복원하면 `partnerMode='known'`인데
상대 생년월일·성별이 공란이 되어, 수정 없이 제출하면 검증 오류가 난다(런타임 오류는 없다).
**다만 이 경로는 레거시다.** cmdg 의 love_this_year 제출은 `/api/saju/analyze`로 가고
그 라우트는 love_this_year 를 400 으로 막는다(`app.ts:2511-2513`).
라이브 경로는 `사주/js/thisyear-service.js` → `/api/love/this-year/analyze` 이며
그 서비스는 상대 블록을 만들지 않는다.
→ 이미 동작하지 않는 경로의 표시 문제라 이 Task 에서 프런트엔드를 바꾸지 않았다. **U28**로 올린다.

### Codex 가 확인해 준 것 (OK)
- `publicPartnerContext`는 얕은 복사 후 `delete` 하므로 입력을 변형하지 않고 타입 안전하다
- `parseOptionalPartnerContext`는 `/api/saju/analyze` 에서만 도달하고 그 라우트가
  love_this_year 를 즉시 400 으로 막는다 → **저장·응답·생성 모두에서 dead path** 라는
  내 판정이 맞다

## Risks
- **과거 기록은 여전히 저장소에 남는다.** 응답에서 가려도 DB 안에는 있다.
  소급 정리는 이 Task 범위 밖이며 사용자 결정이 필요하다 → 브리핑에 명시
- **응답 sanitize 가 프런트엔드를 깨뜨릴 수 있다.** 브라우저가 `partner.birth`를 다시
  화면에 쓰거나 재요청에 실어 보내면 동작이 바뀐다 → 정적 파일에서 사용 여부를 확인해야 한다
- `love_this_year`는 상대 정보를 **사용자가 직접 입력**한다. 계산 후 버리면 새로고침 시
  입력값을 다시 채워 주지 못할 수 있다 → 프런트엔드 확인 필요

## Verification Steps
- `grep -rn "partner?\.birth\|partner\.birth" src --include=*.ts` → 남은 3곳은
  요청 파싱(`app.ts:833`)과 love_this_year 명식 계산(`874`·`878`, 계산 후 버림)뿐
- 서비스별 문맥 직렬화에 상대 생년월일시 흔적 **0건** (6개 서비스)
- `npm run typecheck` 0 오류 / `npm test` **446 pass**
- `check:*` 15/15 PASS, `qa:all-services` 20/20
- **음성 대조 3건** — 되돌리면 해당 테스트만 실패함을 확인 후 복원:
  (a) 궁합 서비스에 `birth` 복원 → 유닛 테스트 실패
  (b) `/api/report/:id` sanitize 제거 → 통합 테스트 실패
  (c) 저장된 상담 sanitize 제거 → 통합 테스트 실패

## 남긴 것
- **저장소의 과거 레코드는 그대로다.** 응답·프롬프트에서만 가린다(사용자 결정 2).
  소급 삭제는 별건이며 영향 레코드 수 집계가 선행돼야 한다
- **U28**: cmdg 의 레거시 love_this_year 분기 (400 으로 막힌 경로 + 복원 표시 문제)
