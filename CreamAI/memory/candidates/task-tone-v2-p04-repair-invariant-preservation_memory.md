# ProjectOps Memory Candidate

task_id: task-tone-v2-p04-repair-invariant-preservation
date: 2026-09-12
case_type: deterministic contract success and provider acceptance failure
failure_type: retry output regressed a previously passing next-criterion invariant
success_pattern: numbered current failures plus a reusable invariant checklist without rejected prose
problem: retry guidance targeted only current failures, so later attempts could introduce different quality defects.
solution: restate direct answer, evidence layers, fictional-scene boundary, next criterion, Hanja, paragraph, voice, safety, numeric, internal-field, corpus-copy and sibling-uniqueness invariants on every repair.
root_cause: a repair message is an influential final instruction; leaving original invariants implicit lets the provider optimize only the listed failures.
why_it_worked: deterministic interception proves the full checklist is present and rejected prose remains absent. It did not achieve live completion because nextCriterion still regressed.
reuse_condition: multi-gate LLM generation where retries receive a separate final repair message.
do_not_use_when: repair can patch a structured field deterministically without regenerating prose.
related_files: src/report/report-generator.ts; tests/unit/report-persistence.test.ts; tone-v2/evaluations/P04-repair-invariant-preservation-20260912.json
recommended_prompt: Repair the numbered failures while preserving every original quality invariant; do not copy rejected prose.
recommended_command: npx tsx --test tests/unit/report-persistence.test.ts
revalidation_command: npm test
expires_at: when repair construction or the generation quality contract changes
privacy_level: internal
should_promote_to_rag: false

## Evidence
- tests: RED 9/10 to GREEN 10/10; focused 48/48; full 682/682; compiler/task 7/7; typecheck/build/diff PASS
- provider: first item 0/52; later/outside-limit calls 0; attempt 2 nextCriterion regression
- privacy: raw prose and credentials excluded from tracked evidence
- CreamWIKI: `personal/carrotcap/notes/umsh-tone-v2-repair-invariant-preservation-20260912.md` put/get/exact-title search PASS; server reindex NOT_RUN

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
