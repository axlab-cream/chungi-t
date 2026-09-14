# ProjectOps Memory Candidate

task_id: task-tone-v2-p04-today-fortune-full-outline-evidence
date: 2026-09-13
case_type: deterministic_output_acceptance
failure_type: persona_contract_drift_and_impossible_provider_metric
success_pattern: real isolated saved-output verification with exhaustive deterministic branch coverage
problem: Today Fortune had no full-output evidence, its deterministic copy violated the final no-address informal persona, and the aggregate provider metric required storing provider prose while privacy rules prohibited it.
solution: Save and recall one synthetic daily result through the real persistence path, review all seven fields, exercise all five relations and twelve zodiac branches, fix only the customer copy, and count provider evidence by actual calls plus approved review over the 19 provider-backed services.
root_cause: Prompt persona checks were not applied to rules-based templates, and the aggregate conflated proof of provider use with retention of provider prose.
why_it_worked: Executable tone checks exposed every deterministic copy drift while immutable hashes and independent review preserved privacy without erasing provenance.
reuse_condition: A service is rules-based or has sanitized provider provenance and a complete output can be exercised in isolated storage.
do_not_use_when: The evaluator uses customer data, bypasses the real persistence path, or labels a provider-backed service deterministic merely to avoid generation.
related_files: src/saju/today-fortune.ts; scripts/evaluate-today-fortune-full-outline.ts; tone-v2/build-all-service-corpus-release-evaluation.mjs; tone-v2/evaluations/P04-today-fortune-full-outline-evidence-20260913.json
recommended_prompt: Verify the real output architecture first; do not add a model call to a deterministic service or require raw provider prose as proof.
recommended_command: npx tsx scripts/evaluate-today-fortune-full-outline.ts
revalidation_command: npx tsx --test tests/unit/today-fortune.test.ts tests/unit/today-fortune-full-outline-evidence.test.ts tests/unit/all-service-corpus-release-evaluation.test.ts
expires_at: 2027-09-13
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 22/22; related 176/176; repository 936/936
- review: approved after three fixes; Critical/Major/Minor 0
- commands: typecheck PASS; vercel-build PASS; deterministic release rebuild PASS

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
