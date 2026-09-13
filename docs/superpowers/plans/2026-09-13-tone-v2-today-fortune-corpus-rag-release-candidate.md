# Tone V2 today_fortune corpus, RAG and release-candidate plan

## Goal

Create and activate a separately versioned, semantically reviewed `today_fortune`
corpus for new RAG snapshots while preserving the old corpus for stored reports.

## Confirmed gap

- The active `2.0.0` pack has one block and remains `needs_semantic_review`.
- Its three real-world patterns are not labeled as hypothetical examples.
- The condition and forbidden-generalization fields repeat migration boilerplate.
- The service's deterministic daily calculation is separate from RAG and remains unchanged.

## AIOS routes

- `11 Ops`: versioned registry attachment and registry-only rollback.
- `12 QA/Eval`: executable semantic and snapshot checks.
- `14 Memory/KMS`: reuse prior snapshot isolation and save verified results.

## Vertical slices

1. Add RED assertions for the 1/1 review, semantic boundaries, old/new snapshot isolation and rollback.
2. Deterministically build a separate `2.1.0` pack with input, calculation, symbol and hypothetical-example boundaries.
3. Activate only new snapshots and retain `2.0.0` for stored snapshots.
4. Prove retrieval, prompt construction, saved-attempt review and hash failure behavior.
5. Bind a truthful local candidate without provider-output or deterministic-renderer claims.
6. Run focused, related, full, typecheck, build, review, ProjectOps and CreamWIKI gates.

## Acceptance

- The single block passes explicit semantic review.
- A date, time, event, outcome or another person's mind is not predicted.
- Actual schedule, priority, deadline and reversibility require user-observable facts.
- Hypothetical examples are labeled and arbitrary prescription numbers are absent.
- New snapshots use `2.1.0`; stored `2.0.0` snapshots and rollback remain valid.
- Provider generation, deterministic daily renderer changes, customer data, Production, commit, push and deployment are out of scope.

## Result

DONE on 2026-09-13. All six vertical slices and every acceptance item passed.
The active registry is `tone-v2.2.0.5`; new `today_fortune` RAG snapshots use
the reviewed `2.1.0` pack and stored `2.0.0` snapshots remain isolated through
retrieval, prompt construction and saved-attempt review. Focused tests passed
8/8, related tests 82/82 and the full repository 759/759 across 106 suites.
The deterministic daily renderer remained unchanged and its related tests passed.
