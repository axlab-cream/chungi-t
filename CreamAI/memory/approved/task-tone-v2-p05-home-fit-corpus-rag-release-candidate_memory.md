# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-home-fit-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: missing-measurement-substitution-and-dedicated-snapshot-bypass
success_pattern: keep observations, measurements, unknowns and symbols separate, and pass stored snapshots through every dedicated corpus consumer
problem: migrated home corpus blurred missing measurements with analogous patterns, while a dedicated home reader bypassed stored corpus snapshots
solution: version all 12 blocks with explicit evidence boundaries, prohibit deterministic physical and property claims, label hypothetical scenes, and thread CorpusSnapshot through home prompt and saved-review consumers
root_cause: migration boilerplate lacked home-domain semantic review and snapshot coverage focused on the generic RAG path only
why_it_worked: executable assertions cover all 12 blocks plus active/stored retrieval, dedicated prompt generation, saved prose review and hash mismatch fail-closed behavior
reuse_condition: a domain-specific corpus helper bypasses the generic retriever or discusses unavailable environmental measurements
do_not_use_when: substituting symbolic readings for inspections, measurements, medical advice, financial evidence, structural review or contract review
related_files: data/tone-v2/corpus/releases/home-fit-service-2.1.0.json; src/report/home-reading-corpus.ts; src/report/report-generator.ts; tests/unit/home-fit-corpus-release.test.ts
recommended_prompt: Keep user observations, server measurements, missing values and symbols distinct, then prove every generic and dedicated consumer uses the stored snapshot.
recommended_command: node --import tsx --test tests/unit/home-fit-corpus-release.test.ts
revalidation_command: node tone-v2/build-home-fit-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema, home reading helper or home_fit contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 107/107; full 807/807
- review: CreamAI/logs/review/task-tone-v2-p05-home-fit-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, tests, typecheck, build, ProjectOps and credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
