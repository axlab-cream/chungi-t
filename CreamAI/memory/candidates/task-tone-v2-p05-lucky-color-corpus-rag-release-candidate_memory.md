# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-lucky-color-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: symbolic color efficacy claims plus invented environment, routine and numeric prescriptions
success_pattern: preserve the old corpus, separate calculations and symbols from confirmed reality, keep missing environment unknown, and publish only a reversible local candidate
problem: twenty-four migrated blocks mixed symbolic color, material and direction associations with invented rooms, clothing, food, sleep, reactions and unsupported counts or durations
solution: rewrite every block around server-calculated chart values and user-confirmed choices, label hypothetical scenes, reject efficacy and outcome claims, and keep health, food, sleep and financial decisions outside symbolic guidance
root_cause: automated migration appended generic policy text but did not perform item-level evidence, efficacy, environmental-fact, health or numeric review
why_it_worked: executable assertions cover all 24 blocks plus active/stored retrieval, prompt construction, saved-prose review, hash mismatch and truthful release state
reuse_condition: a symbolic recommendation corpus changes while old reports must retain their original grounding
do_not_use_when: claiming physical or psychological efficacy, medical or nutritional benefit, financial outcome, or provider-output quality without evidence
related_files: data/tone-v2/corpus/releases/lucky-color-service-2.1.0.json; tests/unit/lucky-color-corpus-release.test.ts; tone-v2/releases/lucky-color-2.1.0.json
recommended_prompt: Treat calculated elements as chart values and colors, materials or directions as symbolic questions only; use confirmed user context, keep missing reality unknown, and make no efficacy or outcome claim.
recommended_command: node --import tsx --test tests/unit/lucky-color-corpus-release.test.ts
revalidation_command: node tone-v2/build-lucky-color-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema, lucky_color service or symbolic recommendation policy changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 147/147; full 847/847; typecheck/build PASS
- review: CreamAI/logs/review/task-tone-v2-p05-lucky-color-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, Vercel build, ProjectOps and credential boundary scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

