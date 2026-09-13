# 운명상회 Tone V2 근거 네 층 경계

## Observation

기존 섹션 생성 프롬프트는 사용자 입력(`birth`, `context`), 서버 계산(`featureJson`), 검색 근거(`rag`)를 같은 루트 수준에 두었다. 모델이 각 값의 출처와 허용 범위를 혼동하거나, 매 항목마다 등록 정보를 반복하거나, 코퍼스 상징·가상 사례를 실제 사실처럼 옮길 위험이 있었다.

## Decision

모델 입력을 다음 네 층으로 명시적으로 분리한다.

1. `userFacts`: 사용자가 제공했고 공개 가능한 사실
2. `verifiedCalculations`: 서버 계산기로 산출·검증한 값
3. `traditionalInterpretationCandidates`: RAG에서 회수한 전통 해석 후보
4. `fictionalExamplePolicy`: 가상 사례를 실제 경험과 구별하는 표시 규칙

전통 상징은 사실이나 계산값이 아니다. 가상 사례는 `예를 들어` 또는 `만약`으로 시작한다. 근거 구획명은 내부 메타데이터이므로 고객 문장에 노출하지 않는다.

## Artifact

- `src/report/report-generator.ts`: `sectionPrompt()`의 `evidenceLayers`, section order, completed siblings
- `src/report/tone-v2-review.ts`: 네 층 작성 계약, 반복 금지, 내부 필드 노출 검수
- `tests/unit/tone-v2-generation.test.ts`: 구조·개인정보·표현 경계 회귀
- `tone-v2/reviews/P01-common-1-3.md`: ZIP-003-011~017 판독 기록

## QA

- TDD RED: 6/7 PASS, legacy root prompt shape 1 FAIL
- Focused GREEN: 58/58 PASS
- Compiler/task coverage: 7/7 PASS
- Regenerated task-index: 3/3 PASS
- Full regression: 637/637 PASS
- Typecheck, Vercel build, diff check: PASS
- Live provider output evaluation: NOT_RUN

## Lesson

프롬프트 문장으로만 “사실과 상징을 구분하라”고 지시하는 것보다 입력 구조 자체가 출처를 표현해야 한다. 다만 구조 분리는 모델 출력의 의미적 준수를 보장하지 않으므로 실제 출력의 문장별 근거 대조가 별도 승인 게이트로 남아야 한다.

## Relation

선행 기록: `umsh-tone-v2-persona-contract-20260912.md`. 다음 작업은 서비스별 행동 구체성, 전용 RAG 검색, 코퍼스 비복사, 정보 부족 처리 검수 후 코퍼스 vertical slice 전환이다.

## Next patch

ZIP-003-026, ZIP-003-031, ZIP-003-033~035를 검수하고 첫 서비스의 코퍼스 검색·출력·평가 흐름을 끝까지 연결한다.
