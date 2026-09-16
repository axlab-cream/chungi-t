# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-saju-master-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: migration-boilerplate-and-symbolic-fact-mixing
success_pattern: preserve old corpus, separate evidence layers, pin all RAG consumers to stored snapshots, and publish only a reversible local candidate
problem: the legacy saju-master block mixed duplicated migration policy, unlabeled scenarios and symbolic chart interpretation without explicit fact boundaries
solution: rewrite the block around user-confirmed facts, server-calculated chart values, symbolic questions and labeled hypothetical examples, then activate a separate 2.1.0 file
root_cause: automated migration appended generic safety text but did not semantically review the service block
why_it_worked: executable content assertions and content-hash-checked snapshot tests cover retrieval, prompts, saved review and rollback
reuse_condition: a symbolic-domain corpus is versioned while stored outputs must remain reproducible
do_not_use_when: claiming chart symbols empirically prove personality, health, career, wealth, relationships, future events or professional decisions
related_files: data/tone-v2/corpus/releases/saju-master-service-2.1.0.json; tests/unit/saju-master-corpus-release.test.ts; tone-v2/releases/saju-master-2.1.0.json
recommended_prompt: Review each symbolic corpus block for user-fact, calculated-value, interpretation and hypothetical-example boundaries, then test stored-snapshot isolation.
recommended_command: node --import tsx --test tests/unit/saju-master-corpus-release.test.ts
revalidation_command: node tone-v2/build-saju-master-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate whenever the corpus registry, report snapshot schema or saju_master contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: 8/8 task-specific; 98/98 related; 767/767 full repository
- review: CreamAI/logs/review/task-tone-v2-p05-saju-master-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, vercel-build, ProjectOps and credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
