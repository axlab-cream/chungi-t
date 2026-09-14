# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-job-choice-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: invented-offer-company-and-symbolic-career-outcome-boundary
success_pattern: distinguish confirmed offer documents and work facts from calculated values, unknown company reality, employer intent and symbolic comparison questions
problem: migration boilerplate and unlabeled scenes blurred user questions with invented role, organization, compensation, commute, contact, health and negotiation conditions
solution: version all 12 blocks with explicit document/calculation/user-fact/unknown-company/symbol layers, Ziwei-viewpoint disclaimers, professional boundaries and stored-snapshot isolation
root_cause: automated migration did not perform offer-document, company-reality, employer-intent, numeric, health, contract, labor and financial semantic review
why_it_worked: executable assertions cover every block plus active/stored retrieval, prompt generation, saved prose review and hash mismatch fail-closed behavior
reuse_condition: a career corpus compares offers, roles, compensation, company conditions or symbolic job-choice viewpoints
do_not_use_when: treating astrology as hiring evidence, inferring employer intent or hidden company facts, replacing contract review, or prescribing unsupported dates and counts
related_files: data/tone-v2/corpus/releases/job-choice-service-2.1.0.json; tests/unit/job-choice-corpus-release.test.ts; tone-v2/releases/job-choice-2.1.0.json
recommended_prompt: Separate confirmed offer documents and server calculations from unknown company reality and symbolic viewpoints; then prove stored snapshot isolation.
recommended_command: node --import tsx --test tests/unit/job-choice-corpus-release.test.ts
revalidation_command: node tone-v2/build-job-choice-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema or job_choice contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence

- tests: focused 8/8; related 217/217; full 871/871
- review: CreamAI/logs/review/task-tone-v2-p05-job-choice-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, tests, typecheck, build, ProjectOps and credential scan

## Redaction Check

- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
