# ProjectOps Memory Candidate

task_id: task-002
date: 2026-09-10
case_type: mixed (success + tool failure)
failure_type: tool_error
success_pattern: quality_gate
problem: |
  Git/Vercel/Supabase 세 서비스를 "모두 작업할 수 있는 환경"으로 만들라는 요청에서,
  어떤 것이 이미 연결되어 있고 어떤 것이 비어 있는지 근거 없이 추측하면
  이미 configured인 CLI에 로그인을 반복하거나, 라이브 원격 스키마에 파괴적 마이그레이션을 시도할 위험이 있다.
solution: |
  1. 설정 변경 전에 `remember-integration.ps1 -Service <svc> -Action ensure -Verify`로 상태를 먼저 판정한다.
     github/vercel는 configured로 확인되어 로그인 절차를 생략했고, supabase만 missing_cli로 좁혀졌다.
  2. Supabase는 CLI 없이도 REST(`/rest/v1/<table>?limit=1`)와 Auth(`/auth/v1/settings`)로 도달성을 검증할 수 있다.
     테이블 조회의 HTTP 401 + PostgREST 코드 42501은 "권한 거부"이므로 프로젝트/테이블 존재의 긍정 증거다.
  3. Vercel 환경변수 공백은 `vercel env ls`의 environments 열을 변수별로 표로 만들어 판정한다.
  4. 실행 문서/명령의 기본값은 문서 기억이 아니라 `<cli> <cmd> --help`로 그 자리에서 확정한다.
root_cause: |
  ProjectOps 하네스의 test 모드가 실제 테스트를 실행하지 않는 것은
  `run-projectops-harness.ps1`이 `$ProjectRoot`를 스크립트 디렉터리의 부모(=CreamAI/)로 계산하고
  거기로 Set-Location 한 뒤 `CreamAI/package.json`을 찾기 때문이다.
  저장소 루트의 package.json을 보지 못해 "package.json has no test script" WARN으로 조용히 통과한다.
why_it_worked: |
  상태 판정을 명령 결과(exit code, HTTP status)로 환원했기 때문에
  "연동되어 있다/없다"가 의견이 아니라 재현 가능한 증거가 되었고,
  불필요한 로그인/설치 반복을 0회로 줄였다.
reuse_condition: |
  Git/Vercel/Supabase(또는 유사 외부 서비스) 연동 상태를 처음 파악하거나,
  다른 PC/세션에서 같은 저장소를 다시 세팅할 때.
do_not_use_when: |
  원격 스키마에 실제 마이그레이션을 적용하는 단계.
  그때는 이 메모가 아니라 plan.md의 안전 게이트 G1~G5를 따른다.
related_files:
  - CreamAI/scripts/remember-integration.ps1
  - CreamAI/scripts/run-projectops-harness.ps1
  - scripts/check-integrations.mjs
  - vercel.json
  - .env.example
  - CreamAI/reports/task-002_analysis.md
recommended_prompt: |
  "설정을 바꾸기 전에 remember-integration ensure로 세 서비스 상태를 먼저 판정하고,
   missing으로 나온 서비스만 대상으로 후속 Task를 만들어라."
recommended_command: |
  CreamAI/scripts/remember-integration.ps1 -Service github -Action ensure -Verify
  CreamAI/scripts/remember-integration.ps1 -Service vercel -Action ensure -Verify
  CreamAI/scripts/remember-integration.ps1 -Service supabase -Action ensure -Verify
  vercel env ls
  node scripts/check-integrations.mjs
revalidation_command: |
  node scripts/check-integrations.mjs
  (결제 2건 외 전 항목 PASS이면 이 지식은 유효)
expires_at: 2026-12-31 (또는 Supabase 키 모델을 sb_publishable/sb_secret로 전환한 시점 중 이른 쪽)
privacy_level: internal
should_promote_to_rag: false

## Evidence
- tests: `npm run typecheck` PASS(오류 0), `npm test` PASS(373/373, 29 suites)
- review: `CreamAI/logs/review/task-002_integration-baseline-review.md` — Critical 0 / Major 1 / Minor 2, 전부 수용 후 반영
- commands: `remember-integration.ps1 -Action ensure`(github=configured, vercel=configured, supabase=missing_cli exit 3),
  `vercel env ls`, `vercel env pull --help`, `node scripts/check-integrations.mjs`(8 PASS / 2 FAIL)
- harness: `CreamAI/logs/harness/task-002_{preflight,test,review,rag,release}.json`

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
- 비고: Supabase 프로젝트 ref와 URL 호스트는 비밀값이 아닌 식별자로 의도적으로 기록했다(Codex 리뷰에서도 허용 판정).
