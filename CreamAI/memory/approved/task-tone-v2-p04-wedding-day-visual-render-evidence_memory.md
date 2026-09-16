# Memory candidate — actual saved-result visual QA

task_id: task-tone-v2-p04-wedding-day-visual-render-evidence
reuse_condition: A complete isolated report must be verified through the real saved-result HTML reader without exposing generated prose in tracked evidence.
do_not_use_when: The record is incomplete, contains customer data, requires Production access, or the UI cannot be served read-only.
should_promote_to_rag: true
revalidation_command: node --import tsx --test tests/unit/wedding-visual-contract.test.ts tests/unit/report-access-frontend.test.ts

Serve the immutable record from a local fail-closed endpoint, iterate every stable section identity at desktop and exact mobile viewport widths, then exercise real navigation rather than relying only on DOM assertions. Print every section and inspect both extracted structure and representative rendered pages. Keep screenshots and PDFs in ignored local storage; track only counts, findings and hashes. Recheck print after hiding fixed interactive controls because a screen-safe floating control can overlap prose on paper.
