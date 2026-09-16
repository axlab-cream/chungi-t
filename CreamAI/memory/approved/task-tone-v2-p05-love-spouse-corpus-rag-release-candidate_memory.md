# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-love-spouse-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: future-spouse-identity-timing-and-unlabeled-scenario-risk
success_pattern: separate user-stated relationship conditions from future-person prediction, enforce autonomy and safety, and pin stored snapshots
problem: migration boilerplate and unlabeled scenes blurred user preferences and observed behavior with future spouse identity, attributes and timing
solution: version a reviewed block that treats only user-stated conditions and observed actions as facts, uses chart values as symbolic questions, and rejects identity, timing, mind and outcome predictions
root_cause: automated migration did not perform future-spouse-domain semantic, autonomy and safety review
why_it_worked: executable assertions cover input facts, identity, attributes, timing, autonomy, safety and every stored-snapshot consumer
reuse_condition: a corpus discusses an unknown future person, partner attributes, meeting timing or marriage outcomes
do_not_use_when: identifying a person, prescribing gender roles or converting refusal, coercion, control, stalking or violence into compatibility
related_files: data/tone-v2/corpus/releases/love-spouse-service-2.1.0.json; tests/unit/love-spouse-corpus-release.test.ts; tone-v2/releases/love-spouse-2.1.0.json
recommended_prompt: Separate user-stated preferences and observed behavior from calculated symbols and unknown future-person claims; then prove snapshot isolation.
recommended_command: node --import tsx --test tests/unit/love-spouse-corpus-release.test.ts
revalidation_command: node tone-v2/build-love-spouse-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema or love_spouse contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 88/88; full 799/799
- review: CreamAI/logs/review/task-tone-v2-p05-love-spouse-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, tests, typecheck, build, ProjectOps, credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
