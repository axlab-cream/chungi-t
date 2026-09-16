# ProjectOps Memory Candidate

task_id: task-tone-v2-p04-quit-fortune-full-outline-generate
date: 2026-09-13
case_type: success_case
failure_type: long-outline generation gate mismatch and partial-checkpoint false success
success_pattern: immutable synthetic checkpoint plus deterministic replay and executable fail-closed completion invariant
problem: A 48-section provider run needed safe continuation across rejected attempts without mutating customer data, and retry/recovery could appear successful before the requested prefix was complete.
solution: Generate one exact ordered section at a time in isolated storage, stop at the first unresolved failure, add focused RED fixtures for each legitimate output form, recover only immutable saved attempts that pass current production review, and assert full requested-prefix completion on every no-failure invocation.
root_cause: The deterministic Korean wording guards were narrower than legitimate provider morphology, while the harness completion assertion excluded retry/recovery modes.
why_it_worked: Each gate change was bounded by positive and negative fixtures, all accepted sections were replayed through the production-equivalent review, and an independent reviewer found the remaining postcondition gap before closure.
reuse_condition: Use for long paid-report outlines generated section-by-section with immutable attempts, deterministic acceptance gates, and resumable checkpoints.
do_not_use_when: Do not use this evidence as semantic or predictive accuracy proof, and do not apply it to operating customer records without separate production authorization and privacy review.
related_files: scripts/check-quit-fortune-outline-live.ts; scripts/reading-live-invariants.ts; src/report/tone-v2-review.ts; src/report/interpretation-validation.ts; tone-v2/evaluations/P04-quit-fortune-full-outline-generation-20260913.json
recommended_prompt: Generate the exact requested outline sequentially in synthetic isolated storage; stop at the first unresolved review failure; preserve immutable attempts; close only after every requested section passes replay.
recommended_command: npx tsx scripts/check-quit-fortune-outline-live.ts --version=<unique> --generate --fresh
revalidation_command: npx tsx --test tests/unit/reading-live-harness.test.ts tests/unit/report-content-guards.test.ts tests/unit/tone-v2-generation.test.ts tests/unit/report-persistence.test.ts tests/unit/work-quit-service.test.ts tests/unit/quit-fortune-outline.test.ts
expires_at: 2027-09-13
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 103/103; full 719/719 across 101 suites; typecheck/build PASS
- review: Approved with comments after re-review; Critical/Major/Minor 0; both first-review findings resolved
- commands: exact 48-section saved replay PASS; ProjectOps preflight/implementation/test/review/rag/release PASS

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
