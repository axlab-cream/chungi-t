# Tone V2 quit_fortune corpus, RAG and release-candidate plan

## Goal

Replace the active `quit_fortune` corpus with a separately versioned, semantically
reviewed pack; prove that report generation uses the corpus snapshot stored when
the report was created; and assemble a reversible local release candidate.

## Confirmed gap

- The runtime already reads the Tone V2 registry, but the quit-fortune pack is
  still `2.0.0` and its audit remains `needs_semantic_review`.
- Report records store a corpus snapshot, but generation currently retrieves
  against the latest global registry instead of that stored snapshot.
- Therefore a corpus switch can mix versions inside an already-started report.

## Vertical slices

1. RED: prove snapshot A cannot currently keep its own corpus after registry B becomes active.
2. Add snapshot-aware corpus loading and pass the saved snapshot through generation and saved-attempt review.
3. Build `quit_fortune` corpus `2.1.0` as a separate file with all 12 blocks reviewed for evidence, conditions, numerical provenance, safety and forbidden generalization.
4. Point only the active quit-fortune registry entry to `2.1.0`; retain `2.0.0` at its existing path for rollback.
5. Add a release-candidate manifest that binds prompt bundle, corpus hash, generation evidence, new-report-only behavior and rollback target.
6. Verify focused/full/typecheck/build, independent review and CreamWIKI evidence.

## Acceptance

- New report snapshots select quit-fortune corpus `2.1.0`.
- An existing report with a `2.0.0` snapshot continues retrieving `2.0.0` during later section generation and saved-attempt review.
- RAG always includes the snapshot-selected `quit_fortune_service` domain and does not ingest supplied sample output.
- All 12 blocks have an explicit semantic-review result and no unsupported prescription number or deterministic human outcome.
- Rollback is a registry-only path/version restoration; no customer record rewrite is required.
- Production deployment, DB/auth/payment changes and operating customer data remain out of scope.
