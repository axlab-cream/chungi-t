# ProjectOps Memory Candidate

task_id: task-tone-v2-p04-pass-angle-first-section-quality
date: 2026-09-12
case_type: narrow prompt implementation success and provider acceptance failure
failure_type: retry regressed quality rules that the prior attempt had passed
success_pattern: section-specific generation contract plus first-item-only live harness
problem: the first pass_angle verdict lacked explicit instructions for symbol boundaries, a recognizable scene, a concrete next criterion and separated Hanja explanations.
solution: append the exact contract only to pass-angle-verdict and add a validated --limit=1 harness that proves no later item is called.
root_cause: section guidance was incomplete; after adding it, the remaining blocker is repair guidance that targets only current failures and does not preserve all quality invariants.
why_it_worked: deterministic tests prove exact scoping and the live run produced complementary failures without escaping the one-item boundary.
reuse_condition: provider retries whose attempts fix one gate while regressing another.
do_not_use_when: independent generations have no shared deterministic quality contract.
related_files: src/report/report-generator.ts; scripts/check-pass-angle-outline-live.ts; tests/unit/tone-v2-generation.test.ts; tests/unit/reading-live-harness.test.ts; tone-v2/evaluations/P04-pass-angle-first-section-quality-20260912.json
recommended_prompt: Repair every listed failure while preserving every other quality, safety, structure, voice and grounding invariant from the original contract.
recommended_command: npx tsx --test tests/unit/tone-v2-generation.test.ts tests/unit/reading-live-harness.test.ts
revalidation_command: npm test
expires_at: when retry construction or the report quality contract changes
privacy_level: internal
should_promote_to_rag: false

## Evidence
- tests: focused 48/48; full 682/682; compiler/task 7/7; typecheck/build/diff PASS
- provider: first item 0/52 after two attempts; later/outside-limit calls 0
- evaluation: only hashes, rule labels and usage metadata retained; raw prose and credentials excluded

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

## CreamWIKI Sync

- path: personal/carrotcap/notes/umsh-tone-v2-pass-angle-first-section-quality-20260912.md
- put: PASS
- get: PASS
- search: PASS (exact title returned first)
- server_reindex: NOT_RUN (client command unavailable)
