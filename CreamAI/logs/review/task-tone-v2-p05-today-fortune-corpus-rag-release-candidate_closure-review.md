# Closure review — today_fortune corpus/RAG release candidate

## Decision

Approved with comments.

- Critical: 0
- Major: 0
- Minor: 0

## Review evidence

- The original one-block 2.0.0 pack remains available and the reviewed 2.1.0 pack preserves its ID and keywords.
- The condition separates the service key, server-calculated date pillar and user-confirmed schedule facts.
- Both scenarios are explicitly hypothetical and no event, result, time or another person's reaction is predicted.
- Advice uses observable priority, deadline and reversibility criteria without arbitrary counts or periods.
- Retrieval, prompt construction, saved-attempt review and content-hash failure are executable assertions for old and new snapshots.
- The deterministic daily renderer is unchanged and its related regression tests remain in the verification set.
- The manifest truthfully keeps provider generation evidence null and defines a registry-only rollback.

## Comment

This Task verifies the RAG corpus semantics and snapshot attachment. The separate deterministic daily renderer was not changed, and no provider-generated output was evaluated.
