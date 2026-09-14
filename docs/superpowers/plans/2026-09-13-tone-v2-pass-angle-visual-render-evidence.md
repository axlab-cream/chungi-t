# Pass Angle actual-result visual evidence plan

## Why this Task

Pass Angle corpus 2.1.0 now has a fresh independently reviewed 52-section provider result, but the service release still lacks visual, mobile and print evidence. This is the next smallest release gap.

## Vertical slice

1. Freeze the approved immutable record identity, corpus snapshot and exact 52-section completion contract.
2. Reuse the production saved-result reader and a loopback-only read-only QA route.
3. Capture and inspect stable desktop screenshots, exercise disclosure/navigation/focus behavior and record content/overflow results.
4. Capture and inspect an exact 390px mobile frame and verify reflow, controls and all 52 sections.
5. Print the complete report, structurally verify every title/body and visually inspect representative first, middle and final pages.
6. Fix only defects proven by current-run evidence and repeat the affected checks.
7. Attach sanitized evidence to the local Pass Angle candidate, rebuild the 20-service aggregate and run regression/ProjectOps closure.

## Verification

- Focused visual contract RED/GREEN.
- Browser page-load, blank-page, overlay, console, key-element and navigation checks.
- Current-run desktop/mobile screenshots inspected before acceptance.
- Complete-print structural checks plus representative page inspection.
- Candidate/aggregate tests, full repository tests, typecheck, Vercel build, deterministic rebuild and Task-scoped credential scan.

## Boundaries

- Existing isolated result is read-only; no provider call.
- No mock result, sample prose or customer record.
- No Production, Supabase, payment, deployment, commit or push.
