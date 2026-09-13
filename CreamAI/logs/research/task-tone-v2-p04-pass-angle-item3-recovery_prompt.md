# Research brief — saved failed section recovery

Inspect the existing report persistence/generation design and prior task evidence for `task-tone-v2-p04-pass-angle-item3-recovery`.

Answer only these bounded questions:

1. What invariants must an explicit recovery function enforce to promote a saved failed section without a new provider call?
2. Which existing production parser/review and CAS storage functions should be reused?
3. What concurrency, idempotency, wrong-record, malformed-raw, stale-lease, and predecessor-state tests are required?
4. Which fields may be copied from the saved attempt into the section, and which attempt/record fields must remain immutable?

Relevant files: `src/report/report-queue.ts`, `src/report/report-generator.ts`, `src/report/report-store.ts`, `src/types/index.ts`, `tests/unit/report-persistence.test.ts`, and the P04 continuation/recognition evaluation JSON files.

Do not implement, edit files, call providers, inspect secrets, or broaden to items 4–52 or Production.
