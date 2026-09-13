# Review Report - P01 live-opening evaluation slice

## 1. Scope
- Task id: task-tone-v2-p01-direct-answer
- Reviewed files: docs/superpowers/plans/2026-09-12-tone-v2-opening-live-evaluation.md; tone-v2/evaluations/P01-opening-internal-live-20260912.json; tone-v2/kms-notes/umsh-tone-v2-opening-live-evaluation-20260912.md; tone-v2/task-progress.json; tone-v2/reviews/P01-common-1-3.md; tone-v2/STATUS.md; plan.md; tests.md; status.md
- Review time: 2026-09-12T04:43:26Z

## 2. Verdict
- Changes requested
- Summary: No critical privacy/secret leakage or status mismatch found. The active units correctly remain `IN_PROGRESS`, and tracked summaries avoid claiming all-service or release readiness. One reproducibility defect remains: durable evidence for body-wide PASS claims depends on ignored cache records.

## 3. Critical Issues
- None found.

## 4. Major Issues
- [tone-v2/evaluations/P01-opening-internal-live-20260912.json:19] Issue: The evaluation artifact points to `.cache/...` records for the raw attempts, and line 53 states the raw provider output is kept only in ignored cache records. The tracked JSON preserves openings and PASS labels, but not durable proof for body-wide judgments such as `internalFieldExposure 0/6`.
- Risk: Future reviewers or KMS consumers cannot independently audit the exact six attempts once ignored cache files are absent or changed; the checkpoint can become assertion rather than reproducible evidence.
- Recommendation: Add non-sensitive durable proof per attempt to the evaluation artifact, such as raw-output SHA-256, request/model metadata, first three visible sentences, and deterministic authoring/internal-field scan results, or a redacted body excerpt sufficient to verify ZIP-003-008/009/032.

## 5. Minor Issues
- None found.

## 6. Verification Gaps
- Gap: The documented command results are summarized in `tests.md`, but the scoped artifacts do not include a durable stdout/exit-code transcript for the live generation command.
- Suggested check: Preserve the live command invocation and output summary alongside the evaluation artifact, with secrets omitted.

## 7. Final Recommendation
- Next action: Preserve reproducible, non-sensitive evidence for the six attempts, then re-review the slice before treating the representative checkpoint as accepted.