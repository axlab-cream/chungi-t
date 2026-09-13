# Tone V2 love_mind corpus, RAG and release-candidate plan

## Goal

Activate a separately versioned, semantically reviewed `love_mind` corpus for
new snapshots while preserving `2.0.0` for stored reports and rollback.

## Confirmed gap

- The one active block remains `needs_semantic_review`.
- Contact and meeting scenes are unlabeled hypothetical examples.
- Migration boilerplate is duplicated in condition and prohibition fields.
- Observed behavior and inferred feeling need an explicit boundary.

## Vertical slices

1. RED review, relationship-evidence, snapshot and rollback assertions.
2. Build reviewed `2.1.0` with observation, calculation, interpretation and hypothetical-example layers.
3. Activate only new snapshots; retain `2.0.0` for stored reports.
4. Prove retrieval, prompt, saved review and hash fail-closed behavior.
5. Bind a truthful local candidate without provider or Production claims.
6. Run focused, related, full, typecheck, build, review, ProjectOps and CreamWIKI gates.

## Acceptance

- The block does not infer affection, intent, contact timing, reconciliation or relationship outcome.
- Only user-observed contact, promises, words, boundaries and safety signals are facts.
- Silence is not hidden affection; explicit refusal overrides speculation.
- Threat, coercion, stalking and violence route to safety, not relationship interpretation.
- Examples are labeled and arbitrary contact counts or waiting periods are absent.
- New snapshots use `2.1.0`; old snapshots and registry-only rollback remain valid.

## Result

DONE on 2026-09-13. Registry `tone-v2.2.0.8`; focused 8/8, related
88/88 and full 783/783 across 109 suites passed with typecheck and build.
