# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-marry-match-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: marriage-inference-and-deterministic-outcome
success_pattern: preserve old corpus, explicitly review every marriage block, pin retrieval to the stored snapshot and use registry-only rollback
problem: twenty legacy blocks mixed symbolic compatibility values with unprovided marriage timing, partner or family reactions and universal prescriptions
solution: rewrite all blocks with input, calculation, symbol, hypothetical-example, autonomy and safety boundaries, then activate a separate 2.1.0 file
root_cause: a shared migration suffix did not validate each marriage, family, housing, finance or reproductive claim
why_it_worked: executable semantic assertions and content-hash-checked snapshot tests cover both the corpus artifact and every runtime consumer
reuse_condition: a marriage corpus changes for new reports while old reports must retain their original grounding
do_not_use_when: provider-output quality, marriage probability, partner intent or abuse-risk assessment is being claimed without separate evidence
related_files: data/tone-v2/corpus/releases/marry-match-service-2.1.0.json; tests/unit/marry-match-corpus-release.test.ts; tone-v2/releases/marry-match-2.1.0.json
recommended_prompt: Review each marriage block for partner and family mind inference, deterministic outcomes, reproductive autonomy, symbolic boundaries, hypothetical labeling and threat/control/violence safety routing.
recommended_command: node --import tsx --test tests/unit/marry-match-corpus-release.test.ts
revalidation_command: node tone-v2/build-marry-match-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate whenever the corpus registry, report snapshot schema or marry_match contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: 8/8 task-specific; 74/74 related; 751/751 full repository
- review: CreamAI/logs/review/task-tone-v2-p05-marry-match-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, vercel-build, ProjectOps and credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
