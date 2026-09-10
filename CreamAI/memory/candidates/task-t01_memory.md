# ProjectOps Memory Candidate

task_id: task-t01
date: 2026-09-10
case_type: failure (tool_error) + success (quality_gate)
failure_type: tool_error
success_pattern: quality_gate
problem: |
  Express 앱의 라우트 전수를 파악할 때 `grep "app.get('/api"` 같은 단일 따옴표 문자열 패턴을 쓰면
  경로 배열 등록(`app.get(['/a', '/a/', '/a.html'], handler)`)을 전부 놓친다.
  이 프로젝트(`src/server/app.ts`)는 등록문 145건 중 다수가 배열 형태이고
  경로 엔트리는 286건이다. 잘못된 grep은 총계를 165/37로 축소했고,
  더 심각하게 **실재하는 `GET /api/report/:reportId`를 "존재하지 않음"으로 오판**시켰다.
  그 오판은 "명세 문서와 코드가 충돌한다"는 잘못된 결론과, 그에 기반한
  잘못된 후속 설계(T10/T11의 리포트 접근 계약)로 번질 수 있었다.
solution: |
  라우트 추출은 grep 대신 파서 성격의 스크립트로 한다. 최소 요건:
  1. `app.<verb>(` 뒤 첫 인자가 `[`로 시작하면 배열을 분해해 각 경로를 개별 엔트리로 센다.
  2. "등록문 수"와 "경로 엔트리 수"를 구분해 보고한다 (별칭이 있으므로 두 수는 다르다).
  3. 명세가 주장하는 라우트는 하나씩 실제 위치(행 번호)와 함께 PASS/WRONG 판정한다.
  4. 라우트를 찾았으면 핸들러 본문의 인증 검사(예: `verifySupabaseUser`)와
     우회 플래그(예: `developmentReportAccess`)까지 함께 기록한다.
root_cause: |
  단일 따옴표 리터럴만 매칭하는 정규식이 Express의 다중 경로 등록 관용구를 표현하지 못했다.
  더 근본적으로는 "grep 결과가 0건"을 "코드에 없음"의 증거로 승격시킨 판단 오류다.
  부재 증명(proof of absence)에는 추출 방식의 완전성 검증이 선행돼야 한다.
why_it_worked: |
  Codex 리뷰가 이 오판을 Major로 잡아냈다. 리뷰 프롬프트에 "각 주장을 PASS/WRONG으로
  판정하고 틀렸으면 올바른 값을 제시하라"는 형식을 강제하고, 가장 의심스러운 주장
  하나를 지목해 "이것을 특히 주의해 확인하라"고 명시한 것이 유효했다.
reuse_condition: |
  Express/Fastify/Koa 등에서 라우트 인벤토리를 만들 때.
  또는 "명세 문서가 주장하는 API가 코드에 없다"는 결론을 내리기 직전.
do_not_use_when: |
  라우터가 파일 시스템 기반(Next.js app/pages, Remix)인 경우.
  그때는 파일 트리 자체가 라우트 인벤토리다.
related_files:
  - src/server/app.ts
  - docs/admin-ops/T01-baseline.md
  - CreamAI/logs/review/task-t01_admin-ops-t01-review.md
recommended_prompt: |
  리뷰 요청 시: "아래 각 주장을 PASS 또는 WRONG으로 판정하고, WRONG이면 올바른 값을 제시하라.
  특히 (가장 의심스러운 주장)은 주의해서 확인하라."
  부재 주장 시: "이 라우트가 없다고 결론내리기 전에 배열·정규식·라우터 분리 등록 형태를 모두 확인했는가?"
recommended_command: |
  node -e '조사 스크립트' — app.<verb>( 의 첫 인자가 배열이면 분해,
  등록문 수와 경로 엔트리 수를 분리 집계
revalidation_command: |
  node -e 스크립트로 재추출해 등록문 145 / 경로엔트리 286 / /api 39가 유지되는지 확인.
  값이 달라지면 app.ts가 변경된 것이므로 인벤토리를 갱신한다.
expires_at: src/server/app.ts의 라우트 구조가 리팩터링되는 시점 (또는 2026-12-31)
privacy_level: internal
should_promote_to_rag: true

## Evidence
- review: `CreamAI/logs/review/task-t01_admin-ops-t01-review.md` — Critical 0 / Major 5 / Minor 4, 전부 수용
- 오판 지점: T01-baseline 초판 §3.2가 `GET /api/report/:reportId`를 "충돌 있음"으로 판정
- 실제: `src/server/app.ts:2398` `app.get(['/api/report/:reportId', '/api/reports/:reportId'], …)`
- 정정 후 총계: 등록문 145 / 경로엔트리 286 / `/api` 경로엔트리 39 / 패키지 미기재 23
- tests: `npm run typecheck` 0 오류, `npm test` 373/373

## 부수 지식 (같은 리뷰에서 확보)
- `express.static`은 매칭 파일이 없으면 `next()`로 통과한다. 따라서 static 마운트 뒤에
  등록된 라우트가 "전부 가려진다"는 서술은 틀렸다. 실제 위험은
  **경로에 실제 파일이 존재하면 그 파일이 인증 검사 없이 먼저 서빙된다**는 것이다.
  → 인증이 필요한 UI 자산은 정적 루트 밖에 두는 것이 순서 조정보다 안전하다.
- SHA-256 매니페스트가 딸린 명세 패키지는 불변으로 보존하고, 갱신이 필요한 인계 기록은
  별도 living 문서로 분리하는 편이 검증 가능성을 유지한다. 단 "정본이 어느 쪽인지"는
  사용자 결정으로 명시해야 한다 (미해결 상태로 남기면 후속 에이전트가 혼동한다).

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
- 비고: Codex 지적에 따라 `src/auth/admin.ts`의 하드코딩 관리자 이메일 주소를
  문서에서 제거하고 상수명(`DEFAULT_ADMIN_EMAILS`)만 인용하도록 변경했다.
