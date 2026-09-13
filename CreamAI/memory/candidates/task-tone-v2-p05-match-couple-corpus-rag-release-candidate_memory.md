# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-match-couple-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: relationship-inference-and-deterministic-outcome
success_pattern: preserve old corpus, explicitly review every relationship block, pin retrieval to the stored snapshot and use registry-only rollback
problem: eighteen legacy blocks mixed symbolic compatibility values with unprovided scenes, partner emotions and universal relationship prescriptions
solution: rewrite all blocks with two-person input, calculation, symbol, hypothetical-example, partner-mind and safety boundaries, then activate a separate 2.1.0 file
root_cause: a shared migration suffix did not validate each relationship claim or safety context
why_it_worked: executable semantic assertions and content-hash-checked snapshot tests cover both the corpus artifact and every runtime consumer
reuse_condition: a relationship corpus changes for new reports while old reports must retain their original grounding
do_not_use_when: provider-output quality or abuse-risk assessment is being claimed without separate evidence and qualified support
related_files: data/tone-v2/corpus/releases/match-couple-service-2.1.0.json; tests/unit/match-couple-corpus-release.test.ts; tone-v2/releases/match-couple-2.1.0.json
recommended_prompt: Review each relationship block for partner-mind inference, deterministic outcomes, symbolic boundaries, hypothetical labeling and threat/control/violence safety routing.
recommended_command: node --import tsx --test tests/unit/match-couple-corpus-release.test.ts
revalidation_command: node tone-v2/build-match-couple-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate whenever the corpus registry, report snapshot schema or match_couple contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: 8/8 task-specific; 74/74 related; full root suite evidence in Task evaluation
- review: CreamAI/logs/review/task-tone-v2-p05-match-couple-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, vercel-build, credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
