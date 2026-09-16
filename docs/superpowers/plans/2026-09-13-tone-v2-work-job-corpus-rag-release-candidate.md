# Tone V2 work_job corpus, RAG and release-candidate plan

## Goal

Create and activate a separately versioned, semantically reviewed `work_job`
corpus for new RAG snapshots while preserving the old corpus for stored reports.

## Confirmed gap

- The active `2.0.0` pack has one block and remains `needs_semantic_review`.
- Its work scenes are not labeled as hypothetical examples.
- Condition and forbidden-generalization fields repeat migration boilerplate.
- Calculated chart symbols are not explicitly separated from observed work history.

## Vertical slices

1. RED assertions for 1/1 review, career evidence boundaries, snapshot isolation and rollback.
2. Deterministic `2.1.0` pack separating user work facts, calculations, interpretation and hypothetical examples.
3. New-snapshot activation while retaining `2.0.0` for stored reports.
4. Retrieval, prompt, saved-review and hash-mismatch proof.
5. Truthful local candidate with no provider or Production claim.
6. Focused, related, full, typecheck, build, review, ProjectOps and CreamWIKI gates.

## Acceptance

- One block passes explicit semantic review.
- Job title, aptitude, hiring, promotion, income, performance and workplace intent are not inferred as facts.
- Current job, tasks, energy, authority and constraints require user-confirmed evidence.
- Examples are labeled; arbitrary counts, periods and guaranteed career prescriptions are absent.
- Employment, legal, health and financial decisions remain grounded in actual conditions and appropriate expertise.
- New snapshots use `2.1.0`; stored `2.0.0` snapshots and registry-only rollback remain valid.

## Result

DONE on 2026-09-13. The active registry is `tone-v2.2.0.7`; focused 8/8,
related 100/100 and full 775/775 across 108 suites passed. Typecheck caught one
test-fixture field mismatch, which was fixed to the runtime `work` contract and
all related gates were rerun successfully.
