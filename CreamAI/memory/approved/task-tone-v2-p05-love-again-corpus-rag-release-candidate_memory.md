# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-love-again-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: reunion-intent-inference-and-unlabeled-scenario-risk
success_pattern: separate confirmed relationship events from reunion intent, honor refusal and danger signals, and pin stored snapshots
problem: migration boilerplate and unlabeled scenarios blurred confirmed contact with longing, consent and future reunion
solution: version a reviewed block that limits facts to user-confirmed events and direct expressions, keeps reunion intent unknown without agreement, and routes refusal or danger to boundaries and safety
root_cause: automated migration did not perform reunion-domain semantic and safety review
why_it_worked: executable assertions cover history, reunion inference, refusal, contact-stop, danger signals and every stored-snapshot consumer
reuse_condition: a relationship corpus discusses reconciliation, renewed contact or another person's future intent
do_not_use_when: converting contact, silence, ambiguity, refusal, coercion, stalking or violence into evidence of reunion
related_files: data/tone-v2/corpus/releases/love-again-service-2.1.0.json; tests/unit/love-again-corpus-release.test.ts; tone-v2/releases/love-again-2.1.0.json
recommended_prompt: Separate confirmed events, direct statements, unknown reunion intent, consent boundaries and danger signals; then prove snapshot isolation.
recommended_command: node --import tsx --test tests/unit/love-again-corpus-release.test.ts
revalidation_command: node tone-v2/build-love-again-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema or love_again contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 88/88; full 791/791
- review: CreamAI/logs/review/task-tone-v2-p05-love-again-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, tests, typecheck, build, ProjectOps, credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
