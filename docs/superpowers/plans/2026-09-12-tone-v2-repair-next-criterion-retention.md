# Tone V2 repair next-criterion retention plan

## Goal

`pass_angle` 재시도가 다른 실패를 고치면서도 마지막 의미 단락에 구체적인 다음 판단 기준을 유지하도록 공용 repair 출력 계약 하나를 보강한다.

## Evidence

- 실제 P04 attempt 1은 문단 구조만 실패했고 attempt 2는 nextCriterion만 실패했다.
- CreamWIKI는 recognizer 확대보다 같은 문장/인접 문장 내 구체 대상과 안전한 기록·비교·확인 행동을 요구하고, 실패 시 gate를 완화하지 말라고 기록한다.
- 현재 repair 체크리스트는 다음 기준을 요구하지만 출력 위치와 반환 전 자기검사 순서를 강제하지 않는다.

## Scope and AIOS routes

- Routes: `00 Context`, `01 Skills`, `04 Workflows`, `12 QA/Eval`, `14 Memory/KMS`.
- Change only the repair instruction and its deterministic regression test.
- Preserve failure-label deduplication, rejected-prose non-copy, all existing invariant guidance, model, two-attempt limit, and every review gate.
- The approved provider check is a unique synthetic `pass_angle` first item only, after deterministic verification.

## TDD steps

- [x] Add a RED assertion requiring a reserved final 2–4-sentence meaning paragraph, explicit target/action sentence roles, and a silent pre-return self-check.
- [x] Add a counterexample assertion that vague encouragement or targetless action must not satisfy the contract.
- [x] Make the smallest repair-instruction change.
- [x] Run focused and related tests, typecheck, full regression, build, and diff check.
- [x] Check the unique provider version is absent, then run only item 1 and preserve an honest PASS/FAIL record.
- [x] Run independent review, ProjectOps evidence, and CreamWIKI writeback.

## Stop rule

If the first item remains rejected after the existing two attempts, stop with 0/52, record the single remaining defect, and do not call items 2–52.

## Provider outcome

The fresh first item completed on attempt 1 with full deterministic replay PASS. The live repair path was therefore not exercised, and no second call was forced. Evidence must distinguish first-item PASS from repair-path NOT_RUN.

## Closure

Independent closure re-review: Approved with comments, Critical 0 / Major 0. All three initial evidence Majors were resolved. The single stale-log placement Minor was already corrected by returning the older provider-failure lines to the preceding 52-item section.
