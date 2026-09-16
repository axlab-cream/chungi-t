# ProjectOps Memory Candidate

task_id: task-tone-v2-p04-quit-fortune-visual-render-evidence
date: 2026-09-13
case_type: visual_acceptance
failure_type: missing_release_evidence
success_pattern: immutable actual-result reader plus exhaustive desktop, exact-mobile and complete-print verification
problem: A complete 48-section generated report had no release evidence that every section remained readable on customer surfaces.
solution: Serve the exact isolated record through a loopback-only read-only fixture, inspect every native disclosure on desktop and 390px mobile, verify keyboard and immutable navigation, and structurally plus visually inspect the complete print.
root_cause: Generation and semantic review prove prose and boundaries but not presentation completeness.
why_it_worked: Identity, path, service, status and count checks kept the fixture fail-closed while production rendering exposed the real responsive and print behavior.
reuse_condition: A complete immutable synthetic result exists and the production saved-result reader can render it without external services.
do_not_use_when: The source is incomplete, customer-owned, requires Production access, or the fixture would not use the production reader.
related_files: scripts/qa-quit-fortune-live-reader.ts; tone-v2/evaluations/P04-quit-fortune-visual-render-evidence-20260913.json; 사주/js/umsh-report-access.js; 사주/css/umsh-verified-reader.css
recommended_prompt: Verify one immutable completed report through its real reader at desktop, exact 390px mobile and complete print, retaining only sanitized counts and hashes.
recommended_command: node --import tsx --test tests/unit/quit-fortune-visual-contract.test.ts
revalidation_command: node --import tsx --test tests/unit/quit-fortune-visual-contract.test.ts tests/unit/quit-fortune-corpus-release.test.ts tests/unit/all-service-corpus-release-evaluation.test.ts
expires_at: 2027-09-13
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 18/18; related 72/72; repository 916/916
- review: approved_with_comments; Critical/Major/Minor 0
- commands: typecheck PASS; vercel-build PASS; five deterministic release rebuilds PASS

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
