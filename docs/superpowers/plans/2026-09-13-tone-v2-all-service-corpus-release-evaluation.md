# all-service corpus release evaluation plan

Task: `task-tone-v2-p05-all-service-corpus-release-evaluation`

## Objective

Aggregate every service-specific 2.1.0 corpus candidate into one deterministic audit, prove registry/review/release/rollback integrity and report whether the full Tone V2 release contract is actually satisfied.

## Scope

1. Freeze the expected 20-service set from the runtime prompt manifest.
2. Add a failing contract for exact service coverage, candidate/review hashes, approved block checks, stored rollback files and no Production deployment.
3. Verify service personas and corpus retrieval cover the same 20 service keys without fallback mixing.
4. Inventory provider-output, full-outline, actual image/render/mobile/print and Production attachment evidence.
5. Produce deterministic aggregate JSON and Markdown evidence with an explicit `GO` or `NO-GO` decision.
6. Run focused, related, full, build, deterministic, review, credential and ProjectOps gates.

## Non-scope

- New provider calls or generation of missing service reports.
- Browser/image/print QA execution.
- Production attachment, deployment or customer-record mutation.
- Commit or push.

## Acceptance

- Exactly 20 service candidates have matching registry, candidate, semantic-review and rollback hashes.
- Every semantic review is approved, contains only passing blocks/checks and ingests no sample output.
- Runtime persona and dedicated-corpus coverage matches the 20-service set.
- Missing release evidence becomes an explicit blocker, never a false PASS.
- The aggregate result is deterministic and Production/customer mutations remain zero.
