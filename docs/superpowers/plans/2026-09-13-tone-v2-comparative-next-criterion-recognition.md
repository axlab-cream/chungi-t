# Tone V2 comparative nextCriterion recognition plan

## Goal

`비교해봐` 활용형과 `같은 이유가 남는지` 같은 주격 관찰절을 함께 가진 구체적인 다음 판단 기준을 인정하되 기존 안전·구체성 경계를 유지한다.

## AIOS routes

- `01 Skills`: local skill files are missing; use the project router's manual evidence-first TDD fallback.
- `11 Ops`: keep the historical record immutable and make no provider or Production call.
- `12 QA/Eval`: prove both gaps independently with RED fixtures and preserve negative controls.
- `14 Memory/KMS`: apply prior nextCriterion safety rules and write back only after verification.

## Steps

- [x] Capture each diagnosed gap as an independent failing fixture.
- [x] Preserve targetless, vague, negated, past/perfect, and unsafe-abandonment negatives.
- [x] Make the smallest recognizer-only change.
- [x] Re-evaluate the immutable saved attempt and verify its record SHA-256 is unchanged.
- [x] Run focused, related, compiler/task, full regression, typecheck, build, and diff checks.
- [x] Complete independent review, ProjectOps evidence, and CreamWIKI writeback.

## Constraints

- No prompt, model, retry, provider, record-state, item 4–52, DB, auth, payment, admin, corpus, release, commit, push, deploy, or Production change.
- Do not copy the full provider response into tracked evidence.
- Keep controlled fixture strings synthetic and sanitized, or store only their SHA-256.
