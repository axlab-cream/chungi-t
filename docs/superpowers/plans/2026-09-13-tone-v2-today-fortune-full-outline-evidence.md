# Today Fortune full-outline evidence plan

## Why this Task

The reviewed `today_fortune` corpus 2.1.0 candidate has no attached complete-output review. This service is intentionally deterministic (`daily-rules-v3`), so adding an LLM call would change the product rather than verify it. The smallest truthful slice is one immutable synthetic saved report plus exhaustive relation and zodiac branch checks.

## Vertical slice

1. Freeze the seven-field customer reading contract and active corpus 2.1.0 hash.
2. Create one unique synthetic report through `savedDailyFortune` in isolated local file storage.
3. Recall the saved result by both report and result identity and prove same-KST-day idempotence.
4. Exercise all five element relations and all twelve birth-year zodiac branches deterministically.
5. Review the saved title, summary, zodiac, work, money, relationship, caution and action copy for grounding, tone, safety and completeness.
6. Write sanitized hash/count evidence only and attach it to the local Today Fortune candidate.
7. Rebuild the 20-service aggregate without changing the provider-output count or deploying.

## Verification

- Focused Today Fortune, persistence, release and aggregate tests.
- Exact seven-field completeness and immutable replay checks.
- Five relation and twelve zodiac branch coverage.
- Full repository tests, typecheck, Vercel build and deterministic rebuild.

## Boundaries

- Synthetic input and isolated local storage only.
- No LLM/provider call: `today_fortune` remains a rules-based service.
- No tracked customer prose, personal data or credentials.
- No Production, customer data, Supabase, payment, deployment, commit or push.
