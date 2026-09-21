# All-Service Readable Copy Implementation Plan

> **For agentic workers:** Implement this plan task-by-task with RED→GREEN tests. Do not publish, deploy, or rewrite existing saved customer reports in this task.

**Goal:** 모든 서비스의 신규 티저와 해석을 중학생이 한자 사전 없이 이해할 수 있는 쉬운 한국어로 만들고, 어려운 출력이 최종 복구 단계에서 완료 처리되지 않게 한다.

**Architecture:** 공통 프롬프트에 쉬운말 계약을 추가하고, `tone-v2-review`에 재사용 가능한 독해 검수기를 둔다. 본문 생성 검수와 저장 티저 검수가 같은 계약을 사용하며, 결정론적 서비스 출력은 품질 평가와 전 서비스 QA에서 같은 기준을 확인한다. 서비스별 말투는 유지하되 공통 독해 최소선보다 우선하지 못한다.

**Tech Stack:** TypeScript 5.7, Node 24 test runner, tsx, Tone V2 generated prompt bundle.

## Global Constraints

- 대상: 20개 서비스의 신규 티저와 신규 해석.
- 기존 저장 고객 원문은 소급 수정하지 않는다.
- 한자는 고객 문장의 의미 전달에 필요하지 않으며, 쉬운 뜻이 한자 없이 완성되어야 한다.
- 전문용어는 꼭 필요한 경우에만 쓰고 쉬운 말이 먼저 와야 한다.
- 티저는 본문보다 엄격한 문장 길이와 용어 밀도 기준을 적용한다.
- 운영 프롬프트 발행, 원격 push, 배포는 이 계획의 로컬 구현 범위 밖이다.

---

### Task 1: 공통 독해 계약과 RED 테스트

**Files:**
- Modify: `tests/unit/tone-v2-generation.test.ts`
- Modify: `tests/unit/report-content-guards.test.ts`
- Modify: `tests/unit/service-system-prompt.test.ts`

**Interfaces:**
- Produces: `reviewReadableCopy(text, options)`의 기대 계약과 전 서비스 프롬프트 기대 문구.

- [ ] 전문용어가 몰린 티저, 설명용 한자, 65자 초과 티저 문장, 어려운 외래어가 실패하는 테스트를 추가한다.
- [ ] 쉬운 일상어, 인용된 사용자 입력, 날짜·고유명사, 서비스별 말투는 통과하는 반례를 추가한다.
- [ ] 현재 코드에서 테스트가 실패하는지 확인한다.

### Task 2: 공통 쉬운말 검수기와 프롬프트

**Files:**
- Modify: `src/report/tone-v2-review.ts`
- Modify: `src/report/report-preview.ts`
- Modify: `src/report/report-quality.ts`
- Modify: `tone-v2/source/규격/01-공통-프롬프트-규칙.md`
- Modify: `tone-v2/generated/common.md`

**Interfaces:**
- Produces: `reviewReadableCopy(text, { role: 'teaser' | 'body' })`.
- Consumes: 본문 검수의 `hook`, `interpretation`; 티저의 `headline`, `summary`, `insights`.

- [ ] 쉬운말 검수기를 최소 규칙으로 구현한다: 한자 노출, 쉬운말보다 먼저 나온 전문용어, 전문용어 밀도, 티저 장문, 어려운 외래어.
- [ ] `reviewGeneratedSajuReportSection`과 `reviewTeaser`가 같은 검수기를 호출하게 한다.
- [ ] 품질 점수의 장문 기준을 실제 독해 기준과 정렬한다.
- [ ] 공통 원천·생성 프롬프트에 중학생 독해 계약을 같은 의미로 반영한다.
- [ ] 집중 테스트가 통과하는지 확인한다.

### Task 3: lenient 차단과 서비스별 정렬

**Files:**
- Modify: `src/report/tone-v2-review.ts`
- Modify: `tone-v2/source/규격/04-페르소나-상세규정.md`
- Modify: `tone-v2/generated/personas.json`
- Modify: `tone-v2/generated/services/saju_master.md`
- Modify: other `tone-v2/generated/services/*.md` only where the common minimum is contradicted.
- Test: `tests/unit/section-rescue.test.ts`
- Test: `tests/unit/service-system-prompt.test.ts`

**Interfaces:**
- `isBlockingIssue(issue)` must return true for unexplained Hanja and teaser/body readability minimum violations.

- [ ] 독해 핵심 위반이 lenient 복구에서 차단되는 RED 테스트를 추가한다.
- [ ] 천명사주의 장문 지시를 `격식은 유지하되 짧은 문장`으로 바꾼다.
- [ ] 20개 서비스 프롬프트 모두 공통 쉬운말 계약을 포함하는지 검사한다.
- [ ] 집중 테스트가 통과하는지 확인한다.

### Task 4: 전 서비스 티저·해석 회귀

**Files:**
- Modify: `tests/unit/service-workflow-sweep.test.ts`
- Modify: `tests/unit/service-gate-alignment.test.ts`
- Modify: `tests.md`

**Interfaces:**
- Consumes: 20개 서비스 템플릿/생성 프롬프트와 공개 티저 조립 결과.

- [ ] 전 서비스 프롬프트와 생성 가능한 결정론적 결과에 독해 계약을 적용하는 회귀 테스트를 추가한다.
- [ ] 티저와 본문을 별도 결과로 보고 실패 서비스명을 출력한다.
- [ ] 관련 검사, 전체 테스트, typecheck, Vercel build, 서비스 QA를 실행한다.

### Task 5: 운영 기록과 지식 루프

**Files:**
- Modify: `status.md`
- Modify: `tests.md`
- Update: `docs/admin-ops/report-readability-audit-20260921.md`

- [ ] 변경·검증·미배포 범위를 기록한다.
- [ ] CreamWIKI에 관측·결정·검증·교훈·다음 배포 게이트를 저장하고 재조회한다.
- [ ] `git diff --check`와 최종 diff 리뷰를 실행한다.

## Page / Admin Sync Brief

- Public result pages: 티저와 상세 해석의 문장만 달라지며 CTA, 권한, 가격, 저장 구조는 바뀌지 않는다.
- Admin prompt page: 공통 규칙 또는 서비스 발행본이 있으면 파일보다 우선한다. 배포 후 공통 발행본이 새 규칙을 덮지 않는지 확인해야 한다.
- Required states: 기존 loading/empty/error/permission/success 상태는 변경하지 않는다.
- Analytics/SEO/legal: 이벤트, 메타데이터, 약관, 개인정보 흐름 변경 없음.
- Definition of Done: 전 서비스 프롬프트 계약, 티저 검수, 본문 검수, lenient 차단, 전 회귀, typecheck/build가 모두 증거와 함께 통과해야 한다.
