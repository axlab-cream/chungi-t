# Tone V2 home_fit corpus/RAG release-candidate plan

## Goal

Version and review all 12 `home_fit` corpus blocks for new snapshots while preserving `2.0.0` for stored reports.

## Evidence and boundaries

- CreamWIKI and Tone V2 rules require user observations, server measurements, missing values and symbolic interpretation to stay separate.
- The original blocks repeat migration boilerplate and do not explicitly label hypothetical scenes.
- Missing terrain, light, air, noise, building or room measurements remain unknown; similar-place patterns cannot substitute for measurement.
- Feng-shui symbols cannot establish safety, accidents, health, sleep recovery, productivity, wealth, relationship outcomes, property value or a move/contract decision.
- Actual structural, medical, financial and contract decisions remain with verified evidence and appropriate professionals.

## AIOS routes

- `11 Ops`: versioned registry transition and rollback.
- `12 QA/Eval`: 12-block semantic review, snapshot consumers and full regression.
- `14 Memory/KMS`: search-first evidence and verified reusable work-log.

## Vertical slices

1. RED semantic/snapshot assertions.
2. Deterministic reviewed `2.1.0` pack.
3. New-snapshot registry attachment with old-snapshot preservation.
4. Retrieval, prompt, saved-review and hash-failure proof.
5. Truthful rollback candidate.
6. Focused/related/full/typecheck/build/review/ProjectOps/KMS verification.

## Acceptance

- 12/12 semantic reviews pass.
- User observations, server measurements, missing values and symbolic readings remain distinct.
- No unmeasured physical claim or deterministic safety/health/wealth/relationship/property/contract outcome.
- Hypothetical examples are labeled and professional boundaries are explicit.
- New snapshots use 2.1.0; stored 2.0.0 snapshots and registry-only rollback remain valid.

## Non-scope

- Provider generation, Production, customer data, DB/auth/payment/admin, commit, push and deployment.
