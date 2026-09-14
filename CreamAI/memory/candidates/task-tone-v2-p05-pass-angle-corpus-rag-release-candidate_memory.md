# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-pass-angle-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: symbolic-study-traits-and-unsupported-schedule-prescriptions
success_pattern: ground exam guidance in official dates and actual study records while keeping chart values symbolic and old generated records pinned
problem: migrated blocks described calculated symbols as learning traits and embedded unsupported fixed study periods and D-day stages
solution: version all 8 blocks with exam-fact, official-document, study-record, calculation, symbol, numeric and health boundaries
root_cause: automated migration did not perform exam-domain semantic or numeric provenance review
why_it_worked: executable assertions cover all blocks plus active/stored retrieval, prompt generation, saved prose review, hash mismatch and truthful prior-output handling
reuse_condition: an exam corpus discusses intelligence, study style, pass timing, D-day routines, burnout or completed outputs generated under an older corpus
do_not_use_when: predicting pass/fail, diagnosing health, inventing study periods, or relabeling old provider output as evidence for a new corpus
related_files: data/tone-v2/corpus/releases/pass-angle-service-2.1.0.json; tests/unit/pass-angle-corpus-release.test.ts; tone-v2/releases/pass-angle-2.1.0.json
recommended_prompt: Use confirmed exam facts, official instructions and actual study records; keep calculated symbols separate and preserve every old snapshot and completed identity.
recommended_command: node --import tsx --test tests/unit/pass-angle-corpus-release.test.ts
revalidation_command: node tone-v2/build-pass-angle-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema, pass_angle contract or completed-record schema changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 143/143; full 823/823
- review: CreamAI/logs/review/task-tone-v2-p05-pass-angle-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, tests, typecheck, build, ProjectOps and credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
