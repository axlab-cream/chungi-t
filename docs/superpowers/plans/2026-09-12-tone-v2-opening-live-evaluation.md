# Tone V2 첫머리·내부 필드 라이브 평가 계획

> **실행 방식:** 현재 세션에서 단일 수직 슬라이스로 RED/실제 출력/최소 수정/검증을 순서대로 수행한다.

**목표:** ZIP-003-008, ZIP-003-009, ZIP-003-032를 합성 입력 기반 실제 모델 출력에서 대조하고 재현 가능한 평가 근거를 남긴다.

**구조:** 기존 `scripts/check-reading-live.ts`가 운영 저장소와 외부 결제·인증 변수를 제거한 격리 저장소에서 격식체·해요체·반말체 대표 서비스 한 항목씩 생성한다. 생성된 hook과 본문은 기존 Tone V2 검수 함수 및 사람의 문장 판독으로 평가하며, 실제 위반이 확인된 경우에만 관련 검수 코드와 테스트를 최소 수정한다.

**기술:** Node 24, TypeScript, OpenAI adapter, Node test runner, JSON 평가 증거.

## PRD 계획 게이트 요약

- 사용자 결과: 실제 모델 출력이 질문에 바로 답하고 제작 과정·내부 구조를 노출하지 않는지 확인할 수 있다.
- 데이터 원천: 합성 생년·고민·시험 입력과 현재 Tone V2 프롬프트/코퍼스. 운영 고객 데이터는 사용하지 않는다.
- 포함: 대표 3서비스 실제 생성, ZIP-003-008/009/032 판독, 실패 반례와 최소 수정, 검증·KMS 기록.
- 제외: 20개 서비스 전량 의미 평가, 전체 코퍼스/RAG 교체, UI, 관리자 CTA, DB, Production 부착·배포.
- 상태: API 키 없음/모델 호출 실패는 `BLOCKED`; 생성 후 규칙 위반은 `FAIL`로 기록하고 수정한다.
- 화면·CTA·접근성·SEO·법률·분석 이벤트: 이번 서버 출력 평가에는 해당 없음.
- 보안: 키·토큰·쿠키·운영 고객 데이터·원시 비밀 로그를 산출물에 기록하지 않는다.

## TASK Brief

- TASK ID: P01-LIVE-OPENING-001
- 연결 규칙: ZIP-003-008, ZIP-003-009, ZIP-003-032
- 성공 기준:
  - 세 출력 모두 첫 2~3문장 안에 현재 항목 질문의 답이 있다.
  - 제작 안내형 첫머리가 0건이다.
  - 내부 필드·점수·프롬프트 구조 노출이 0건이다.
  - 실패 시 해당 문장을 고정한 회귀 테스트가 먼저 실패한 뒤 최소 수정 후 통과한다.
- 검증 명령:
  - `npx tsx --test tests/unit/tone-v2-generation.test.ts`
  - `npx tsx scripts/check-reading-live.ts --generate --version=p01-opening-20260912`
  - `npx tsx --test tests/unit/report-persistence.test.ts tests/unit/tone-v2-generation.test.ts`
  - `node --test tone-v2/compile.test.mjs tone-v2/task-index.test.mjs`
  - `npm run typecheck`
  - `npm run vercel-build`
  - `npm test`
  - `git diff --check`
- Definition of Done: 실제 출력 3건의 규칙별 판정, 명령·모델·완료 상태·미검증 범위, ProjectOps와 CreamWIKI 기록이 일치한다.

