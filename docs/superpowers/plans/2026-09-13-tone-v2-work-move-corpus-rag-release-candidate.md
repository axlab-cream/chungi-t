# Tone V2 work_move corpus/RAG release-candidate plan

## Goal

Version and review all 10 `work_move` corpus blocks for new snapshots while preserving `2.0.0` for stored reports.

## Evidence and boundaries

- CreamWIKI career evidence rules require user-confirmed work facts, server-calculated chart values, unknown company conditions and symbolic interpretations to stay separate.
- The original blocks repeat migration boilerplate and contain unlabeled hypothetical scenes.
- A verbal promise is a user-reported statement, not a verified written employment condition; unknown company culture, hiring outcome and another person's intent remain unknown.
- Salary, contract, resignation, health and financial decisions require actual documents, current circumstances and appropriate professional support.
- Chart symbols and timing cannot establish hiring, rejection, promotion, salary, resignation success, layoffs or future workplace outcomes.

## AIOS routes

- `11 Ops`: versioned registry transition and rollback.
- `12 QA/Eval`: 10-block semantic review, snapshot consumers and full regression.
- `14 Memory/KMS`: search-first evidence and verified reusable work-log.

## Vertical slices

1. RED semantic/snapshot assertions.
2. Deterministic reviewed `2.1.0` pack.
3. New-snapshot registry attachment with old-snapshot preservation.
4. Retrieval, prompt, saved-review and hash-failure proof.
5. Truthful rollback candidate.
6. Focused/related/full/typecheck/build/review/ProjectOps/KMS verification.

## Acceptance

- 10/10 semantic reviews pass.
- User facts, documents, server calculations, unknowns and symbolic readings remain distinct.
- No invented company culture, hiring/salary/timing outcome, other-person intent, or unsupported numeric prescription.
- Hypothetical examples are labeled and contract/health/financial boundaries are explicit.
- New snapshots use 2.1.0; stored 2.0.0 snapshots and registry-only rollback remain valid.

## Non-scope

- Provider generation, Production, customer data, DB/auth/payment/admin, commit, push and deployment.
