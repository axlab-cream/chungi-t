# ProjectOps Memory Candidate

task_id: task-tone-v2-p04-pass-angle-visual-render-evidence
date: 2026-09-13
case_type: visual_acceptance
failure_type: missing_release_evidence
success_pattern: immutable real-reader verification with measured targets and exhaustive print review
problem: A complete 52-section generated Pass Angle report lacked proof that every section remained readable and operable on customer surfaces.
solution: Serve the exact isolated record through a loopback-only read-only fixture, inspect desktop and exact 390px mobile, measure rendered controls, exercise direct and keyboard navigation, and inspect every complete-print page.
root_cause: Generation and semantic review prove content boundaries but not responsive, interaction or print presentation.
why_it_worked: Fail-closed source identity checks and the production reader exposed two real shared-reader defects before sanitized evidence attachment.
reuse_condition: A complete immutable synthetic record exists and the real saved-result reader can render it without Production services.
do_not_use_when: The source is incomplete, customer-owned, requires Production access, or the fixture substitutes a mock reader.
related_files: scripts/qa-pass-angle-live-reader.ts; scripts/verify-pass-angle-print.py; tone-v2/evaluations/P04-pass-angle-visual-render-evidence-20260913.json; 사주/css/umsh-verified-reader.css
recommended_prompt: Verify one immutable complete report through its real reader at desktop, exact 390px mobile and complete print, retaining only sanitized counts and hashes.
recommended_command: npx tsx --test tests/unit/pass-angle-visual-contract.test.ts
revalidation_command: npx tsx --test tests/unit/pass-angle-visual-contract.test.ts tests/unit/pass-angle-corpus-release.test.ts tests/unit/all-service-corpus-release-evaluation.test.ts
expires_at: 2027-09-13
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 19/19; repository 934/934
- review: approved after fixes; Critical/Major/Minor 0
- commands: typecheck PASS; vercel-build PASS; deterministic release rebuild PASS

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
