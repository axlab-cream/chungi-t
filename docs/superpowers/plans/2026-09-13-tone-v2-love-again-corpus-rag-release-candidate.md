# Tone V2 love_again corpus/RAG release-candidate plan

## Goal

Version and review the one-block `love_again` corpus for new snapshots while preserving `2.0.0` for stored reports.

## Gaps and boundaries

- Unlabeled hypothetical scenes and duplicated migration boilerplate.
- Past relationship facts must remain distinct from inferred longing, intent and reunion probability.
- Explicit refusal, contact-stop requests and danger signals override reunion interpretation.
- No predicted contact dates, guaranteed reunion, arbitrary waiting periods or contact counts.

## Vertical slices

1. RED semantic/snapshot assertions.
2. Deterministic reviewed `2.1.0` pack.
3. New-snapshot registry attachment with old-snapshot preservation.
4. Retrieval, prompt, saved-review and hash-failure proof.
5. Truthful rollback candidate.
6. Focused/related/full/typecheck/build/review/ProjectOps/KMS verification.

## Acceptance

- 1/1 semantic review passes.
- Only user-confirmed breakup, contact, direct words, changed behavior, consent and boundaries are facts.
- Reunion, contact, affection and future relationship outcomes are not predicted.
- Refusal and safety boundaries are explicit and hypothetical examples are labeled.
- New snapshots use 2.1.0; stored 2.0.0 snapshots and registry-only rollback remain valid.

## Result

- DONE: the single block passed semantic review and the reviewed 2.1.0 pack is active for new snapshots.
- Stored 2.0.0 snapshots remain isolated across retrieval, prompt construction and saved-attempt review; hash mismatch fails closed.
- Focused 8/8, related 88/88 and full 791/791 across 110 suites passed with typecheck, build, deterministic generation and closure review.
- Provider output evaluation, Production and customer-data mutation were not run.
