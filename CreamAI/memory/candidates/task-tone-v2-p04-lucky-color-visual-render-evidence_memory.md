# ProjectOps Memory Candidate

task_id: task-tone-v2-p04-lucky-color-visual-render-evidence
date: 2026-09-13
case_type: visual_acceptance
failure_type: missing_release_evidence
success_pattern: immutable actual-result reader plus desktop, exact-mobile and complete-print verification
problem: A complete generated report had no evidence that customers could read all sections on desktop, mobile and paper.
solution: Serve the exact isolated record through a loopback-only read-only fixture, inspect every native disclosure, verify exact 390px reflow and keyboard/navigation behavior, then structurally and visually inspect the complete print.
root_cause: Generation and semantic review do not prove presentation completeness.
why_it_worked: The fixture reused production rendering while path containment, exact service/count assertions and no mutation routes kept the evidence isolated and reproducible.
reuse_condition: A complete immutable synthetic result exists and its production reader can be served without external or customer access.
do_not_use_when: The source result is incomplete, belongs to a customer, requires Production access, or the renderer differs from the production reader.
related_files: scripts/qa-lucky-color-live-reader.ts; tone-v2/evaluations/P04-lucky-color-visual-render-evidence-20260913.json; 사주/js/umsh-report-access.js; 사주/css/umsh-verified-reader.css
recommended_prompt: Verify one immutable completed report through its real saved-result reader at desktop, exact 390px mobile and complete print, retaining only sanitized counts and hashes.
recommended_command: node --import tsx --test tests/unit/lucky-color-visual-contract.test.ts
revalidation_command: node --import tsx --test tests/unit/lucky-color-visual-contract.test.ts tests/unit/lucky-color-corpus-release.test.ts tests/unit/all-service-corpus-release-evaluation.test.ts
expires_at: 2027-09-13
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 18/18; related 78/78; repository 913/913
- review: approved_with_comments; Critical/Major/Minor 0
- commands: typecheck PASS; vercel-build PASS; five deterministic release rebuilds PASS

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
