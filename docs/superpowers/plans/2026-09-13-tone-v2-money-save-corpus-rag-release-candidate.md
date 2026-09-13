# Tone V2 money_save corpus, RAG and release-candidate plan

## Goal

Replace the active `money_save` corpus with a separately versioned, semantically
reviewed pack and prove that new reports use it while existing report snapshots
continue using their original corpus without customer-record rewrites.

## Confirmed gap

- The active money-save pack is `2.0.0` and its audit is still
  `needs_semantic_review`.
- Several legacy blocks turn unverified habits into facts, prescribe arbitrary
  periods or counts, or present symbolic interpretation as financial advice.
- Snapshot-pinned loading is already implemented by the preceding quit-fortune
  Task, but it has not yet been proven for `money_save`.

## Vertical slices

1. RED: lock the expected reviewed pack, semantic boundaries, snapshot-specific retrieval and rollback manifest.
2. Build `money_save` corpus `2.1.0` as a separate deterministic file and review all 12 blocks.
3. Point only the active money-save registry entry to `2.1.0`, retaining `2.0.0` for rollback.
4. Prove active/new and stored/old snapshots select different corpus text in retrieval, prompt construction and saved-attempt review.
5. Bind prompt bundle, corpus hashes, truthful evidence state, new-report-only attachment and rollback in a local candidate manifest.
6. Run focused/full/typecheck/build, code review, ProjectOps evidence and CreamWIKI knowledge capture.

## Acceptance

- New report snapshots select money-save corpus `2.1.0`.
- A stored `2.0.0` snapshot retrieves and reviews against `2.0.0` only.
- Every block distinguishes user input, server calculation, symbolic hypothesis and hypothetical example.
- No block invents income, balances, expenses, percentages, amounts, periods, returns or a deterministic outcome.
- Investment/debt content remains educational and routes material distress to appropriate professional or public support.
- The candidate manifest does not claim actual provider output evaluation when none exists.
- Rollback restores only the registry path/version and does not rewrite customer records.
- Production deployment, provider generation, customer data and DB/auth/payment changes remain out of scope.
