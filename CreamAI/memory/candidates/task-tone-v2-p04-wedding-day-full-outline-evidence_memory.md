# Memory candidate — wedding_day full-outline evidence

task_id: task-tone-v2-p04-wedding-day-full-outline-evidence
reuse_condition: A specialized service has a supplied long-outline contract and provider outputs use concrete domain scenes or polite Korean action endings.
do_not_use_when: The source hashes or heading marker are absent, the record contains customer data, or Production mutation is requested.
should_promote_to_rag: true
revalidation_command: node --import tsx --test tests/unit/wedding-day-outline.test.ts tests/unit/tone-v2-generation.test.ts

Freeze only source hashes and headings, never supplied sample prose. Domain-specific observable scenes must be recognized narrowly with a paired negative test. Korean action morphology should include valid polite forms such as `적으세요` without accepting targetless advice. Preserve expired/interrupted generation attempts as separate evidence rather than deleting them or counting them as provider responses.
