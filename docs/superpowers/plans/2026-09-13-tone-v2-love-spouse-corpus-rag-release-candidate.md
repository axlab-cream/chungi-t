# Tone V2 love_spouse corpus/RAG release-candidate plan

## Goal

Version and review the one-block `love_spouse` corpus for new snapshots while preserving `2.0.0` for stored reports.

## Evidence and boundaries

- CreamWIKI relationship-corpus evidence requires observed facts, calculated values, symbolic interpretation and hypothetical examples to stay separate.
- The original block repeats migration boilerplate and presents unlabeled life scenes.
- A chart cannot identify or predict a future spouse's name, age, appearance, occupation, nationality, location, arrival date, marriage date, feelings or behavior.
- Desired partner conditions and observed relationship behavior may be discussed only when supplied by the user.
- Refusal, coercion, control, stalking and violence are not compatibility signals and route to boundaries and safety.

## AIOS routes

- `11 Ops`: versioned registry transition and rollback.
- `12 QA/Eval`: semantic review, snapshot consumers and full regression.
- `14 Memory/KMS`: search-first evidence and verified reusable work-log.

## Vertical slices

1. RED semantic/snapshot assertions.
2. Deterministic reviewed `2.1.0` pack.
3. New-snapshot registry attachment with old-snapshot preservation.
4. Retrieval, prompt, saved-review and hash-failure proof.
5. Truthful rollback candidate.
6. Focused/related/full/typecheck/build/review/ProjectOps/KMS verification.

## Acceptance

- 1/1 semantic review passes.
- Only user-stated preferences and user-confirmed observed behavior are facts.
- Future-spouse identity, attributes, timing, feelings and relationship outcomes are not predicted.
- Safety/autonomy boundaries are explicit and hypothetical examples are labeled.
- New snapshots use 2.1.0; stored 2.0.0 snapshots and registry-only rollback remain valid.

## Non-scope

- Provider generation, Production, customer data, DB/auth/payment/admin, commit, push and deployment.

## Result

- DONE: the single block passed semantic review and the reviewed 2.1.0 pack is active for new snapshots.
- Stored 2.0.0 snapshots remain isolated across retrieval, prompt construction and saved-attempt review; hash mismatch fails closed.
- Focused 8/8, related 88/88 and full 799/799 across 111 suites passed with typecheck, build, deterministic generation and closure review.
- Provider output evaluation, Production and customer-data mutation were not run.
