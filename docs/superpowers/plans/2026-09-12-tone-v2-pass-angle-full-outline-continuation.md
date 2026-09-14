# Tone V2 pass-angle full-outline continuation plan

## Goal

기존 합성 `pass_angle` 레코드의 완료된 1번 항목을 보존하고 2번부터 52번까지 순서대로 생성해, 각 항목의 공용 결정적 검수와 저장 상태를 확인한다.

## Evidence and boundaries

- Source version: `p04-repair-next-criterion-retention-20260912-1`.
- Existing state: item 1/52 is `complete`; the remaining items are `pending`.
- Existing ignored `.env.local` OpenAI key reuse was previously approved and was rechecked without exposing its value.
- CreamWIKI search-first evidence requires exact outline order, sequential stop-on-failure, unchanged gates, no raw prose/secret tracking, and honest natural-repair evidence.
- No production customer data, DB/auth/payment/admin, corpus transition, release attachment, commit, push, deploy, or Production change is in scope.

## Execution steps

- [x] Replay the saved record read-only and confirm item 1/52 plus exact 52-item outline.
- [x] Reuse the same version without `--fresh`; generate pending items in order with `--limit=52 --generate`.
- [x] Stop immediately on the first unresolved failure and prove that later items received zero calls.
- [x] Record the first naturally occurring repair attempt, if any; never force a retry for evidence.
- [x] Replay every completed item through the existing shared validators and verify persisted state/hash metadata.
- [x] Run focused/full regression, typecheck, build, and diff checks proportional to the observed result.
- [x] Produce sanitized evaluation evidence, independent review, ProjectOps updates, and CreamWIKI writeback.

## Provider outcome

Item 2 completed after a natural two-attempt repair. Item 3 remained rejected after two attempts; its second attempt failed only `nextCriterion`. The harness stopped at 2/52 with zero calls after failure and zero calls outside the limit.

## Closure

Independent closure re-review: Approved with comments, Critical/Major/Minor 0. CreamWIKI put/get/exact-title search and ProjectOps review PASS. The task closes at honest business acceptance FAIL 2/52 and waits for a new user `다음` before the inactive diagnosis slice.

## Stop rule

If any pending item remains rejected after the existing retry policy, preserve its exact item ID, attempt count, and failed rule labels, stop immediately, and leave every later item untouched. Do not change a gate, recognizer, model, prompt, or retry count inside this evidence Task.
