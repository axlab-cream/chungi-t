# Review Report - task-tone-v2-p01-pass-angle-e2e

## 1. Scope
- Task id: task-tone-v2-p01-pass-angle-e2e
- Reviewed files:
  - `tone-v2/evaluations/P01-pass-angle-e2e-20260912.json`
  - `docs/superpowers/plans/2026-09-12-tone-v2-pass-angle-e2e.md`
  - `scripts/check-reading-live.ts`
  - `src/report/tone-v2-review.ts`
  - `.cache/reading-live-20260907/records/77c9c0208239e49c16721d60d6ce.json`
  - `.cache/reading-live-20260907/records/41cdbd9a55ae1eb574128ecdc0bf.json`
  - Supporting verification: `tests.md`, `status.md`, `CreamAI/logs/harness/*pass-angle-e2e*`
- Review time: 2026-09-12T06:04:09Z

## 2. Verdict
- Changes requested
- Summary: The evaluation artifact now honestly separates the pre-provider missing-env record from the fresh provider-backed run, and the recorded provider-run hashes, statuses, attempts, token counts, models, and visible sentences match the stored synthetic record. The failed E2E is clearly kept separate from full-service/release acceptance. No credential value or production customer data was found in the reviewed artifacts. One harness safety issue remains: the script claims to keep only the provider credential but uses a denylist that can leave other live credentials in-process.

## 3. Critical Issues
- None found.

## 4. Major Issues
- [scripts/check-reading-live.ts:11-14] Issue: The live-check harness loads `.env` and `.env.local`, then deletes only names matching `DATABASE|SUPABASE|INICIS|PAYMENT|VERCEL`. This does not satisfy the line 13 comment, “Keep only the approved provider credential,” because project credential names such as `PUNGSU_API_KEY` and `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` would remain loaded.
- Risk: The current artifacts did not preserve secret values, but future `--generate` or `--serve` runs can execute with unrelated production/payment/geodata credentials resident in the process, weakening the evidence-only isolation boundary.
- Recommendation: Replace the denylist with an explicit allowlist for the provider/model variables needed by this harness, then set `NODE_ENV` and `REPORT_STORAGE_DIR` after pruning.

## 5. Minor Issues
- [scripts/check-reading-live.ts:74-80] Issue: The replay summary includes attempt IDs, status, finish reason, token usage, hashes, density, and first sentences, but omits `item.model`.
- Risk: The evaluation JSON must manually transcribe the resolved attempt model, which already caused a stale review mismatch and can recur.
- Recommendation: Include `model: item.model` in each replayed attempt summary.

- [tone-v2/evaluations/P01-pass-angle-e2e-20260912.json:13-20] Issue: The pre-provider missing-env record is referenced by path, but its status, attempt count, and SHA-256 are not preserved in the evaluation artifact.
- Risk: The provider-backed record is strongly replayable, while the missing-env comparison record is less auditable over time.
- Recommendation: Add the precheck record hash and minimal status/attempt metadata.

## 6. Verification Gaps
- Gap: `tests.md:179` records focused/full/typecheck/build/diff PASS, but `CreamAI/logs/harness/task-tone-v2-p01-pass-angle-e2e_test.json:7-12` shows the ProjectOps test harness ran no commands, and `tone-v2/latest-regression.log:899-902` still contains a stale 640/640 run rather than the claimed 672/672.
- Suggested check: Preserve the actual command transcripts or update the regression log for the 672/672 run, typecheck, Vercel build, and diff check.

- Gap: `CreamAI/logs/harness/task-tone-v2-p01-pass-angle-e2e_implementation.json:7-9` still records a secret-scan FAIL, even if it is believed to be a `task-...` false positive.
- Suggested check: Fix or supplement the scanner with a boundary-aware credential scan result that can be reviewed without exposing values.

## 7. Final Recommendation
- Next action: Tighten the harness environment allowlist and make verification evidence self-contained, while preserving the current E2E acceptance result as FAIL and proceeding next to the narrow `scene` recognizer boundary task.