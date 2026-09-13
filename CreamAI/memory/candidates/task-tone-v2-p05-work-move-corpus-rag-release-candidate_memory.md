# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-work-move-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: verbal-promise-and-symbolic-career-outcome-boundary
success_pattern: distinguish confirmed work facts and written terms from reported promises, unknown company conditions and symbolic chart questions
problem: migration boilerplate and unlabeled scenes could blur current observations, verbal promises, written terms and predicted hiring or resignation outcomes
solution: version all 10 blocks with explicit fact/document/unknown/symbol layers, professional boundaries and stored-snapshot isolation
root_cause: automated migration did not perform career-document, unknown-company, hiring, salary, timing, health and contract semantic review
why_it_worked: executable assertions cover every block plus active/stored retrieval, prompt generation, saved prose review and hash mismatch fail-closed behavior
reuse_condition: a career corpus discusses offers, verbal promises, company conditions, compensation, resignation or hiring timing
do_not_use_when: treating astrology as hiring evidence, replacing contract review, inferring company secrets or another person's intent, or prescribing an unsupported resignation date
related_files: data/tone-v2/corpus/releases/work-move-service-2.1.0.json; tests/unit/work-move-corpus-release.test.ts; tone-v2/releases/work-move-2.1.0.json
recommended_prompt: Separate user-confirmed facts and written terms from reported promises, unknown company conditions and symbolic calculations; then prove stored snapshot isolation.
recommended_command: node --import tsx --test tests/unit/work-move-corpus-release.test.ts
revalidation_command: node tone-v2/build-work-move-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema or work_move contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 153/153; full 815/815
- review: CreamAI/logs/review/task-tone-v2-p05-work-move-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, tests, typecheck, build, ProjectOps and credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
