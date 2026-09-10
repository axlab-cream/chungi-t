# Review Report - task-013 결혼택일 RAG 렌더링·문맥 이식

## 1. Scope

- Task id: task-013
- Reviewed files: `src/rag/knowledge-block.ts`, `src/flow/newyear-service.ts`, `src/day/wedding-service.ts`, `src/server/app.ts`, `tests/unit/day-wedding-service.test.ts`, `tests/unit/rag-retriever.test.ts`, related report storage/API/validation code and original `f825d26` tests
- Review time: 2026-09-10T08:01:17Z

## 2. Verdict

- Changes requested
- Summary: 검색 근거의 실제 본문 연결과 후보일 사실의 `concern` 이식은 확인됐고, 삭제됐던 3개 테스트의 핵심 의도도 보존됐다. 다만 새 `partner.birth` 전체가 영속 저장되고 클라이언트 응답으로 반환되며, 파트너 명식의 한자가 독음 없이 LLM 문맥에 남는다.

## 3. Critical Issues

- [src/day/wedding-service.ts:560, src/report/report-store.ts:607-622, src/report/report-store.ts:529-535, src/server/app.ts:2218-2227] Issue: 새 `context.partner.birth`에 상대의 연·월·일·시·분·성별·달력 정보가 그대로 들어가며, 리포트 payload 전체로 파일/DB/Supabase에 저장된다.
- Risk: 상대방의 생년월일시라는 민감 개인정보가 이전보다 장기 보관 범위에 새로 포함된다. 리포트 식별자와 함께 저장되므로 삭제·보존 정책 및 상대 정보 제공 동의가 없으면 개인정보 최소수집 원칙에 맞지 않는다.
- Recommendation: LLM에 필요한 계산 결과(사주 네 기둥, 일간, 시간 확정 여부)만 `partner`에 보관하고 원본 `partner.birth`는 제거하거나, 별도 암호화·보존기간·삭제 경로와 명시적 동의를 구현하라.

- [src/server/app.ts:215-231, src/server/app.ts:2580-2588, src/server/app.ts:1188-1190] Issue: 저장된 `context`는 `savedChat`만 제외하고 그대로 응답된다. 따라서 `partner.birth`가 결혼택일 분석 응답 및 `/api/report/:id` 응답의 `context`에 포함된다.
- Risk: 인증된 본인에게 반환되는 흐름인 것은 확인됐지만, 상대 개인정보가 브라우저 상태·네트워크 응답·클라이언트 오류 로그에 불필요하게 노출된다.
- Recommendation: `clientReportContext`에서 `partner.birth`를 제거하는 전용 sanitize 처리를 추가하고, 결혼택일 API 응답도 같은 공개용 context만 사용하라.

## 4. Major Issues

- [src/day/wedding-service.ts:563-568] Issue: `withReading`은 `concern`의 후보일·관계 설명에만 적용되고, LLM 문맥의 `partner.pillars`는 `己巳` 등 원 한자로 보관된다.
- Risk: 주석의 “문맥의 한자에 한글 독음 부착”이라는 목적과 달리, 모델이 `partner.pillars`를 그대로 복사하면 `reviewInterpretation`의 독음 없는 한자 검사에 걸려 생성 재시도 또는 실패가 발생할 수 있다.
- Recommendation: `partner.pillars`에도 `withReading`을 적용하거나, 프롬프트 전용 표시 필드와 계산용 원시 필드를 분리하고 원시 필드는 모델 문맥에서 제외하라. 테스트는 `JSON.stringify(context.partner)` 전체의 연속 한자열도 독음 표기를 갖는지 검증해야 한다.

- [src/flow/newyear-service.ts:360, src/rag/knowledge-block.ts:130-145, tests/unit/flow-newyear-service.test.ts:78-96] Issue: 공용 helper의 절단 규칙 변경은 신년운세 본문에도 직접 적용되지만, 신년 테스트는 helper 변경 전후의 길이·문장 완결·말줄임표 부재를 검증하지 않는다.
- Risk: 첫 문장이 170자를 넘거나 ASCII `.?!` 뒤 공백이 없는 코퍼스에서는 `kept || clean`으로 한도보다 긴 전문이 신년 리포트에 삽입된다. 기존 신년 테스트 통과는 이 변경 경로를 덮지 못한 우연한 통과다.
- Recommendation: 신년 리포트에서 실제 선택되는 청크를 대상으로 문장 완결, 말줄임표 부재, 최대 허용 길이 또는 “첫 문장 초과는 허용” 정책을 명시적으로 검증하라. 특히 한 문장 장문·줄바꿈·한국어 종결부호(`。`) 케이스를 추가하라.

