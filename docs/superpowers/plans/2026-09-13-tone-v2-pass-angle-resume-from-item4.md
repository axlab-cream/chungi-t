# Tone V2 pass_angle resume from item 4 plan

## Goal

검증된 격리 합성 레코드의 3/52 상태와 기존 식별자·완료 원고를 보존한 채 4번부터 정확한 순서로 실제 생성을 재개하고, 첫 미해결 실패 즉시 중단한다.

사용자 보강 지시(2026-09-13): 첫 실패는 최종 종료가 아니라 안전 체크포인트다. 실패를 좁게 진단·수정하고 저장 응답을 복구한 뒤 다음 항목부터 재개하는 루프를 적용하며, 52/52 또는 외부 권한이 필요한 실제 차단점에서만 멈춘다.

## Execution contract

- 기존 version `p04-repair-next-criterion-retention-20260912-1`과 격리 파일 저장소만 사용한다.
- ignored `.env.local`의 기존 OpenAI 키는 이전 사용자 승인에 따라 값 노출 없이 재사용한다.
- 시작 전 item 1~3 및 record identity 해시를 고정한다.
- `--generate` 경로는 complete 항목을 건너뛰고 4번부터 순차 실행한다.
- 각 항목은 production parser/review와 기존 최대 2회 시도만 사용한다.
- 첫 failed 항목 뒤에는 호출·attempt가 없어야 한다.
- 원문과 비밀값은 추적 증거에 저장하지 않고 SHA-256, 상태, 길이, 검수 결과, 사용량만 보존한다.

## Steps

- [x] Activate the user-approved Task and verify the existing ignored API key without exposing it.
- [x] Run ProjectOps preflight and CreamWIKI search-first. Research dispatch is `NOT_RUN (degraded)`: Antigravity returned empty-prompt and the Claude fallback stalled twice before bounded cancellation.
- [x] Snapshot the exact 3/52 record and immutable item 1–3/identity hashes.
- [x] Resume sequential generation from item 4 and stop at the first unresolved failure.
- [x] Verify production replay, order, no attempts after failure, immutable prior items, and provider usage evidence.
- [x] Diagnose the item-7 nextCriterion failure, add a narrow RED fixture, implement the minimum safe recognizer fix, and recover the valid saved attempt.
- [x] Resume from item 8 and repeat the safe checkpoint/fix/recover loop as needed.
- [x] Run focused/full regression, typecheck, build, diff, and credential checks.
- [x] Complete independent review, ProjectOps evidence, CreamWIKI writeback, and Task closure.

## Non-scope

- Gate, prompt, model, retry, template, or storage behavior changes.
- Operating customer data, DB, auth, payment, admin, corpus, or release changes.
- Commit, push, deployment, or Production mutation.

## Live result

- Orders 4–6 completed and pass production replay; order 7 failed `nextCriterion` on both allowed attempts.
- The record stopped at 6/52 `failed`. Orders 8–52 remain pending with zero attempts after the failure.
- Items 1–3 and report/result identities are unchanged. This run used 8 provider calls and 167,007 tokens; raw prose and secrets are not stored in tracked evidence.

## Final result

- The checkpoint/fix/recover loop continued through order 52. Final report status and projection are `complete` at 52/52, and the strengthened production-equivalent replay passes all 52 sections.
- Items 4–52 used 103 provider calls and 2,307,658 tokens. Evidence stores only hashes, counts, statuses, and usage.
- Focused 68/68, full repository 705/705 across 101 suites, typecheck, Vercel build, and saved live replay PASS.
