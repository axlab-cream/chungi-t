# ProjectOps Memory Candidate

task_id: task-tone-v2-all-service-final-pdf-20260913
date: 2026-09-13
case_type: multi_service_pdf_export
failure_type: mixed_provenance_outputs_presented_as_one_release_state
success_pattern: provenance-tiered privacy-safe export with whole-document and visual verification
problem: A complete service PDF was needed while only part of the service catalog had provider, full-outline and visual evidence.
solution: Export all current customer-facing outputs, label each service by evidence tier, exclude internal and personal data, preserve NO_GO in the document, generate one bookmarked PDF, parse every page and visually inspect representative pages.
root_cause: “Final output” and “final release approval” are different states when evidence coverage is incomplete.
why_it_worked: The PDF is complete enough for product review without overstating release confidence, and every source tier remains auditable.
reuse_condition: A multi-service artifact combines actual verified records with deterministic or production-equivalent synthetic outputs.
do_not_use_when: The user requires real customer records, or when unlabeled synthetic output would be mistaken for provider evidence.
related_files: scripts/export-final-service-reports.ts; scripts/build-final-service-pdf.py; CreamAI/kms/task-tone-v2-all-service-final-pdf-20260913.md
recommended_prompt: Produce the complete current-output artifact, but label evidence provenance per service and preserve the aggregate release gate.
recommended_command: npm exec tsx scripts/export-final-service-reports.ts -- tmp/pdfs/final-service-reports.json
revalidation_command: npm run typecheck; pdfinfo <pdf>; parse all pages with pdfplumber; render representative pages with pdftoppm
expires_at: 2027-09-13
privacy_level: internal
should_promote_to_rag: true

## Evidence

- export: 20 services, 730 sections
- document: 328 A4 pages, 20 bookmarks, no blank pages
- review: representative pages visually accepted
- typecheck: PASS
- artifact SHA-256: D86D07585BB6061CBB34AF6183B3BB91624A09159071B6940CA0DB00456C679E

## Redaction Check

- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
- rejected_provider_attempts_removed: true
