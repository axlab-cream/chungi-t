# P01 Review — 공통 프롬프트 §10 안전과 확정 표현

## Scope

- Source: `tone-v2/source/규격/01-공통-프롬프트-규칙.md` §10
- Review units: `ZIP-003-085` through `ZIP-003-091`
- Runtime path: `sectionPrompt` → model response → context-aware `reviewToneCopy` → existing retry/error flow

## Decision

- `ZIP-003-085` is a heading-only REFERENCE and PASS.
- `ZIP-003-086~091` are ACTIVE and remain IN_PROGRESS until live semantic red-team and release evaluation complete.
- `reviewSafetyClaims` is the deterministic common lower-bound gate for certain human outcomes, symbolic authority, relationship safety, professional judgment, guardian-chart pet causation, and unmeasured feng-shui claims.
- The report context is passed to both generated hook and body review. Existing `relationshipState` and server terrain evidence are reused rather than duplicated or inferred.

## PRD and integration findings

- No screen, CTA, admin field, persistence schema, payment, authentication, analytics, SEO, or legal-page change is required for this generation gate.
- Rejected copy follows the existing generation rejection path; it is never silently converted into a fabricated successful report.
- Professional referral wording is allowed, while diagnosis, legal validity, and guaranteed investment outcome claims are rejected.
- A home claim is treated as unmeasured only when the saved context has no server terrain evidence. The deterministic gate does not certify that measured evidence semantically supports every generated sentence.

## Verification scope and limits

- Counterexamples cover explicit affair/lifespan claims, symbolic proof, contact/reconciliation after refusal or coercion, medical/legal/investment authority, guardian-chart cat causation, and unmeasured direction-to-harm/value claims.
- Positive fixtures preserve conditional outcome language, non-authoritative symbolism, safety-first boundaries, professional referral, observation/veterinary criteria, and explicit unknown home measurements.
- Lexical checks are a lower bound. Novel paraphrases, jurisdiction-specific legal meaning, clinical safety, and exact terrain-to-copy entailment require later live/human evaluation.

## Not performed

- Live provider output evaluation or professional legal/medical review
- Corpus/RAG replacement, release attachment, deployment, database write, commit, push, or Production mutation
