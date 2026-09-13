# ProjectOps Memory Candidate

task_id: task-tone-v2-p04-repair-next-criterion-retention
date: 2026-09-12
case_type: deterministic repair-contract success with unexercised live repair path
failure_type: repair output can fix one gate while dropping a previously passing next criterion
success_pattern: reserve the final meaning paragraph, assign target and action sentence roles, reject vague substitutes, then self-check silently before JSON return
problem: a broad invariant checklist still allowed the provider to omit nextCriterion while repairing paragraph structure.
solution: strengthen only the repair instruction with a 2–4-sentence final paragraph, concrete target, record/compare/check action, explicit vague/targetless counterexamples, and pre-return self-check.
root_cause: the previous repair instruction named the required element but did not reserve its output location or sequence.
why_it_worked: deterministic interception proves the final repair message contains the structural contract while preserving all prior guidance and excluding rejected prose. A fresh provider item passed on attempt 1, so live repair behavior remains unproven.
reuse_condition: free-form LLM regeneration with multiple independent post-generation gates.
do_not_use_when: a structured field can be patched deterministically without regenerating prose.
related_files: src/report/report-generator.ts; tests/unit/report-persistence.test.ts; tone-v2/evaluations/P04-repair-next-criterion-retention-20260912.json
recommended_prompt: Reserve the final meaning paragraph for a concrete target and an observable record/compare/check action; silently self-check it before returning only the requested JSON.
recommended_command: npx tsx --test tests/unit/report-persistence.test.ts
revalidation_command: npm test
expires_at: when repair construction or paid-density output contracts change
privacy_level: internal
should_promote_to_rag: false

## Evidence
- tests: RED 9/10 to GREEN 10/10; focused 48/48; full 682/682; compiler/task 7/7; typecheck/build/diff PASS
- provider: fresh first item 1/52 complete on attempt 1; live repair path NOT_RUN; later/outside-limit calls 0
- privacy: raw prose and credentials excluded; task-scoped boundary scan 0 matches
- review: closure re-review Approved with comments; Critical 0 / Major 0; all initial evidence Majors resolved
- CreamWIKI: `personal/carrotcap/notes/umsh-tone-v2-repair-next-criterion-retention-20260912.md` put/get/exact-title search PASS; server reindex NOT_RUN

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
