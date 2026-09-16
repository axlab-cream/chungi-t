# Pass Angle Fresh E2E Rerun Implementation Plan

> **For agentic workers:** Execute this single evidence-only slice inline. Do not start another rule or service.

**Goal:** Verify one brand-new synthetic `pass_angle` section through the real provider after the review-session scene repair.

**Architecture:** Reuse the opt-in live-check harness with a unique version so no prior record can be reused. Load only the user-approved OpenAI credential into the process, let the harness remove unrelated integrations, and judge acceptance from the newly persisted record and deterministic review output.

**Tech Stack:** TypeScript, existing OpenAI application adapter, isolated local JSON report store, SHA-256 evidence.

## Global Constraints

- Synthetic context only; no production customer data, database, auth, payment, or admin mutation.
- Keep the existing provider, model selection, retry count, prompt, and review gates unchanged.
- Success requires a new persisted `complete` section, non-empty hook/body, and all deterministic review gates passing.
- Preserve a failed record unchanged and split its remaining defect into the next Task.
- No commit, push, deployment, or Production attachment.

### Task 1: Establish the clean evidence boundary

- [x] Record the ProjectOps task and run preflight.
- [x] Run the focused generation/review regression before provider access.
- [x] Prove the unique version has no existing generated record.

### Task 2: Execute the fresh provider-backed slice

- [x] Load the approved existing OpenAI key in-process without printing or copying it.
- [x] Generate one synthetic `pass_angle` section through the existing retry and persistence path.
- [x] Capture sanitized status, attempt/model/token metadata, hashes, density results, and visible sentence samples.

### Task 3: Verify and close the evidence task

- [x] Store a sanitized machine-readable evaluation without full raw provider output.
- [x] Run focused, compiler/task, full regression, typecheck, Vercel build, and diff checks.
- [x] Run independent evidence review and address only in-scope evidence defects.
- [x] Update ProjectOps and save a reusable sanitized CreamWIKI note.

## Self-review

- This is one representative service, not 20-service or release acceptance.
- A fresh persisted completion is distinct from re-evaluating the old failed record.
- No runtime behavior or production system change is authorized.

## Result

- Evidence Task: DONE; business acceptance: FAIL.
- A fresh record and two real provider attempts were persisted. Both passed scene; attempt 2 failed only nextCriterion, while attempt 1 also failed the paragraph rule.
- Focused 59/59, compiler/task 7/7, full regression 674/674, typecheck, Vercel build, saved replay, and diff check passed.
- No runtime, provider/model/retry, production data, DB, auth, payment, deployment, or Production change occurred.
