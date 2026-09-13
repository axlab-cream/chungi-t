# ProjectOps Memory Candidate

task_id: task-tone-v2-p04-lucky-color-full-outline-evidence
date: 2026-09-13
case_type: provider-backed-full-outline-evidence
failure_type: validator-false-positive-and-latest-raw-recovery
success_pattern: immutable-source-plus-isolated-sequential-generation
problem: A full service outline needs real provider evidence without copying source examples, leaking provider prose, touching customers, or allowing a validator false positive to halt or falsely approve the sequence.
solution: Freeze exact source hashes and ordered headings, create a unique synthetic result in ignored isolated storage, generate strictly in order, replay each accepted section through the production review, retain every attempt, and publish only hashes and aggregate metrics.
root_cause: Generic Korean recognizers missed valid service-specific scenes/actions and recovery inspected only the final attempt even when an earlier failed attempt retained the usable raw response.
why_it_worked: Narrow regression examples expanded only proven vocabulary boundaries, and reverse-searching attempts selects the latest failed attempt with raw evidence while preserving fail-closed review.
reuse_condition: Use for the next service pilot when exact source files, isolated synthetic inputs, a unique version, production-equivalent replay, and immutable attempt history are available.
do_not_use_when: Do not treat deterministic replay or hash-only evidence as Production attachment, customer evaluation, visual QA, or permission to deploy.
related_files: scripts/check-lucky-color-outline-live.ts; tests/unit/lucky-color-outline.test.ts; src/report/tone-v2-review.ts; src/report/report-queue.ts; tone-v2/evaluations/P04-lucky-color-full-outline-generation-20260913.json
recommended_prompt: Generate one exact full outline in isolated synthetic storage, stop at the first unresolved item, preserve attempts, replay every accepted section, and record only sanitized provenance and hashes.
recommended_command: npx tsx scripts/check-lucky-color-outline-live.ts --version=<unique-version> --generate --fresh
revalidation_command: npx tsx --test tests/unit/lucky-color-outline.test.ts tests/unit/tone-v2-generation.test.ts tests/unit/report-persistence.test.ts
expires_at: 2027-09-13
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 97/97; full 894/894 across 122 suites; typecheck and Vercel build PASS
- review: direct Codex review Approved with comments; Critical/Major/Minor 0
- commands: isolated provider generation, production-equivalent replay, release builders, repository tests and task-scoped credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
