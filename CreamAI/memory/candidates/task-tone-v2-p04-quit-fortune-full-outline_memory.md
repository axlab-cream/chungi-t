# ProjectOps Memory Candidate

task_id: task-tone-v2-p04-quit-fortune-full-outline
date: 2026-09-13
case_type: success_with_detected_regression
failure_type: source_contract_drift_and_alias_content_duplication
success_pattern: freeze explicit source block hashes/order, require direct title ownership, and retain global semantic uniqueness checks
problem: supplied quit_fortune contract had 48 items while runtime had 30; aliasing new titles to legacy readings made 48 headings but only 30 distinct scenes
solution: replace runtime outline with exact 48 titles, author direct grounded details for every title, remove alias fallback, and prove fresh paid bodies remain empty/pending
root_cause: structural count checks alone did not prove semantic ownership or distinct customer content
why_it_worked: source parsing caught drift, direct-key coverage caught aliases, and the pre-existing global scene test caught repeated content without weakening quality gates
reuse_condition: any service migration from a supplied long-outline contract to runtime and persistent generation
do_not_use_when: the source block is not user-approved or example prose is being treated as reusable corpus
related_files: src/work/quit-service.ts; src/work/practical-readings.ts; tests/unit/quit-fortune-outline.test.ts; tests/unit/practical-service-reading.test.ts
recommended_prompt: Freeze the explicit outline as structure only, require each title to own a grounded reading, and reject semantic duplicates before provider generation.
recommended_command: npx tsx --test tests/unit/quit-fortune-outline.test.ts tests/unit/work-quit-service.test.ts tests/unit/practical-service-reading.test.ts
revalidation_command: npm test && npm run vercel-build
expires_at: 2027-09-13
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 9/9; full 708/708 across 101 suites; Vercel build/typecheck PASS
- review: Approved with comments, Critical/Major 0; sole Minor fixed and regression-tested
- commands: focused node tests, npm test, npm run vercel-build, ProjectOps test/rag/review

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
