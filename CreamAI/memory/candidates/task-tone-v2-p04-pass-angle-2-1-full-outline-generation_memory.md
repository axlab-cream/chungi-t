# ProjectOps Memory Candidate

task_id: task-tone-v2-p04-pass-angle-2-1-full-outline-generation
date: 2026-09-13
case_type: success_case
failure_type: corpus-version evidence gap plus narrow deterministic Korean recognizers
success_pattern: bind fresh immutable provider output to the exact stored corpus snapshot, repair only proven recognizer false negatives, replay every accepted section, and attach only sanitized hashes and counts
problem: The historical completed Pass Angle report predated corpus 2.1.0, so it could not truthfully prove the current release candidate.
solution: Create a unique isolated synthetic record, assert path/version/content hash before provider use, generate in exact order with fail-closed retries, add paired regression tests for legitimate Korean forms, read all 52 accepted sections directly, and bind the sanitized evidence to the release manifest.
root_cause: Release provenance lacked a fresh result for the active corpus; several valid concrete-scene, grounding and next-criterion expressions were narrower than natural provider language.
why_it_worked: Immutable attempts preserved failures, each recognizer change had positive and negative tests, stored-snapshot replay prevented latest-corpus drift, and the release builder fails closed on corpus hash, count, replay, privacy and review mismatches.
reuse_condition: Use for a long paid-report outline whose candidate corpus has changed since the previous provider evaluation.
do_not_use_when: Do not treat deterministic review as proof of predictive truth, and do not attach evidence to a different corpus hash or operating customer record.
related_files: scripts/check-pass-angle-outline-live.ts; src/report/tone-v2-review.ts; tone-v2/evaluations/P04-pass-angle-2-1-full-outline-generation-20260913.json; tone-v2/build-pass-angle-corpus-release.mjs
recommended_prompt: Generate one exact ordered outline in isolated storage, bind the stored corpus snapshot before the first call, stop on the first unresolved failure, and close only after direct reading plus full replay.
revalidation_command: node --import tsx --test tests/unit/tone-v2-generation.test.ts tests/unit/pass-angle-2-1-generation-contract.test.ts tests/unit/pass-angle-corpus-release.test.ts tests/unit/all-service-corpus-release-evaluation.test.ts
expires_at: 2027-09-13
privacy_level: internal
should_promote_to_rag: true

## Evidence
- 52/52 complete and stored-snapshot replay PASS.
- Focused 92/92; full 930/930 across 122 suites; typecheck/build/determinism PASS.
- Direct review approved with comments; Critical/Major/Minor 0/0/0.

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
