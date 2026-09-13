# Tone V2 pass_angle item 3 recovery plan

## Goal

저장된 3번 항목의 마지막 실패 attempt 원문을 동일 production review 함수로 다시 검증하고, 통과할 때만 해당 섹션 상태를 멱등하게 복구한다.

## AIOS routes

- `01 Skills`: 지정 local skill 원본이 없어 수동 evidence-first TDD 절차를 사용한다.
- `02/03 Teams`: 구현 전 Antigravity 조사, 구현 후 Codex 독립 리뷰를 실행한다.
- `11 Ops`: CAS 저장과 기존 완료 항목 불변성으로 단일 섹션 상태 전이를 보호한다.
- `12 QA/Eval`: 실패 원문·잘못된 ID·선행 미완료·이미 완료·동시 실행 반례를 RED→GREEN으로 검증한다.
- `14 Memory/KMS`: 저장 실패 복구와 멱등성 사례를 검색하고 검증 후 sanitized note를 갱신한다.

## Steps

- [x] Activate the approved Task and inspect stored-record invariants.
- [ ] Dispatch bounded recovery research and incorporate applicable findings. `NOT_RUN (degraded)`: Antigravity empty-prompt, Claude fallback stalled and was stopped.
- [x] Add failing tests for valid recovery, fail-closed controls, idempotency, and lease boundaries.
- [x] Implement the smallest explicit recovery path using the saved record inputs and production review.
- [x] Run the recovery against the isolated item-3 record and prove item 1–2/attempts/raw/later items remain unchanged.
- [x] Run focused, related, compiler/task, full regression, typecheck, build, diff, and credential checks.
- [x] Complete independent review, ProjectOps evidence, CreamWIKI writeback, and Task closure.

## Result

- `pass-angle-support-vs-drag` is complete from its unchanged second saved attempt; record is `generating` at 3/52 and revision 19.
- Concurrent 2-call plus repeated 1-call recovery changed the revision once. Items 1–2, attempts/raw, identities, and items 4–52 remained immutable; provider calls remained zero.
- Independent review: Approved with comments, Critical 0 / Major 0. The suggested stale/malformed lease cases were added and pass.

## Constraints

- No provider call and no item 4–52 generation.
- Do not alter attempt raw text, attempt count/status, item 1–2, stored birth/context/analysis, or identifiers.
- Fail closed on missing raw, malformed/wrong-id output, failed review, incomplete predecessor, active lease, or non-failed section.
- No DB/auth/payment/admin/corpus/release/commit/push/deploy/Production change.
