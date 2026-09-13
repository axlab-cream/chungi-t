# Tone V2 quit_fortune 48-item outline plan

## Goal

Replace the legacy 30-point runtime outline with the exact ordered 48-item
contract explicitly supplied in the five `quit_fortune/part*.md` long-outline
blocks, without copying their generated example prose.

## Scope

- Freeze the five source hashes and exact 10-group/48-item title order in tests.
- Add a typed runtime outline whose IDs are unique and stable.
- Route the existing quit-fortune template and new stored report through all 48
  items while retaining input/RAG grounding and empty paid-body persistence.
- Add fresh deterministic reading details only where the legacy 30-point
  template lacks a supplied title; do not ingest source sample answers.

## Non-scope

- Provider generation of all 48 items, Production/customer data, DB/auth,
  payment/admin, corpus/release attachment, commit, push, or deployment.

## RED / GREEN / verification

1. Add source-contract, runtime-order, uniqueness, and 48-pending persistence tests.
2. Confirm RED against the current legacy 30-point outline.
3. Implement the smallest typed outline and template integration needed for GREEN.
4. Run focused tests, full repository tests, typecheck/Vercel build, diff and
   credential checks, independent review, ProjectOps updates, and CreamWIKI
   put/get/search.

## Acceptance

- Exact source split is 10/10/9/9/10 and total 48.
- Runtime and saved pending projections expose those 48 titles once, in order.
- No source example prose, provider prose, secret, or operating data enters evidence.
- Existing contracts remain green and independent review has no Critical/Major issue.

## Result

- DONE on 2026-09-13.
- The source-hash/order RED reproduced the legacy 30-item mismatch; runtime and fresh stored projection now expose the exact 48-item contract.
- All 48 supplied titles own direct, independently authored readings. The temporary legacy alias layer was removed after the global uniqueness regression correctly detected only 30 distinct scenes.
- Focused 9/9, full 708/708 across 101 suites, and Vercel build/typecheck PASS.
- Independent review: Approved with comments, Critical/Major 0. Its sole Minor (stale final safety-disclaimer title) was fixed and regression-tested.
- Provider generation and every Production/release mutation remain for the next separately approved Task.
