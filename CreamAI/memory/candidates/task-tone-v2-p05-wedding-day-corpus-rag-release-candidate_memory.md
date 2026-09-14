# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-wedding-day-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: candidate-date calculations mixed with invented partner, family, contract, condition and post-wedding facts
success_pattern: preserve the old corpus, compare only submitted dates, keep missing partner and time inputs unknown, and publish a reversible local candidate
problem: six migrated blocks mixed calculated date relations with invented venue constraints, family feelings, wedding-day condition, post-wedding rhythm and unsupported counts or periods
solution: rewrite every block around submitted candidate dates, server calculations and confirmed constraints, label hypothetical scenes, keep partner privacy and unknown-time limits explicit, and retain old snapshot retrieval by version and hash
root_cause: automated migration appended generic policy text without item-level date-input, privacy, reality, professional or numeric review
why_it_worked: executable assertions cover all six blocks plus active/stored retrieval, prompt construction, saved-prose review, hash mismatch and truthful release state; a related customer-prose test also caught a negated internal term
reuse_condition: a date-selection corpus changes while old reports must retain their original grounding
do_not_use_when: claiming marriage outcomes, favorable-date accuracy, partner or family states, or provider-output quality without evidence
related_files: data/tone-v2/corpus/releases/wedding-day-service-2.1.0.json; tests/unit/wedding-day-corpus-release.test.ts; tone-v2/releases/wedding-day-2.1.0.json
recommended_prompt: Compare only submitted candidate dates and server-calculated relations; use confirmed schedule and contract constraints, keep missing partner or time-dependent facts unknown, and make no marriage-outcome claim.
recommended_command: node --import tsx --test tests/unit/wedding-day-corpus-release.test.ts
revalidation_command: node tone-v2/build-wedding-day-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema, wedding_day service or date-selection policy changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 232/232; full 863/863; typecheck/build PASS
- review: CreamAI/logs/review/task-tone-v2-p05-wedding-day-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, Vercel build, ProjectOps and credential boundary scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
