# Comparative nextCriterion false-negative diagnosis

- A semantically concrete next criterion may use a subject-marked observable outcome clause rather than an object-marked noun phrase.
- Korean action morphology matters: a recognizer that accepts `비교해` can still reject the equally actionable `비교해봐`.
- Isolate coupled regex gaps with controlled variants: fix morphology only, target grammar only, then both. Here each single change stayed false and both together became true.
- Preserve targetless, vague, negated, past/perfect, and unsafe-abandonment negatives when implementing the follow-up.
- Diagnose against the immutable stored response first; do not regenerate or rewrite historical failed evidence.
