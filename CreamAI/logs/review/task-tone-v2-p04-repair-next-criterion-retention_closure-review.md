# Review Report - task-tone-v2-p04-repair-next-criterion-retention

## 1. Scope
- Task id: task-tone-v2-p04-repair-next-criterion-retention
- Reviewed files: `../src/report/report-generator.ts`, `../tests/unit/report-persistence.test.ts`, `../src/report/tone-v2-review.ts`, `../src/report/report-queue.ts`, `../tone-v2/evaluations/P04-repair-next-criterion-retention-20260912.json`, `CreamAI/logs/harness/*repair-next-criterion-retention*`, `CreamAI/reports/task-tone-v2-p04-repair-next-criterion-retention_final.md`
- Review time: 2026-09-12T11:55:50Z

## 2. Verdict
- Changes requested
- Summary: The repair prompt wording itself preserves prior invariants, deduplicates failure labels, avoids rejected-prose copy, and I found no code change to the model, retry loop, or nextCriterion recognizer in the reviewed implementation path. Provider evidence honestly marks first-item attempt-1 PASS and live repair-path NOT_RUN. However, the closure and verification artifacts are not auditable enough to safely start the next full-outline continuation.

## 3. Critical Issues
- None.

## 4. Major Issues
- [`CreamAI/reports/task-tone-v2-p04-repair-next-criterion-retention_final.md:15`] Issue: The release report’s Changed Files section lists the entire dirty worktree, including admin UI, server, FAQ, report store, and unrelated tests, while the task plan requires changing only the repair instruction and deterministic regression test at `../docs/superpowers/plans/2026-09-12-tone-v2-repair-next-criterion-retention.md:16`.
- Risk: Scope containment cannot be verified from the task closure artifact, so the next full-outline run could proceed with unrelated changes implicitly accepted.
- Recommendation: Replace the closure evidence with a task-specific changed-file list, or explicitly mark the broad dirty tree as pre-existing/out-of-scope and identify only the files touched for this slice.

- [`CreamAI/logs/harness/task-tone-v2-p04-repair-next-criterion-retention_implementation.json:7`] Issue: The implementation harness records `secret scan changed files` as FAIL and the harness remains `failed: true` at line 107; the task also has no compensating boundary-aware credential scan artifact.
- Risk: ProjectOps implementation evidence is not green, and the sensitive-data assertion in `CreamAI/reports/task-tone-v2-p04-repair-next-criterion-retention_final.md:13` is unsupported by this task’s harness outputs.
- Recommendation: Resolve the harness failure or add a task-scoped boundary-aware scan result before treating the slice as closed.

- [`CreamAI/logs/harness/task-tone-v2-p04-repair-next-criterion-retention_test.json:7`] Issue: The task test harness only reports `package.json has no test script`, records no commands at line 12, while the evaluation claims full regression `682/682` at `../tone-v2/evaluations/P04-repair-next-criterion-retention-20260912.json:23`.
- Risk: The deterministic regression contract is asserted in code at `../tests/unit/report-persistence.test.ts:155`, but the task artifacts do not provide auditable command output proving the claimed tests ran for this slice.
- Recommendation: Attach or regenerate task-local evidence for the focused test, full regression, typecheck, build, and diff check from the repository root.

## 5. Minor Issues
- [`CreamAI/reports/task-tone-v2-p04-repair-next-criterion-retention_final.md:6`] Issue: Definition of Done fields are blank.
- Risk: Review, test, and closure state are ambiguous for downstream handoff.
- Recommendation: Populate the DoD fields after resolving the Major evidence issues.

- [`CreamAI/memory/candidates/task-tone-v2-p04-repair-next-criterion-retention_memory.md:5`] Issue: The memory candidate is empty even though the RAG harness marks file creation as PASS.
- Risk: KMS reuse will not preserve the verified lesson from this repair slice.
- Recommendation: Populate problem, solution, evidence, and revalidation command after verification is made auditable.

## 6. Verification Gaps
- Gap: Live provider repair path is explicitly NOT_RUN at `../tone-v2/evaluations/P04-repair-next-criterion-retention-20260912.json:7` and reiterated at line 69.
- Suggested check: During the next full-outline run, if item 1 or any later item reaches repair, stop on the existing two-attempt boundary and record whether the repaired attempt preserves nextCriterion.

- Gap: Raw provider prose and credentials were intentionally excluded from review evidence.
- Suggested check: Continue using hashes and structured attempt metadata only; ensure a boundary-aware credential scan backs the privacy claim.

## 7. Final Recommendation
- Next action: Do not start the next full-outline continuation until the task-specific scope and verification artifacts are repaired. The code-level repair instruction is directionally acceptable, but closure evidence is not yet safe to rely on.