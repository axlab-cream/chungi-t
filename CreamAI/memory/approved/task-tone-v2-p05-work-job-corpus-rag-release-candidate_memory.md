# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-work-job-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: unlabeled-work-scenes-and-symbolic-fact-mixing
success_pattern: preserve old corpus, separate work evidence layers, pin RAG consumers to stored snapshots and publish a reversible local candidate
problem: the legacy work-job block mixed migration boilerplate, unlabeled scenes and calculated symbols with implied work facts
solution: rewrite around user-confirmed work records, server calculations, symbolic questions and labeled hypothetical examples, then activate a separate 2.1.0 file
root_cause: automated migration did not perform service-level semantic review
why_it_worked: executable content assertions, runtime-typed fixtures and content-hash snapshot tests cover all consumers
reuse_condition: career or aptitude corpus changes while stored outputs must remain reproducible
do_not_use_when: asserting a destined job, hiring, promotion, income, performance, resignation result or colleague intent
related_files: data/tone-v2/corpus/releases/work-job-service-2.1.0.json; tests/unit/work-job-corpus-release.test.ts; tone-v2/releases/work-job-2.1.0.json
recommended_prompt: Separate observed work history from calculated symbols and hypothetical examples, then test every stored-snapshot consumer.
recommended_command: node --import tsx --test tests/unit/work-job-corpus-release.test.ts
revalidation_command: node tone-v2/build-work-job-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate whenever the corpus registry, report snapshot schema or work_job contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: 8/8 task-specific; 100/100 related; 775/775 full repository
- review: CreamAI/logs/review/task-tone-v2-p05-work-job-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, vercel-build, ProjectOps and credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
