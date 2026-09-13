# Tone V2 quit_fortune 48-item provider generation plan

## Goal

Generate and evaluate the exact 48-item `quit_fortune` outline against the real
configured OpenAI provider using synthetic input and isolated local storage.

## Credential and data boundary

- Reuse the previously approved usable `OPENAI_API_KEY` from ignored `.env.local`.
- Never print or persist the key or provider prose in tracked evidence.
- Remove Supabase, database, payment, admin, cron, and unrelated credentials from the process.
- Use no operating customer record and make no Production mutation.

## Vertical slices

1. Add a dedicated fail-closed quit-fortune harness and contract test.
2. Create a unique fresh synthetic 48-pending record.
3. Generate item 1 and require production-equivalent replay PASS.
4. If item 1 passes, continue strictly in order through item 48.
5. On the first section still rejected after the normal retry policy, stop all later calls, preserve the checkpoint, diagnose the exact rule, and fix only with a RED regression before recovery/continuation.

## Acceptance

- Exact total 48, synthetic-only isolated storage, fresh version, sequential calls.
- No attempt after the first unresolved failure or outside the requested prefix.
- Every completed item passes the same deterministic review used by production.
- Final success requires 48/48 complete plus sanitized usage/hash/status evidence.
- Focused/full/typecheck/build/review/KMS gates pass; deployment and Production remain NOT_RUN.

## Completion

- DONE on 2026-09-13: exact 48/48 stored complete and 48/48 production-equivalent replay PASS.
- Provider attempts: 109 total; rejected attempts were retained as evidence and 10 sections were safely recovered after deterministic gate fixes.
- Verification: focused 103/103, full 719/719 across 101 suites, typecheck and Vercel build PASS.
- Independent re-review: Approved with comments; all previous findings resolved and no Critical/Major/Minor findings remain.
- Production deployment and operating customer-data mutation remain NOT_RUN.
