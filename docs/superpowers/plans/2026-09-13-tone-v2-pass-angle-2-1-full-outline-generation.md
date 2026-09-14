# Pass Angle 2.1 full-outline generation plan

## Why this Task

The existing immutable 52-section provider result was generated before the reviewed Pass Angle corpus 2.1.0 became active. It remains valid historical evidence but cannot truthfully prove the current candidate. The smallest release-gap slice is one fresh isolated generation pinned to 2.1.0.

## Vertical slice

1. Freeze the active corpus path, version and hash in an executable contract.
2. Start one unique synthetic isolated record and assert the 2.1.0 snapshot before generation.
3. Generate sections in exact order with the existing two-attempt review path and fail-closed stop rule.
4. If a section fails, preserve the record and diagnose only that section; do not continue or weaken a gate.
5. On 52/52, replay every saved section through the production-equivalent reviewer.
6. Produce sanitized generation evidence and obtain direct independent review.
7. Attach evidence to the local Pass Angle candidate and rebuild the 20-service evaluation without deployment.

## Verification

- Focused contract and generation tests.
- Stored snapshot path/version/hash checks.
- 52/52 replay and immutable identity checks.
- Candidate and aggregate release tests.
- Full repository tests, typecheck, Vercel build, deterministic rebuild and task-scoped credential scan.

## Boundaries

- Synthetic input and isolated local storage only.
- No provider prose in tracked evidence.
- No Production, customer data, Supabase, payment, admin, deployment, commit or push.
