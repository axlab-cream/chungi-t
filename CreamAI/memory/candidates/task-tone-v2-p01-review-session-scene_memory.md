# Memory Candidate: bounded review-session scenes

- A Korean review scene should require both a recognizable setting (`복기`, `오답 노트`, `마킹 검토`) and an affirmative observable action in the same sentence.
- Bare verb stems also occur as nouns, so `기록 기준` must not satisfy an action gate. Match affirmative endings and explicitly reject nearby negation.
- Generic `문제...하면/에서` patterns can turn action advice into a false scene; keep `문제` recognition to temporal or scene suffixes unless a review setting is explicit.
- Permit a review target before or after the explicit setting, but require target-before-action ordering within the bounded window. Exclude nominalized and desire/negation endings from affirmative actions.
- Re-evaluating an immutable failed provider attempt can validate a deterministic gate repair, but it is not a fresh persisted E2E pass.
