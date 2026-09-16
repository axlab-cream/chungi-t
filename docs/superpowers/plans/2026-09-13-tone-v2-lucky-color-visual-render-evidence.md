# Lucky Color visual/render evidence plan

## Scope and user goal

A customer must be able to reopen the completed lucky-color report, understand its 6-category/24-section structure, expand any section, read long Korean prose on desktop and mobile, and print the complete report without clipping. The completed isolated synthetic result is the only data source.

## Design direction

- Preserve the existing black-paper and restrained gold verified-reader system; emphasize reading order and the separation of answer, evidence and action.
- Keep the centered 430px desktop reader and full-width 390px single-column layout.
- Use the existing native disclosure interaction and minimum 44px targets.
- Avoid decorative redesign, horizontal clipping, closed print sections, fixed chrome on paper, and tracked generated prose.

## Vertical slice

1. Freeze the actual-record boundary and reader print/reflow requirements in a RED contract test.
2. Add a local-only read-only QA endpoint for the immutable 24-section result.
3. Inspect all disclosures at desktop and exact 390px mobile widths.
4. Exercise direct first/final section selection and unique-address navigation.
5. Print the complete report and structurally and visually inspect representative pages.
6. Attach sanitized evidence to the Lucky Color release and regenerate the aggregate.
7. Run focused, related, full, typecheck, build, determinism and direct-review gates; then save reusable KMS evidence.

## Non-scope

No provider generation, Production deployment, customer data, Supabase/DB/auth/payment/admin work, commit or push.

