# Memory Candidate — task-tone-v2-p01-context-grounding

- problem: lexical-only grounding checks reject genuine context reuse and tempt broad grammar relaxations.
- success pattern: compare normalized meaningful tokens only within explicit user-input fact boundaries; preserve lexical signals; require multiple specific overlaps.
- false-positive guards: do not aggregate unrelated fields and exclude names, saved chat, and server-computed strings.
- evidence: focused 57/57, full 672/672, captured synthetic hashes and unchanged re-evaluation PASS.
- privacy: sanitized synthetic evidence only; no credentials or production customer data.
