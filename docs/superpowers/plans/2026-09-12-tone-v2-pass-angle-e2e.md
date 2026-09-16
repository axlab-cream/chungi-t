# Pass Angle Representative E2E Implementation Plan

> **For agentic workers:** Execute this one evidence-only slice inline. Do not start another Tone V2 rule or service.

**Goal:** Verify that one fresh synthetic `pass_angle` section completes through the real provider, review, retry, and isolated persistence path after the density recognizer repairs.

**Architecture:** Use the existing opt-in `scripts/check-reading-live.ts` harness with a new version key so the run cannot reuse the prior failed record. The harness removes customer storage/auth/payment credentials, writes only to ignored isolated storage, and captures both provider attempts. Evaluate success from the persisted section status and every review signal; never rewrite a failed attempt or relax a gate.

**Tech Stack:** TypeScript, OpenAI provider through the existing application adapter, local JSON report store, SHA-256 evidence.

## Global Constraints

- Synthetic `pass_angle` context only; no production customer data, database, auth, payment, or admin mutation.
- Maximum two attempts as implemented by `generateReportSectionNow`; do not change retry count or model.
- Success requires persisted section `complete`, non-empty generated body, and all deterministic review gates passing.
- Failure remains evidence and becomes one next Task; do not fix an unrelated defect inside this evaluation Task.
- No commit, push, deployment, or Production attachment.

### Task 1: Fix the evaluation boundary

- [x] Create a ProjectOps backlog item and run preflight.
- [x] Run the focused Tone V2 generation tests before the provider call.
- [x] Confirm the new version key has no saved record.

### Task 2: Run one fresh representative generation

- [x] Execute the fresh isolated generation. The first version stopped before outbound provider access because the fork lacked `.env`; the existing AIOS environment was then loaded in-process without exposing the key and a fresh `p01-pass-angle-e2e-envfix-20260912` record made the provider call.
- [x] Capture persisted status, attempts, finish reasons, model, token counts, hashes, density elements, and visible synthetic sentences.
- [x] The section failed after two real responses. Preserve it unchanged and classify the remaining `scene` recognizer boundary without code changes.

### Task 3: Preserve and review evidence

- [x] Write `tone-v2/evaluations/P01-pass-angle-e2e-20260912.json` with reproducible hashes and an honest verdict.
- [x] Run focused/full tests, compiler/task checks, typecheck, Vercel build, and diff check. After review hardened the harness, rerun result: focused 58/58 and full 673/673.
- [x] Run independent evidence review and apply documentation/evidence findings that are in scope.
- [x] Update ProjectOps documents and save sanitized reusable knowledge to CreamWIKI.

## Self-review

- This plan evaluates a single representative section, not all 20 services or full release readiness.
- It distinguishes a successful new generation from re-evaluation of old text.
- It does not authorize provider/model/retry code changes or deployment.

## Result

- Task execution: DONE.
- Acceptance result: FAIL. The saved section remained `failed` after two provider responses.
- Final remaining deterministic issue: `scene`; the output contains a review-session setting and observable actions, so this is the input for the next narrow recognizer Task rather than grounds to relax the gate here.
- No production code, production data, provider settings, retry count, deployment, or Production state changed in this Task.
- Review hardening: the synthetic harness now removes all credential/integration environment variables except the explicitly approved OpenAI key and model selectors; replay output records each resolved attempt model.
