# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-newyear-flow-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: annual symbolic calculations mixed with future events, personal states and arbitrary numeric prescriptions
success_pattern: preserve the old corpus, treat calculated cycles as questions, use only confirmed reality, keep the future unknown, and publish a reversible local candidate
problem: ten migrated blocks mixed year and cycle calculations with invented work, money, relationship, health and routine scenes plus unsupported periods and counts
solution: rewrite every block and topic around server calculations and user-confirmed facts, label hypothetical scenes, reject future and personal-state claims, and retain old snapshot retrieval by version and hash
root_cause: automated migration appended generic policy text without item-level evidence review and left predictive titles in the retrieval surface
why_it_worked: executable assertions cover all ten blocks and topics plus active/stored retrieval, prompt construction, saved-prose review, hash mismatch and truthful release state
reuse_condition: a time-cycle corpus changes while old reports must retain their original grounding
do_not_use_when: claiming future-event accuracy, personal state, medical, legal, financial or provider-output quality without evidence
related_files: data/tone-v2/corpus/releases/newyear-service-2.1.0.json; tests/unit/newyear-flow-corpus-release.test.ts; tone-v2/releases/newyear-flow-2.1.0.json
recommended_prompt: Treat year, solar-term, monthly and ten-year-cycle calculations as symbolic questions only; use confirmed user facts and leave future events, outcomes and personal states unknown.
recommended_command: node --import tsx --test tests/unit/newyear-flow-corpus-release.test.ts
revalidation_command: node tone-v2/build-newyear-flow-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema, newyear_flow service or future-claim policy changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 218/218; full 855/855; typecheck/build PASS
- review: CreamAI/logs/review/task-tone-v2-p05-newyear-flow-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, Vercel build, ProjectOps and credential boundary scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
