# P04 pass_angle completion E2E memory candidate

- observation: re-evaluating an old failed record was not enough; a unique fresh synthetic record had to persist complete.
- decision: add an explicit `--fresh` fail-closed mode and make generation and replay call the same full deterministic review function.
- result: first provider attempt failed nextCriterion; repair retry passed all gates and persisted complete with non-empty public copy.
- prevention: a fresh-E2E claim requires pre-provider absence, created=true, complete persistence, full gate replay, immutable hash evidence, and an explicit scope boundary.
- limitation: one section is not a full service or release approval.
