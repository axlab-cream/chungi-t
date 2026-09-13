# Completing a long generated outline with fail-closed recovery checkpoints

- Keep one immutable synthetic record and resume from the first non-complete item; never regenerate completed predecessors.
- Stop immediately when one item remains rejected. Classify the failure as either a real output defect or a deterministic-review false negative before spending another provider call.
- For a false negative, add paired positive/negative RED fixtures, make the narrowest recognizer change, replay the saved raw attempt through the same production parser/review, and promote only when it passes.
- Saved-attempt recovery must use only earlier completed siblings. It must reject any changed later section so future context cannot mask first-use or uniqueness defects.
- Example markers such as `예를 들어` and `만약` are framing, not scenes; require a concrete setting/object plus an observable situation.
- A no-failure live verifier must assert that every requested section is complete; replaying only the completed subset is not proof of completion.
- Do not use a broad word such as `확인` to bypass an entire safety sentence: a definite future/private claim can append an instruction and evade review. Conditional exemptions must describe uncertainty, not merely a later action.
- Abandonment safety must recognize both `공부를 포기` and reversed modifier forms such as `포기할 공부`. Retry, like recovery, must reject non-pristine later sections.
- Provenance words such as `입력`, `말했`, and `느낀` do not make a claim conditional. Unknown birth-time placeholders must be removed from numeric evidence exactly as they are removed from the model prompt.
- Mentioning an expert check must not exempt a dangerous directive or verdict later in the same sentence; continue scanning the complete sentence.
- Normalize ISO and Korean date forms before evidence comparison, and reject temporal-only action targets even when they carry particles. In particular, `부터` is an origin marker and must not be treated as a generic concrete object.
- Service-native certainty forms such as `붙어`, `떨어져`, `합격해`, and `거야` still require safety review. Bare `관찰` or provenance words are not uncertainty conditions, and negated actions must include post-action particles.
- Final proof combines immutable predecessor hashes, ordered attempt evidence, 52/52 production replay, focused and full regression, typecheck/build, independent review, and sanitized KMS writeback.
- Never store the API key or provider prose in tracked evidence; store IDs, statuses, counts, token usage, and hashes only.
