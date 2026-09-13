# Tone V2 실제 출력 재검수 안내 개선 계획

> **For agentic workers:** REQUIRED SUB-SKILL: execute this plan inline as one reviewed vertical slice. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제 모델의 첫 검수 실패가 재시도 프롬프트에서 한자 설명 분리와 2~4문장 문단 규칙으로 정확히 교정되도록 한다.

**Architecture:** 기존 생성·검수·2회 재시도 구조는 유지한다. 실패 메시지를 그대로 한 줄로 이어 붙이는 대신, 고객 원문을 재전송하지 않는 구조화된 수정 지시를 만들고 전문용어·문단 실패에만 구체적인 재작성 형식을 덧붙인다.

**Tech Stack:** TypeScript, Node test runner, OpenAI adapter, ProjectOps, CreamWIKI.

## Global Constraints

- 운영 고객 데이터·DB·결제·인증·Production을 사용하거나 변경하지 않는다.
- 재시도 횟수와 모델은 변경하지 않는다.
- 거부된 원문을 수정 프롬프트나 추적 문서에 복사하지 않는다.
- ZIP-003-066, ZIP-003-068과 ZIP-003-094의 하한선만 다루고 다른 품질 게이트를 완화하지 않는다.

## PRD 계획 게이트 요약

- 사용자 결과: 첫 출력이 실패해도 두 번째 출력에서 한 문장당 한 개의 한자 설명과 2~4문장 의미 단락을 지킬 가능성이 높아진다.
- 실제 흐름: 생성 → 결정적 검수 실패 → 구조화된 수정 지시 → 재생성 → 동일 검수.
- 상태: 첫 시도 실패는 내부 시도 기록에 남고, 두 번째도 실패하면 기존처럼 섹션 `failed`를 유지한다.
- 화면·CTA·접근성·SEO·법률·분석 이벤트: 서버 생성 재시도 문구만 바꾸므로 해당 없음.
- 보안: 검수 사유만 전달하고 원문·고객 개인정보·키·토큰은 추가 전달하지 않는다.

### Task 1: 실패별 구조화된 수정 지시

**Files:**
- Modify: `src/report/report-generator.ts`
- Test: `tests/unit/report-persistence.test.ts`
- Create: `tone-v2/evaluations/P01-live-repair-guidance-20260912.json`
- Modify: `plan.md`, `tests.md`, `status.md`, `tone-v2/STATUS.md`, `tone-v2/task-progress.json`

**Interfaces:**
- Consumes: `InterpretationQualityError.review.issues`
- Produces: 원문을 포함하지 않는 두 번째 사용자 메시지와 기존 `buildOpenAiSajuReportSection` 결과 계약

- [ ] **Step 1: 실패 테스트 작성**

  첫 응답에 한 문장 복수 한자 설명과 한 문장짜리 문단을 넣고, 두 번째 요청이 두 실패를 번호 목록과 구체적인 문장 분리 예로 전달하는지 검증한다.

- [ ] **Step 2: RED 확인**

  `npx tsx --test tests/unit/report-persistence.test.ts`

- [ ] **Step 3: 최소 구현**

  실패 목록을 중복 제거하고 두 규칙에만 고정된 교정 힌트를 추가한다. 원문과 입력 데이터는 새 메시지에 복사하지 않는다.

- [ ] **Step 4: GREEN·라이브 검증**

  focused 테스트를 통과시킨 뒤 합성 입력 3서비스를 재생성하여 전문용어·문단 실패를 시도별로 기록한다.

- [ ] **Step 5: 회귀·리뷰·지식 저장**

  타입·빌드·전체 회귀·diff를 확인하고 ProjectOps/CreamWIKI에 성공과 남은 실패를 함께 남긴다. 커밋·push·배포는 하지 않는다.

## Self-Review

- ZIP-003-066, ZIP-003-068과 ZIP-003-094만 수정 대상으로 연결했다.
- UI, 데이터베이스, API 계약, 재시도 횟수, 검수 강도 변경은 제외했다.
- `TBD`, 임시 통과, 테스트 삭제, 원문 재전송 단계는 없다.
