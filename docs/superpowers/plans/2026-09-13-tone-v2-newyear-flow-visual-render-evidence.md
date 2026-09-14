# New Year Flow visual/render evidence plan

## Scope and user goal

A customer must be able to reopen the completed 2027 report, understand its 10-category/36-section structure, expand any section, read long Korean prose on desktop and mobile, and print the complete report without clipping. The completed isolated synthetic result is the only data source.

## Design direction

- Concept: preserve the existing black-paper and restrained gold verified-reader system; emphasize reading order and evidence/action separation.
- Colors: background `#000000`, reader `#080807`, surface `#17150f`, text `#f7f2e9`, secondary `#d5cec1`, accent `#d8ba72`.
- Typography: Pretendard/Noto Sans Korean system stack; 28px report title, 15px long-form body at 1.85–1.95 line height.
- Layout: centered 430px reader on desktop, full-width single column at 390px, 36 native disclosure controls in source order.
- Signature element: gold left-rule “한 줄 답” block followed by distinct 근거 and 행동 regions.
- Avoid: collapsed sections disappearing from print, fixed app chrome on paper, cramped disclosure targets, horizontal clipping, tracked generated prose and decorative redesign.

## Vertical slice

1. Freeze the actual-record boundary and reader print/reflow requirements in a RED contract test.
2. Add a local-only read-only QA endpoint for the immutable 36-section result.
3. Render and inspect the real overview plus all 36 disclosures at desktop and exact 390px mobile widths.
4. Exercise disclosure, direct selected-section, and unique-address navigation.
5. Print the complete report, structurally inspect every section, and visually inspect representative pages.
6. Attach sanitized evidence to the New Year release and regenerate the all-service aggregate.

## Non-scope

No provider generation, Production deployment, customer data, Supabase/DB/auth/payment/admin work, commit or push.