## 5. Minor Issues

- [src/day/wedding-service.ts:609-615, src/report/specialized-rag.ts:49-73] Issue: 중복 회피는 대분류 순서대로 상위 4개 중 미사용 첫 항목을 선점하는 탐욕 방식이며, 후보가 모두 사용됐을 때 `found[0]`으로 중복을 허용한다.
- Risk: 고정된 `WEDDING_TOC` 순서가 앞 대분류에 더 적합한 청크를 우선 배정한다. 현재 코퍼스에서는 동작하지만, 코퍼스 축소·랭킹 변경 때 중복이 다시 나타날 수 있다.
- Recommendation: 이는 차단 사유는 아니다. 중복 불가가 제품 요구라면 전체 대분류 후보를 모아 최대 매칭으로 배정하고, 허용 정책이면 fallback 중복을 명시하고 해당 경우를 테스트하라.

- [src/day/wedding-service.ts:611-612, src/report/specialized-rag.ts:64-73] Issue: `topK` 2→4 변경은 own-corpus 검색의 검색량을 실제로 늘리지 않는다. own 경로는 기존에도 카테고리마다 240개를 회수한 뒤 slice만 한다. own 청크가 없을 때 fallback 경로만 6개→12개 후보를 회수한다.
- Risk: 비용 증가 설명이 실제 구현과 다르며, fallback에서만 검색·정렬 비용이 증가한다.
- Recommendation: 성능 결론을 own/fallback 경로로 구분해 기록하고, fallback 결과가 반복되는 코퍼스 조건의 회귀 테스트를 추가하라.

- [tests/unit/day-wedding-service.test.ts:220-239] Issue: “검색한 근거가 본문에 실린다” 테스트는 실제로 선택된 청크의 ID/정규화된 `compactChunkText(chunkMeaning(chunk))`와 본문 tail을 대조하지 않는다.
- Risk: 고유한 고정 문구를 `[참고 기준]`으로 삽입해도 통과할 수 있어, 검색 결과 배선 자체가 바뀌어도 가짜 통과가 가능하다.
- Recommendation: 검색 함수를 결정론적 fixture/mock으로 고정하고, 각 대분류의 기대 청크 ID와 변환된 근거 문자열이 해당 마지막 섹션에 정확히 포함되는지 검증하라.

## 6. Verification Gaps

- Gap: 상대 생년월일시의 저장·API 반환 경로를 검증하는 privacy regression test가 없다.
- Suggested check: 결혼택일 preview/유료/저장 리포트 응답과 저장 record를 검사해 공개용 `context`에 `partner.birth`가 없음을 확인하라.

- Gap: `withReading` 검증이 `concern`만 대상으로 하며 `partner` 블록 전체를 확인하지 않는다.
- Suggested check: `JSON.stringify(context.partner)`에서 2자 이상 한자열은 모두 독음 표기와 결합되는지, 또는 모델 입력에서 원시 명식이 제외되는지 검증하라.

- Gap: 신년운세의 공용 절단 규칙 회귀가 없다.
- Suggested check: 장문 첫 문장, 복수 문장, `。`·개행 구분, legacy/knowledge chunk 각각으로 신년 `buildNewYearReport`의 실제 본문 결과를 검증하라.

- Gap: 원본 `f825d26`의 세 테스트 의도는 보존됐다.
- Suggested check: OK. 후보일 사실 이식, 상대 미입력 고지, 미확정 출생시각 고지의 핵심 assertion이 현재 `tests/unit/day-wedding-service.test.ts:181-218`에 유지됐다.

- Gap: 검색 근거 배선 자체는 템플릿 결과에서 확인됐다.
- Suggested check: OK. `sectionBody`가 선택 청크를 마지막 대분류 문단에 붙이고(`src/day/wedding-service.ts:483-488`), `usedChunkIds`가 우선 미사용 청크를 선택한다(`src/day/wedding-service.ts:608-615`).

## 7. Final Recommendation

- Next action: `partner.birth`의 저장·반환을 제거 또는 개인정보 보호 설계로 대체한 뒤, partner 명식의 독음 표기를 완결하고 위 privacy/신년/RAG 배선 회귀 테스트를 추가한 후 재검토하라.