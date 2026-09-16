# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-all-service-corpus-release-evaluation
date: 2026-09-13
case_type: release-readiness-audit
failure_type: incomplete-cross-service-evidence
success_pattern: deterministic-fail-closed-aggregate
problem: Individually reviewed service artifacts can appear release-ready even when provider output, full-outline human review and visual evidence are incomplete.
solution: Build one deterministic aggregate directly from the runtime service manifest, corpus registry, release manifests, semantic reviews, prompt/persona files and rollback sources; separate corpus-layer readiness from complete release readiness and emit explicit coverage counts plus blockers.
root_cause: Per-service candidate checks prove local corpus integrity but do not prove the complete cross-service release contract.
why_it_worked: File hashes and exact service-set equality make the audit reproducible, while explicit zero or partial evidence counts prevent deterministic tests from being relabeled as provider or visual evidence.
reuse_condition: Use when multiple separately reviewed versioned candidates must be evaluated for one release without changing Production.
do_not_use_when: Do not use the aggregate as a substitute for actual provider prose review, full-outline human review, browser/render/mobile/print QA or an approved Production rollback drill.
related_files: tone-v2/build-all-service-corpus-release-evaluation.mjs; tone-v2/releases/all-service-corpus-2.1.0.json; tests/unit/all-service-corpus-release-evaluation.test.ts
recommended_prompt: Audit every candidate from actual files, distinguish each evidence layer and fail the release gate closed when any mandatory layer is incomplete.
recommended_command: node tone-v2/build-all-service-corpus-release-evaluation.mjs
revalidation_command: npx tsx --test tests/unit/all-service-corpus-release-evaluation.test.ts
expires_at: 2027-09-13
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 7/7; related 279/279; full 887/887 across 122 suites
- review: Approved with comments; Critical/Major/Minor 0
- commands: deterministic builder twice, repository tests, Vercel build and task-scoped credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
