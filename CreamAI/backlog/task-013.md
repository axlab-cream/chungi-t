---
task_id: task-013
status: done
active: false
owner: claude-pm
created: 2026-09-10
priority: P1
depends_on: [task-009]
resolves: [U16]
---
# task-013 — 결혼택일 RAG 렌더링·문맥 이식

## Purpose
TASK-009 병합에서 결혼택일은 **우리 구현을 정본**으로 삼았다. 그 결정 자체는 유지한다.
그러나 정본에 두 개의 결함이 남았고 둘 다 **고객이 받는 리포트 품질**에 직접 닿는다.

1. **RAG 검색 결과가 본문에 도달하지 않는다.** `buildWeddingReport`는 대분류마다
   자기 코퍼스 청크를 검색해 `assigned[groupIndex]`로 넘기는데, `sectionBody`가 그것을
   `_chunk`라는 미사용 매개변수로 받는다. **검색 비용은 쓰고 결과는 버린다.**
   (Codex TASK-009 리뷰 지적)
2. **계산한 사실이 LLM 문맥에 실리지 않는다.** `buildWeddingContext`가 고정 문구만 넘긴다.
   후보일 판정, 조건 수, 절기 달, 요일, 상대 명식, 상대 미입력 고지가 모두 빠져 있어
   **본문이 스스로 지어 쓸 여지가 남는다.** 병합 때 저쪽 구현과 함께 삭제된 테스트 3건이
   정확히 이 지점을 지키고 있었다.

## Scope
- Implement:
  - `sectionBody`가 배정된 청크의 뜻을 본문에 렌더 (`chunkMeaning` + `compact`)
  - 중복 방지: `chunkMeaning`/`compact`를 공용 모듈로 올리고 `newyear-service`도 그것을 쓴다
  - `buildWeddingContext(name, input, analysis?)` — 후보일 판정·최소 걸림 후보·예식 형식·
    가족 제약·상대 미입력 고지·상대 명식 블록을 문맥에 실음
  - 한자 독음 부착(`withReading`) — 검수기가 독음 없는 한자 단독 표기를 막는다
  - 삭제된 테스트 3건 이식 + **청크 미사용 회귀를 잡는 테스트 추가**
- Do not implement:
  - 결혼택일 카피 재작성 (우리 문장이 정본)
  - 다른 서비스의 RAG 렌더링 변경 (`newyear`는 공용 헬퍼 위임만)
  - `judgeCandidate` 계산 규칙 변경

## 근거 (코드 위치)
| 사실 | 위치 |
| --- | --- |
| 청크를 받고 버린다 | `src/day/wedding-service.ts:415` (`_chunk`), `:530` (호출) |
| 검색은 실제로 수행된다 | `src/day/wedding-service.ts` `assigned` — `retrieveCategoryOwnChunks` 2건 |
| 문맥이 고정 문구뿐 | `src/day/wedding-service.ts:484` |
| 프로젝트 렌더링 패턴 | `src/flow/newyear-service.ts:317-338` (`RAG_FIELD_LABEL`/`chunkMeaning`/`compact`) |
| 타입은 이미 준비됨 | `src/types/index.ts:242` `SajuReportContext.partner` |
| 삭제된 테스트 3건 | `f825d26:tests/unit/day-wedding-service.test.ts:165,190,197` |

## Success Criteria
- [x] `sectionBody`에 미사용 매개변수가 없다 (`_chunk`·`_analysis` 소멸, grep 0건)
- [x] 청크 뜻이 본문 문단에 실제로 나타난다 — **배선 제거 시 그 테스트만 실패함을 확인**
- [x] `buildWeddingContext`가 후보일 판정·요일·조건 수·절기 달을 문맥에 싣는다
- [x] 상대 미입력 시 "두 사람을 비교했다고 쓰지 마세요" 고지가 문맥에 있다
- [x] 상대 출생시각 미상이면 `partner.birthTimeKnown === false`
- [x] 문맥의 한자 2자 이상 연속에 한글 독음이 붙는다
- [x] `npm run typecheck` 0 오류, `npm test` **430 pass / 0 fail** (417 → 430)
- [x] Codex 리뷰 Critical 2건 반영, Major 2건 중 1건 반영·1건 근거로 반박
- [x] (추가) 같은 청크가 여러 대분류에 배정되지 않는다 — 근거 6건이 모두 다름
- [x] (추가) 상대 생년월일시 원본이 문맥에 실리지 않는다 — 개인정보 회귀 테스트

## Codex 리뷰 반영 (`CreamAI/logs/review/task-013_wedding-rag-context.md`)

### Critical 2건 — 반영
둘 다 **내가 만든 개인정보 노출**이다. `origin/main` 구현을 그대로 이식하면서
`partner.birth`(상대의 연·월·일·시·분·성별·달력)를 문맥에 실었다. 이 문맥은
리포트 payload 로 파일/DB/Supabase 에 저장되고 분석·조회 응답으로도 나간다.

→ **문맥에서 원본을 제거했다.** 본문 생성에 필요한 것은 계산 결과(명식 네 기둥·일간·
오행·십신·시각 확정 여부)뿐이고 그것은 그대로 남겼다. sanitize 로 막는 대신
**애초에 수집하지 않는 쪽**을 골랐다 — 최소수집이 사후 필터보다 안전하다.
회귀 테스트로 `partner.birth === undefined` 와 직렬화 문자열에 상대 생년월일시
흔적(`1988`, `"month":3`, `"day":11`, `14:30`)이 없음을 함께 확인한다.

