# Review Report - task-t04

## 1. Scope

- Task id: task-t04
- Reviewed files: `docs/admin-ops/T04-regression-baseline.md`, `CreamAI/backlog/task-t04.md`, relevant test files, check scripts, `scripts/check-production-source.mjs`, `scripts/qa-all-services.ts`, acceptance/roadmap documents
- Review time: 2026-09-10T05:56:07Z

## 2. Verdict

- Changes requested
- Summary: The document captures useful baselines and contains no secret leakage, but it overstates the cause of the test discrepancy, overstates deployment-policy evidence, and overclaims two acceptance mappings. M0 must remain open.

## 3. Critical Issues

- None.

## 4. Major Issues

- [docs/admin-ops/T04-regression-baseline.md:61-69, 89-94] Issue: Equal test/suite totals do not establish that Node’s glob selected the identical file set or that execution order is the sole cause. The comparison also changes argument/glob handling and potentially runner execution behavior. A clean `npm test` after one failing form does not rule out all shared-state, loader, or invocation-mode effects.
- Risk: “Only `npm test` is comparable” and “all unlisted failures are regressions” are too strong for a regression oracle.
- Recommendation: Record this as a deterministic invocation-mode discrepancy, not proven order sensitivity. Preserve an exact path manifest, Node/tsx versions, working directory, command argv, and test output artifacts; isolate the eight tests before treating the baseline as authoritative.

- [docs/admin-ops/T04-regression-baseline.md:222-229] Issue: `check:production-source` is explicitly a manual preflight and does not inspect or intercept deployment. Its current failure proves current HEAD is dirty and behind freshly fetched `origin/main`; it does not prove the historical production deployment bypassed the check or violated an enforceable deploy policy.
- Risk: Unsupported operational-compliance claim.
- Recommendation: Reword to “the repository documents a manual preflight requirement that the current source would fail.” Require deployment logs/CI evidence before asserting a policy violation.

- [docs/admin-ops/T04-regression-baseline.md:295, 302] Issue: A32 and A39 are overstated as `덮임`. `report-persistence.test.ts` verifies legacy-record normalization, not the specified admin/detail “미기록 표시” UI. The cited A39 tests exercise report routes, but no cited test covers `/orders`.
- Risk: T05+ implementers may omit required regression tests.
- Recommendation: Downgrade A32 and A39 to `부분`; revise totals to `덮임 2 / 부분 17 / 없음 21`, unless additional tests directly prove the missing UI and `/orders` paths.

- [docs/admin-ops/T04-regression-baseline.md:40, 354] Issue: `qa:all-services` is marked NOT_RUN because of “LLM 호출 추정,” but `scripts/qa-all-services.ts` performs local static prompt/corpus/HTML checks and writes QA artifacts; it makes no LLM call.
- Risk: A usable, local regression check is incorrectly excluded from the frozen baseline.
- Recommendation: Correct the rationale and run it in a controlled worktree/output location, or mark it NOT_RUN for its actual output-writing side effect.

## 5. Minor Issues

- [docs/admin-ops/T04-regression-baseline.md:152-154] Issue: `git diff --stat HEAD origin/main -- scripts/check-*.mjs` currently reports 12 changed scripts, including `check-wedding.mjs`, not 11. The listed 11 are the failed guards only.
- Risk: The cited command and claimed result disagree.
- Recommendation: Say “12 scripts differ; 11 correspond to currently failing stale guards, while `check:wedding` also differs but passes.”

- [docs/admin-ops/T04-regression-baseline.md:191, 328] Issue: “Merging `origin/main` will resolve” is stronger than the evidence supports; it is expected to resolve the listed checks, but merge conflicts and post-merge behavior remain unverified.
- Risk: Merge treated as verified remediation.
- Recommendation: State “is expected to resolve; rerun all guards and unit baseline after merge.”

- [docs/admin-ops/T04-regression-baseline.md:357] Issue: “Any failure absent from this list is a new regression” omits environment-sensitive failures and currently unrun checks.
- Risk: False regression classification.
- Recommendation: Qualify it to the frozen command/environment manifest.

## 6. Verification Gaps

- Gap: The eight named failing tests are correctly attributed: one in `report-content-guards.test.ts`, two in `report-generator.test.ts`, and five in `report-persistence.test.ts`; however, their exact invocation difference was not isolated.
- Suggested check: Run the exact recorded 60-path manifest in controlled permutations and per-file isolation, retaining argv and output.

- Gap: Stale-guard evidence is substantially stronger than the prompt suggests: the document’s table at lines 159-183 verifies replacement symbols for all eleven non-cat failures, not only five. Independent verification: (a) PASS, (b) PASS, (c) PASS, (d) PASS, (e) PASS, (f) WRONG as written because the raw diff has 12 files.
- Suggested check: Correct the 12/11 wording and rerun all guards after a reviewed merge.

- Gap: U23 counts are correct: HEAD has zero `retrieveCategoryOwnChunks` occurrences in `src/pet/cat-service.ts`; `origin/main` has two. The wording “RAG 근거 품질 저하 가능성” is appropriately hedged, but this is a live paid-service behavior gap.
- Suggested check: Treat U23 as a release/merge blocker and run a deterministic cat-service retrieval assertion plus service QA after remediation.

- Gap: Frozen baseline lacks version/environment metadata, exact file manifest/hash, raw outputs, and a safe plan for output-writing `qa:all-services`.
- Suggested check: Add those artifacts before using the document as the sole M1 regression oracle.

- Gap: No secret values were found. No unsupported commit, push, merge, deploy, schema, DB-query, or transaction completion is claimed. Running `check:production-source` and its `git fetch` is acceptable: it refreshes a remote-tracking ref and does not merge, check out, or deploy.

## 7. Final Recommendation

- Next action: Do not approve task-t04 until the major factual/overclaim corrections are made. Individual T01–T04 deliverables may be marked done after correction, but M0 cannot be declared complete while U13/U23/U25 remain unresolved. Before T05 starts, make and verify the `origin/main` integration decision, remediate/verify cat retrieval, repair stale guards, and establish a reproducible unit-baseline manifest; T05’s existing U2/U4/U17/U3 prerequisites also remain blocking.