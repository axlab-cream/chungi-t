# Memory Candidate — adjacent nextCriterion

- observation: a valid plan and concrete action may be split across two immediately adjacent sentences; a same-sentence-only regex rejects real output.
- decision: evaluate both same-sentence and adjacent candidates through shared concrete-target, negation, past/perfect, and abandonment guards.
- reusable rule: when matching Korean action prose, add paired positive/negative fixtures for target particles, prefix/suffix negation, completed-action auxiliaries, unsafe verb morphology, safe homographs, and adjacency boundaries.
- artifact: `tone-v2/evaluations/P01-adjacent-next-criterion-20260912.json`.
- privacy: sanitized; no credential, customer data, or full provider output.
