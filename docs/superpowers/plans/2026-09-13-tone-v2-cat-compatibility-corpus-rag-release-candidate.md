# Tone V2 cat_compatibility corpus/RAG release candidate

## Goal

Version and semantically review the 38-block cat compatibility corpus without rewriting existing reports or claiming provider-output evidence.

## Evidence boundaries

- User-entered household, age band, observed behavior, touch/play response, routine concern, upcoming event and note are reported facts.
- The guardian chart is a server calculation and may only frame symbolic questions.
- A cat's private feelings, personality, health, diagnosis, future behavior, adaptation speed and compatibility result are unknown unless supported by observations or a qualified veterinary assessment.
- Hypothetical scenes must be labeled. Durations, counts and outcome promises require an explicit source.
- Sudden eating, elimination, pain, breathing or activity changes route to veterinary care; astrology never overrides welfare or safety.

## Vertical slice

1. Add an executable RED contract for the 2.1.0 artifact, all 38 review rows and active/stored snapshot separation.
2. Build a deterministic 2.1.0 candidate and semantic-review artifact from the preserved 2.0.0 source.
3. Switch only the registry pointer for new snapshots and bind a reversible local release manifest.
4. Run focused, related and full tests, typecheck, Vercel build, determinism, credential boundary and ProjectOps harnesses.
5. Record closure review and sanitized ProjectOps/CreamWIKI knowledge.

## Non-scope

- Provider generation or output evaluation
- Production deployment, customer-record mutation, Supabase/auth/payment/admin work
- Commit or push

