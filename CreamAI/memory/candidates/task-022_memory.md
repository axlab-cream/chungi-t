# ProjectOps Memory Candidate

task_id: task-022
date: 2026-09-16
case_type: failure_and_success
failure_type: requirement_miss
success_pattern: surgical_fix
problem: |
  /cmdg/ 결과 화면에서 티저를 본 뒤 `천명사주 상담` CTA 를 눌러도 이니시스 결제창이 아니라
  /chat.html 의 해석 목차로 이동했다. "결제 부착이 회귀했다"로 보였지만 결제 연결 코드는
  그대로 살아 있었다.
solution: |
  1) 관리자 무료 열람(comp access)을 `?qa=pay` 로 한 번의 방문 동안만 끌 수 있게 했다.
     플래그는 접근을 주지 않고 오직 관리자 면제를 제거만 하므로 비관리자에게 이득이 없다.
  2) reportId 에 결속되지 않은 주문 판정을 둘로 나눴다. 컷오프 이전 주문은 컷오프 이전
     리포트만 열고(레거시 보호), 컷오프 이후 미결속 주문은 처음 여는 리포트에 결속된다
     (claim-on-first-use). `findUnlockingOrder` 의 `?? unlocking[0]` 폴백을 제거했다.
root_cause: |
  증상의 직접 원인은 코드 회귀가 아니라 테스트 계정이었다. `src/auth/admin.ts` 의 관리자
  이메일은 `resolvePaidAccess` 에서 `reason: 'admin'` 으로 즉시 entitled 를 받고
  `applyAdminReportUnlock` 이 리포트에 isPaid/paid/entitlement/paymentStatus 를 찍는다.
  클라이언트 `isCurrentReportPaid()` 에도 `if (isAdminAccount) return true;` 지름길이
  2026-09-04(5057043)에 추가됐다 — 결제 부착(2026-09-03, 6e8707f)보다 나중이라 회귀처럼 보였다.
why_it_worked: |
  "결제창이 안 뜬다"를 UI 버그로 보지 않고 entitlement 판정 한 지점(isCurrentReportPaid →
  resolvePaidAccess)까지 역추적했다. 프로덕션 HTML 을 직접 받아 startCheckout 이 살아 있음을
  먼저 확인해 회귀 가설을 배제한 것이 시간을 줄였다.
reuse_condition: |
  "예전엔 되던 결제/권한 화면이 지금은 건너뛴다"는 제보를 받았을 때. 먼저 (1) 프로덕션 산출물에
  해당 코드가 실제로 있는지, (2) 테스트에 쓴 계정이 면제 목록에 있는지 확인한다.
do_not_use_when: |
  결제 금액·승인·환불 로직 자체의 문제일 때. 이 지식은 열람 자격(entitlement) 판정 범위에만 적용된다.
related_files:
  - src/payment/entitlement.ts
  - src/server/app.ts
  - 사주/사주/index.html
  - 사주/js/chat.js
  - tests/unit/paid-entitlement.test.ts
  - CreamAI/scripts/run-projectops-harness.ps1
recommended_prompt: |
  "결제창이 안 뜬다" 제보는 UI 가 아니라 서버 entitlement 부터 본다. 판정 경로를 한 함수까지
  좁히고, 테스트 계정이 면제 대상인지 반드시 확인한다.
recommended_command: |
  curl -s https://umsh.kr/cmdg/ | grep -c startCheckout
  curl -s https://umsh.kr/api/payment/config
  npx tsx --test tests/unit/paid-entitlement.test.ts
revalidation_command: npm test && node scripts/check-integrations.mjs
expires_at: 2026-12-31
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: npm test 693 pass / 0 fail (CreamAI/logs/harness/task-022_test.json, exit_code=0).
  신규 30 pass. 고의 revert 3회로 누수 3건·서버 배선 1건·동시성 1건이 실제로 실패함을 확인.
- review: Codex 3회 (review / rereview / review3). Major 6건 전부 반영 후 Approved.
  Claude 가 Reviewer 로서 추가 발견한 Critical 1건(미결속 신규 주문 잠김)도 반영.
- audit: CreamAI/logs/audit/task-022_cmdg-entitlement-audit.md (Grok, Partially substantiated).
- commands: npx tsc --noEmit (clean), npm test, node scripts/check-integrations.mjs (10/10 PASS)

## Reusable Rule
- 면제 계정(admin/comp)이 있는 유료 경로는 면제를 "제거하는" 명시적 QA 플래그를 함께 설계한다.
  면제가 없으면 QA 는 유료 경로를 영구히 검증할 수 없다.
- 주문은 생성 시점에 자원(reportId)에 결속한다. 미결속 주문을 상품 단위로 인정하면 1회 결제가
  이후 모든 자원을 무한 개방한다.
- 자격 판정을 조일 때는 "명시적 식별자(orderId)로 우회하는 경로"를 반드시 같이 막는다.
  경로가 둘이면 느슨한 쪽이 실제 정책이 된다. 자격 반환 지점을 한 함수로 모은다.
- 자원 결속(claim)은 저장소 CAS 안에서 판단해야 한다. 밖에서 검사하고 안에서 쓰면 동시 요청
  둘이 모두 통과한다.
- 결제 자격 쓰기 실패는 fail-closed 가 맞다. 열어주고 주문을 재사용 가능한 상태로 남기면
  1회 결제가 무한 개방으로 돌아온다.

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

