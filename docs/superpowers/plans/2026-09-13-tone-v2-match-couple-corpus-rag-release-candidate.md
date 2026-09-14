# Tone V2 match_couple corpus, RAG and release-candidate plan

## Goal

Replace the active `match_couple` corpus with a separate, semantically reviewed
version while keeping every existing report pinned to its stored corpus snapshot.

## Confirmed gap

- The active pack is `2.0.0`; all 18 blocks are `needs_semantic_review`.
- Legacy blocks infer unprovided relationship scenes, partner emotions and future
  outcomes from symbolic values, and several prescribe arbitrary counts or periods.
- Snapshot-pinned runtime support exists but has not been proven for this service.

## Vertical slices

1. RED tests for the reviewed pack, all 18 review records, content boundaries, old/new snapshot isolation and rollback manifest.
2. Deterministically build a separate `2.1.0` pack with explicit two-person input, calculation, symbol, hypothetical-example and safety boundaries.
3. Activate only the registry entry for new snapshots while retaining `2.0.0`.
4. Prove retrieval, section prompts, saved-attempt review and hash-failure behavior for both snapshots.
5. Record a truthful local candidate without claiming provider-output evaluation.
6. Run focused, related, full, typecheck, build, review, ProjectOps and CreamWIKI gates.

## Acceptance

- 18/18 blocks pass explicit semantic review.
- No partner mind, affection level, abuse status, relationship duration or future outcome is invented.
- 합·충·오행·십성·운 흐름 remain symbolic hypotheses, not relationship facts.
- Hypothetical scenes are visibly labeled; arbitrary periods/counts are absent.
- Threat, control or violence routes to safety and professional support rather than compatibility interpretation.
- New snapshots use `2.1.0`; stored `2.0.0` snapshots remain unchanged and rollback is registry-only.
- Provider generation, customer data, Production, commit, push and deployment remain out of scope.
