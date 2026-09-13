# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-today-fortune-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: unlabeled-daily-scenarios-and-prophecy-boundary
success_pattern: preserve old corpus, review the daily block, pin RAG consumers to the stored snapshot and leave the deterministic renderer unchanged
problem: the legacy daily block mixed migration boilerplate with unlabeled behavior scenes and did not cleanly distinguish calculated symbols from actual schedules
solution: rewrite the block around server-calculated date pillars, user-confirmed schedule facts, symbolic questions and labeled hypothetical examples, then activate a separate 2.1.0 file
root_cause: automated migration appended policy text but did not semantically review the single service block
why_it_worked: executable semantic assertions and content-hash-checked snapshot tests cover all RAG consumers while dedicated daily tests prove the renderer stayed stable
reuse_condition: a service has both RAG grounding and a separate deterministic output path that must not be conflated
do_not_use_when: claiming that changing the RAG corpus changed or evaluated the deterministic renderer or provider output
related_files: data/tone-v2/corpus/releases/today-fortune-service-2.1.0.json; tests/unit/today-fortune-corpus-release.test.ts; tone-v2/releases/today-fortune-2.1.0.json
recommended_prompt: Review the daily corpus for calculation versus observation, labeled hypothetical examples, arbitrary time or count prescriptions, event certainty and other-person reaction inference.
recommended_command: node --import tsx --test tests/unit/today-fortune-corpus-release.test.ts
revalidation_command: node tone-v2/build-today-fortune-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate whenever the corpus registry, report snapshot schema, today_fortune contract or deterministic daily renderer changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: 8/8 task-specific; 82/82 related; 759/759 full repository
- review: CreamAI/logs/review/task-tone-v2-p05-today-fortune-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, vercel-build, ProjectOps and credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
