# Quit Fortune visual/render evidence plan

## Scope and user goal

A customer must be able to reopen the completed quit-fortune report, understand its 10-category/48-section structure, expand any section, read long Korean prose on desktop and mobile, and print the complete report without clipping. The completed isolated synthetic result is the only data source.

## Design direction

- Preserve the existing black-paper and restrained gold verified-reader system and its answer/evidence/action hierarchy.
- Keep the centered 430px desktop reader and full-width 390px single-column layout.
- Retain native disclosure semantics, visible focus, and minimum 44px summary targets.
- Avoid decorative redesign, static sample copy, horizontal clipping, closed print sections, fixed chrome on paper, and tracked generated prose.

## Vertical slice

1. Freeze the evidence identity, isolated-record path and reader print/reflow requirements in a RED contract test.
2. Add a loopback-only read-only QA endpoint for the exact 48-section result.
3. Inspect all disclosures at desktop and exact 390px mobile widths.
4. Exercise direct first/final section selection, keyboard toggle and unique-address replay.
5. Print the complete report and structurally and visually inspect representative pages.
6. Attach sanitized evidence to the Quit Fortune release and regenerate the all-service aggregate.
7. Run focused, related, full, typecheck, build, determinism and direct-review gates; then save reusable KMS evidence.

## Non-scope

No provider generation, Production deployment, customer data, Supabase/DB/auth/payment/admin work, commit or push.

