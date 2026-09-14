# P04 sequential live-continuation evidence

- Reuse the exact isolated version when continuing a partially generated outline; do not pass `--fresh`.
- Replay before and after provider work, and store hashes/statuses rather than raw generated prose.
- A natural repair can succeed for one section and fail for the next. Treat repair behavior as section-specific evidence, not a global pass.
- Stop on the first unresolved failure. Prove both `attemptedAfterFailure=0` and `attemptedOutsideLimit=0`.
- This run completed item 2 after a natural repair, then item 3 failed only `nextCriterion` on its second attempt. Items 4–52 were untouched.
