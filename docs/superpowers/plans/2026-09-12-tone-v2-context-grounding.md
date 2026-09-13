# Context Grounding Recognition Implementation Plan

> **For agentic workers:** Execute this one small slice inline with RED → GREEN evidence. Do not start another Tone V2 rule or service.

**Goal:** Recognize a paid-section explanation as grounded when it reuses multiple specific facts from the supplied user context, even if it does not contain editorial words such as `근거` or `적었`.

**Architecture:** Keep `reviewPaidSectionDensity` as the deterministic lower-bound gate. Preserve the existing lexical grounding signals, then add a context-overlap signal that compares normalized, meaningful tokens from public user-entered strings against the generated interpretation. Require multiple specific matches so a generic statement or one enum label cannot pass by itself.

**Tech Stack:** TypeScript, Node test runner through `tsx`, existing captured live-reading evidence.

## Global Constraints

- Source: ZIP common §4 personal evidence or decision-condition requirement.
- Do not accept broad grammar such as every `~라` sentence as grounded.
- Do not persist or log raw customer context; evaluation uses the existing synthetic fixture only.
- No model, retry, prompt, UI, DB, auth, payment, deployment, or Production change.

### Task 1: Reproduce the false negative and false-positive boundaries

- [x] Add the captured-style `연습 점수 + 목표 수준` context reuse and assert `grounding === true`.
- [x] Assert that a single generic fact such as `객관식은 반복이 중요해` remains false.
- [x] Assert that the same declarative prose without context remains false.
- [x] Run the focused test and record RED.

### Task 2: Add context-specific grounding recognition

- [x] Extract only user-facing string facts from the supplied context.
- [x] Normalize Korean particles and remove generic stop words.
- [x] Require at least two shared meaningful tokens, including one sufficiently specific token.
- [x] Combine this signal with, rather than replace, the current lexical matcher.

### Task 3: Re-evaluate captured output and preserve evidence

- [x] Re-evaluate the unchanged captured synthetic output; do not make a new provider call.
- [x] Run focused, compiler/task, full regression, typecheck, Vercel build, and diff checks.
- [x] Run independent review and apply in-scope findings.
- [x] Save sanitized reusable knowledge to CreamWIKI and verify put/get/search.

## Result

- RED reproduced the captured false negative; focused GREEN is 57/57 and full regression is 672/672.
- Independent review found no Critical and three Major boundary gaps; all were applied. Independent rereview was not run.
- The unchanged captured synthetic attempt now passes all four density elements. Its historical stored failure state remains immutable.

## Self-review

- The slice fixes only evidence recognition, not factual correctness.
- A single generic overlap cannot satisfy the new signal.
- Historical provider records remain immutable.