### Major 1 (partner.pillars 독음) — **반박. 반영하지 않는다**
근거 두 가지다.
1. **검수기는 생성된 본문만 검사한다.** `src/report/interpretation-validation.ts:47`의
   한자 검사 대상은 `text`(해석문)이고 `context`가 아니다.
2. **`partner.pillars`를 한자 그대로 두는 것이 프로젝트 규약이다.** `love/again-service`,
   `love/mind-service`, `love/signal-service`, `match/couple-service`, `match/marry-service`
   가 모두 `${stem}${branch}` 형태로 넣는다. 결혼택일만 바꾸면 6개 서비스와 어긋난다.

모델이 명식을 그대로 옮겨 적을 위험은 **프로젝트 전체에 공통**이며 결혼택일 고유 문제가
아니다. 따라서 이 Task에서 한 서비스만 바꾸지 않고 **U27**로 올린다.
한편 모델이 실제로 베껴 쓸 가능성이 높은 산문(`concern`)에는 독음을 붙여 두었다.

### Major 2 (공용 절단 규칙의 신년 회귀) — 반영, 단 지적보다 넓게
Codex 는 개별 케이스(장문 첫 문장, `。`, 개행) 테스트를 제안했다.
그보다 **코퍼스 전수 불변식**을 넣었다 — 전 청크에 대해 말줄임표 부재, 한도 준수,
그리고 **실제로 잘린 경우에만** 문장 끝 종료를 요구한다.
`。`도 문장 경계에 추가했다.

실측(2026-09-10, 363청크): 출력 최대 **170자**, 170자 초과 **0건**,
문장 경계 없는 초과 청크 **0건**, `。` 사용 **0건**.
→ Codex 가 우려한 "한도보다 긴 전문 삽입" 경로는 현재 코퍼스에서 **도달 불가**다.
불변식 테스트는 코퍼스가 바뀌어 그 경로가 열리는 순간 실패한다.

불변식이 실제로 사례를 잡았다: `mr-001`은 원문에 마침표가 없다. 이것은 절단 문제가
아니므로 단정을 "잘린 경우"로 좁혔다. **처음 쓴 불변식이 너무 셌고, 코퍼스가 그것을
알려줬다.**

### Minor 3 (가짜 통과 여지) — 반영
`[참고 기준]` 마커만 보면 고정 문구를 박아도 통과한다는 지적이 맞다.
→ 근거 문자열이 **실제 코퍼스에서 온 것인지** `buildCorpusIndex()`와 대조한다.

### Minor 4 (topK 2→4 비용 설명) — 정정
own 경로는 이전에도 카테고리마다 240건을 회수한 뒤 slice 한다. 따라서 `topK` 변경으로
검색량이 늘어나는 것은 **own 청크가 없어 fallback 을 타는 경우뿐**이다(6→12건).
결혼택일은 자기 코퍼스가 있으므로 실질 비용 증가가 없다.

### Minor 1 (탐욕 배정) — 수용, 차단 아님
`WEDDING_TOC` 순서대로 미사용 청크를 선점하는 방식이고, 후보가 모두 소진되면
`found[0]`으로 중복을 허용한다. 현재 코퍼스에서는 6개 대분류 모두 서로 다른 근거를
받는다(테스트로 고정). 최대 매칭으로 바꾸는 것은 과잉이라 하지 않았다.

## Risks
- **문맥 확장이 프롬프트 길이를 늘린다.** 섹션 프롬프트가 토큰 한도에 걸리면 생성이 떨어진다
  → `compact`의 길이 제한(170자)을 유지하고 후보일은 입력한 개수만 싣는다
- **공용 헬퍼 추출이 `newyear` 동작을 바꿀 수 있다** → 동작을 그대로 옮기고 기존 테스트로 검증
- **한자 독음 미부착 위험**: 관계 설명 원문(`子丑合土: …`)에는 `土` 같은 오행 한자가 섞여
  있어 독음 표가 덮지 못할 수 있다 → 테스트로 실제 검출 후 표를 넓힌다

## Verification Steps
- `grep -c "_chunk\|_analysis" src/day/wedding-service.ts` → **0**
- 배선 제거 후 `검색한 근거가 본문에 실린다`만 실패 → 복원 (가짜 통과 방지 확인)
- `npm run typecheck` 0 오류 / `npm test` **430 pass**
- `check:wedding` `check:newyear` `check:polish` `check:service-contracts`
  `check:prompt-guide` PASS
- `npm run qa:all-services` → 20개 서비스 통과
- 실측: 근거 6건이 6개 대분류에 서로 다르게 배정됨

## 남긴 것 (이 Task 범위 밖)
- **U26**: `love_this_year`·`love_again` 등 다른 서비스는 여전히 `context.partner.birth`에
  상대 생년월일시를 담아 저장·반환한다(`src/server/app.ts:873-877`,
  `src/report/report-generator.ts:2059`). 결혼택일만 고쳤다. 전 서비스 정리는 별건이다.
- **U27**: `partner.pillars`를 한자 그대로 문맥에 넣는 규약. 모델이 베껴 쓰면 검수기에
  걸릴 수 있으나 6개 서비스 공통 사안이다.
