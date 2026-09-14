# ProjectOps Memory Candidate

task_id: task-tone-v2-p04-pass-angle-full-outline
date: 2026-09-12
case_type: mixed implementation success and provider acceptance failure
failure_type: first generated section exhausted deterministic quality retries
success_pattern: explicit source-block parsing plus bounded sibling carry plus fail-closed sequential execution
problem: pass_angle had only seven broad sections and a naive 52-section expansion would carry every prior full body into later prompts.
solution: encode the exact 52 headings once, mechanically verify source hashes/order, retain all compact sibling summaries but only four bounded recent bodies, and stop after the first failed section.
root_cause: the full outline was not connected to runtime; full sibling prose was unbounded; the first live output still did not satisfy scene/next-criterion/Hanja/symbol-boundary gates.
why_it_worked: deterministic tests prove the structural contract and the fresh harness proves no calls occur after failure.
reuse_condition: long multi-section AI reports that require sequential generation and whole-report duplicate review.
do_not_use_when: unordered independent generations or when prior full prose is a required provider input rather than review-only evidence.
related_files: src/report/pass-angle-outline.ts; src/report/report-generator.ts; scripts/check-pass-angle-outline-live.ts; tone-v2/evaluations/P04-pass-angle-full-outline-20260912.json
recommended_prompt: Carry every prior section ID, question and short answer, but only the latest four bounded bodies. Keep all complete bodies for deterministic post-review.
recommended_command: npx tsx scripts/check-pass-angle-outline-live.ts --version=<unique> --generate --fresh
revalidation_command: npx tsx --test tests/unit/pass-angle-outline.test.ts tests/unit/tone-v2-generation.test.ts tests/unit/reading-live-harness.test.ts
expires_at: when the outline source or prompt/review contract changes
privacy_level: internal
should_promote_to_rag: false

## Evidence
- tests: focused 53/53; full 681/681; compiler/task 7/7; typecheck/build/diff PASS
- review: closure re-review Approved, Critical/Major/Minor 0; provider acceptance remains FAIL at item 1
- commands: fresh preflight; one fresh provider-backed version; ProjectOps preflight/implementation/test/rag/release

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

## CreamWIKI Sync

- path: personal/carrotcap/notes/umsh-tone-v2-pass-angle-full-outline-20260912.md
- put: PASS
- get: PASS
- search: PASS (exact title returned first)
- server_reindex: NOT_RUN (client command unavailable)
