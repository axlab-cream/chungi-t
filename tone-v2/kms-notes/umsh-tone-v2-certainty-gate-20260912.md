# 운명상회 Tone V2 P01 certainty/private-fact gate

- date: 2026-09-12
- branch: codex/tone-v2
- workspace: C:/Users/user/Desktop/chungi-t-tone-v2
- related_source: source/규격/01-공통-프롬프트-규칙.md
- related_tasks: ZIP-003-010, ZIP-003-018

## Observation

ZIP common rules require confirmed judgments to be written clearly while future events, another person's mind, and unprovided private facts must not be stated as confirmed facts. Prompt instruction alone is not enough because generated prose can still invent company, home, family, disease, region, or cat-behavior facts.

## Decision

Add a deterministic post-generation review gate in `src/report/tone-v2-review.ts`. The gate rejects unsupported certainty for future events, third-party mind, and private facts. It allows conditional framing and observation-based wording.

## Artifacts

- `src/report/tone-v2-review.ts`: `certaintyIssues`, review wiring, and generation instruction update.
- `tests/unit/tone-v2-generation.test.ts`: future/mind/private-fact counterexamples.
- `tone-v2/reviews/P01-common-1-3.md`: TASK evidence update.
- `tone-v2/task-progress.json`: ZIP-003-010 and ZIP-003-018 marked IN_PROGRESS with implementation evidence.

## Verification

- `npx tsx --test tests/unit/tone-v2-generation.test.ts`: 6/6 PASS.
- `npx tsx --test tests/unit/report-persistence.test.ts tests/unit/tone-v2-generation.test.ts`: 14/14 PASS.
- `node --test tone-v2/compile.test.mjs tone-v2/task-index.test.mjs`: 7/7 PASS.
- `node --test tone-v2/task-index.test.mjs`: 3/3 PASS after regeneration.
- `npm run typecheck`: PASS.
- `npm run vercel-build`: PASS.
- `npm test`: 636/636 PASS.
- `git diff --check`: PASS with CRLF warnings only.

## Lesson

For Tone V2, rules about factual certainty need both prompt-level wording and post-generation counterexample tests. Static gates should remain conservative: they can block obvious unsupported certainty but do not replace live semantic output grading.

## Remaining Risk

This is not full ZIP acceptance. Live OpenAI output grading, full 1,500 review-unit acceptance, UI/print visual QA, and production attachment remain pending.
