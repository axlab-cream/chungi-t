# Tone V2 saju_master corpus, RAG and release-candidate plan

## Goal

Create and activate a separately versioned, semantically reviewed `saju_master`
corpus for new RAG snapshots while preserving the old corpus for stored reports.

## Confirmed gap

- The active `2.0.0` pack has one block and remains `needs_semantic_review`.
- Its three real-world patterns are not labeled as hypothetical examples.
- The condition and forbidden-generalization fields repeat migration boilerplate.
- Input facts, server-calculated original-chart/daewoon values and symbolic interpretation are not explicitly separated.

## AIOS routes

- `11 Ops`: versioned registry attachment and registry-only rollback.
- `12 QA/Eval`: executable semantic, safety and snapshot checks.
- `14 Memory/KMS`: reuse prior snapshot-isolation knowledge and save verified results.

## Vertical slices

1. Add RED assertions for the 1/1 review, semantic boundaries, old/new snapshot isolation and rollback.
2. Deterministically build a separate `2.1.0` pack with input, calculation, symbol and hypothetical-example boundaries.
3. Activate only new snapshots and retain `2.0.0` for stored snapshots.
4. Prove retrieval, prompt construction, saved-attempt review and hash failure behavior.
5. Bind a truthful local candidate without provider-output claims.
6. Run focused, related, full, typecheck, build, review, ProjectOps and CreamWIKI gates.

## Acceptance

- The single block passes explicit semantic review.
- Calculated chart values are not treated as verified personality, career, wealth, relationship, health or future events.
- Actual events and constraints require user input or confirmed facts.
- Hypothetical examples are labeled and arbitrary prescription numbers are absent.
- Medical, legal, investment and contract decisions are not replaced by saju authority.
- New snapshots use `2.1.0`; stored `2.0.0` snapshots and rollback remain valid.
- Provider generation, customer data, Production, commit, push and deployment are out of scope.

## Result

DONE on 2026-09-13. All six vertical slices and every acceptance item passed.
The active registry is `tone-v2.2.0.6`; new `saju_master` snapshots use the
reviewed `2.1.0` pack and stored `2.0.0` snapshots remain isolated through
retrieval, prompt construction and saved-attempt review. Focused tests passed
8/8, related tests 98/98 and the full repository 767/767 across 107 suites.
