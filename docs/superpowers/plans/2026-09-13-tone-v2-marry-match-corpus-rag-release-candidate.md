# Tone V2 marry_match corpus, RAG and release-candidate plan

## Goal

Create and activate a separately versioned, semantically reviewed `marry_match`
corpus for new report snapshots while preserving the old corpus for existing reports.

## Confirmed gap

- The active `2.0.0` pack has 20 blocks and remains `needs_semantic_review`.
- It contains unsupported partner reactions, arbitrary recovery periods/counts,
  deterministic marriage outcomes and unverified family/living/financial scenes.
- The audit specifically flags the closing contextual claim in `mar-020`.

## Vertical slices

1. RED tests for 20/20 review, semantic safety, old/new snapshot isolation and rollback.
2. Deterministically build a separate `2.1.0` pack with explicit input, calculation, symbol and hypothetical-example boundaries.
3. Activate only new snapshots and retain `2.0.0` for old snapshots.
4. Prove retrieval, prompts, saved-attempt review and hash failure behavior.
5. Bind a truthful local candidate without provider-output claims.
6. Run focused, related, full, typecheck, build, review, ProjectOps and CreamWIKI gates.

## Acceptance

- 20/20 blocks pass semantic review.
- No marriage date, probability, partner intent, family response, fertility choice or relationship outcome is invented.
- Financial, housing, career and children topics require actual user input and mutual confirmation.
- Threat, control, violence and contact refusal prioritize safety and boundaries.
- Hypothetical examples are labeled and unsupported prescription numbers are absent.
- New snapshots use `2.1.0`; stored `2.0.0` snapshots and rollback remain valid.
- Provider generation, customer data, Production, commit, push and deployment are out of scope.

## Result

DONE on 2026-09-13. All six vertical slices and every acceptance item passed.
The active registry is `tone-v2.2.0.4`; new `marry_match` snapshots use the
reviewed `2.1.0` pack and stored `2.0.0` snapshots remain isolated through
retrieval, prompt construction and saved-attempt review. Focused tests passed
8/8, related tests 74/74 and the full repository 751/751 across 105 suites.
Provider output evaluation and Production attachment were not run.
