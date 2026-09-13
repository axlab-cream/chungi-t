# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-money-save-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: unreviewed-semantic-prescription
success_pattern: preserve the old corpus, create an explicit reviewed version, pin report retrieval to the stored snapshot, and use a registry-only rollback
problem: the active money-save corpus mixed symbolic claims with unsupported financial habit facts and arbitrary periods or counts
solution: rewrite all twelve blocks with input/calculation/symbol/hypothetical boundaries, activate a separate 2.1.0 file, and assert old/new snapshot isolation through retrieval, prompts and saved-attempt review
root_cause: a global migration suffix did not semantically validate each financial block and the service had no release-specific proof
why_it_worked: executable content assertions and content-hash-checked snapshots make semantic and attachment claims independently reproducible
reuse_condition: a service corpus is replaced for new reports while immutable reports must retain their original retrieval basis
do_not_use_when: existing customer records must be rewritten or provider-output quality is being claimed without an actual provider evaluation
related_files: data/tone-v2/corpus/releases/money-save-service-2.1.0.json; tests/unit/money-save-corpus-release.test.ts; tone-v2/releases/money-save-2.1.0.json
recommended_prompt: Review every corpus block for input, calculated value, symbolic hypothesis, hypothetical example, numeric provenance and deterministic outcome boundaries before activation.
recommended_command: node --import tsx --test tests/unit/money-save-corpus-release.test.ts
revalidation_command: node tone-v2/build-money-save-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate whenever the corpus registry, report snapshot schema or money_save prompt contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: 8/8 task-specific; 74/74 related; full root suite evidence in the Task evaluation
- review: CreamAI/logs/review/task-tone-v2-p05-money-save-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, vercel-build, credential boundary scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
