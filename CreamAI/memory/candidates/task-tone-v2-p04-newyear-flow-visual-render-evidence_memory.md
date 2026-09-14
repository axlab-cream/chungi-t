# Memory candidate — complete accordion reader print verification

task_id: task-tone-v2-p04-newyear-flow-visual-render-evidence
date: 2026-09-13
case_type: success_case
success_pattern: Verify an immutable complete report through the real reader at desktop and exact mobile widths, then expand closed disclosures only for print and restore their state afterward.
problem: Browser print styles cannot force a closed native details element to expose its body reliably, so a visually acceptable screen can still produce an incomplete document.
solution: Open only closed reader details in beforeprint, record them, hide fixed chrome in print CSS, and close only the recorded details in afterprint. Validate the PDF structurally and visually.
root_cause: Native closed disclosure rendering takes precedence over descendant display rules during print.
why_it_worked: The print lifecycle changes the actual disclosure state before layout while preserving the user's screen state after printing.
reuse_condition: A report uses native details elements and must print every section from an immutable isolated record.
do_not_use_when: Printing only the currently selected section is intentional, the record is incomplete, or the source contains customer data.
related_files: scripts/qa-newyear-live-reader.ts; 사주/js/umsh-report-access.js; 사주/css/umsh-verified-reader.css; tests/unit/newyear-visual-contract.test.ts
recommended_command: node --import tsx --test tests/unit/newyear-visual-contract.test.ts tests/unit/report-access-frontend.test.ts
revalidation_command: npm test; npm run typecheck; npm run vercel-build
privacy_level: internal
should_promote_to_rag: true

## Evidence

- desktop and exact 390px mobile: 36/36, zero overflow or missing-content failures
- print: 36 pages, zero blanks, 36 answers and 36 actions
- full regression: 910/910
- review: Approved with comments, Critical/Major/Minor 0 after path-containment fix

## Redaction Check

- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
- provider_prose_removed: true
