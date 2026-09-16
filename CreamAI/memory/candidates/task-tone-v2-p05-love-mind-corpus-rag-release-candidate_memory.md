# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-love-mind-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: unlabeled-relationship-scenes-and-mind-inference-risk
success_pattern: separate observed behavior from private mental state, preserve refusal and safety boundaries, and pin stored snapshots
problem: migration boilerplate and unlabeled contact scenes obscured the line between observed behavior and inferred feeling
solution: version a reviewed block that treats contact as evidence only of contact, preserves unknowns, respects refusal and routes danger to safety
root_cause: automated migration did not perform relationship-domain semantic review
why_it_worked: executable assertions cover mind inference, refusal, danger signals and every snapshot consumer
reuse_condition: a relationship corpus discusses another person's feelings, intent or future behavior
do_not_use_when: turning silence, ambiguity, refusal, coercion or violence into romantic evidence
related_files: data/tone-v2/corpus/releases/love-mind-service-2.1.0.json; tests/unit/love-mind-corpus-release.test.ts; tone-v2/releases/love-mind-2.1.0.json
recommended_prompt: Separate observed actions, direct statements, unknown mental states and safety signals; then prove snapshot isolation.
recommended_command: node --import tsx --test tests/unit/love-mind-corpus-release.test.ts
revalidation_command: node tone-v2/build-love-mind-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema or love_mind contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 88/88; full 783/783
- review: CreamAI/logs/review/task-tone-v2-p05-love-mind-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, tests, typecheck, build, ProjectOps, credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
