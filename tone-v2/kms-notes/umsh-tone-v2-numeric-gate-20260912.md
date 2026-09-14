# UMSH Tone V2 P01 numeric prescription and arithmetic gate

date: 2026-09-12
scope: ZIP common 01, section 2-1, numeric grounding and add/subtract arithmetic
workspace: C:/Users/user/Desktop/chungi-t-tone-v2

## observation

ZIP common rule 2-1 separates evidence numbers, calculation numbers, and prescription numbers. Before this slice, the runtime prompt told the model not to invent unsupported prescription numbers, but post-generation review did not deterministically reject them or check simple arithmetic equations.

## decision

Add first deterministic review gates for generated hook and interpretation text. A numeric prescription with a concrete number+unit now needs matching numeric evidence from the birth input, public report context, server-calculated feature JSON, or the current section title/question. Add/subtract equations now require grounded operands, matching units, and a correct result. This is a safety gate, not full semantic grading.

## artifact

- src/report/tone-v2-review.ts
- src/report/report-generator.ts
- tests/unit/tone-v2-generation.test.ts
- tone-v2/reviews/P01-common-1-3.md
- tone-v2/task-progress.json
- tone-v2/latest-regression.log

## QA result

- tests/unit/tone-v2-generation.test.ts: 5/5 PASS
- tests/unit/report-persistence.test.ts + tests/unit/tone-v2-generation.test.ts: 13/13 PASS
- tone-v2/compile.test.mjs + tone-v2/task-index.test.mjs: 7/7 PASS
- tone-v2/task-index.test.mjs after task regeneration: 3/3 PASS
- npm run typecheck: PASS
- npm run vercel-build: PASS
- git diff --check: PASS with CRLF warnings only
- npm test: 635 tests, 100 suites, 635 PASS, 0 FAIL

## lesson

Prompt wording alone is not an acceptance check. ZIP examples such as unsupported 30cm or 15분 need executable counterexamples, and calculation examples such as 320만원 - 210만원 = 110만원 need operand, unit, and result checks. Accepted examples must keep the service's assigned voice so the test proves the intended rule rather than another style rule.

## relation

- Previous note: personal/carrotcap/notes/umsh-zip-task-audit-20260912.md
- AIOS content source rule: do not present unsupported numbers or facts as truth.

## next_patch

Multiplication, division, ratio calculations, target-swapping, and cross-section numeric repetition are still outside this first deterministic gate. Live LLM output review, full 1,500 review-unit acceptance, UI/print QA, and production attachment remain incomplete.
