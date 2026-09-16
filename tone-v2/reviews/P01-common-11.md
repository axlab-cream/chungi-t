# P01 Review — 공통 프롬프트 §11 가독성과 UI 문장

## Scope

- Source: `tone-v2/source/규격/01-공통-프롬프트-규칙.md` §11
- Review units: `ZIP-003-092` through `ZIP-003-102`
- Runtime path: generation instruction → interpretation/tone review → shared saved-report renderer

## Decision

- `ZIP-003-092` is a heading-only REFERENCE and PASS.
- `ZIP-003-093~099` are ACTIVE and remain IN_PROGRESS until live Korean proofreading, all-service CTA inventory, and specialized-renderer mobile review are complete.
- `ZIP-003-100` is the revision-note marker and `ZIP-003-101` is its ambiguity rationale; both are REFERENCE/PASS. `ZIP-003-102` is the binding discriminator and is ACTIVE/PASS because both writer review and rendered-label behavior are deterministic and covered by counterexamples.
- New prose is instructed and deterministically checked for 2–4 complete sentences per semantic paragraph. Markdown headings and table-only blocks remain labels/data, not prose paragraphs.
- Four-or-more slash-packed terms fail. Existing named grammar defects remain rejected.
- Generated hooks are explicitly reviewed as judgments and require terminal punctuation.

## UI and compatibility findings

- The shared verified reader now renders saved hook, evidence paragraphs, and final action paragraph as `한 줄 답`, `근거`, and `행동` blocks.
- A legacy one-paragraph record is labeled `근거와 행동`; it is not split into invented semantics. An exact hook prefix is removed from the body to avoid duplicate display.
- Classification labels remove terminal periods and use a middot between category and classification. The generic preview CTA is `전체 해석 목차 보기`; generic report pager labels name the interpretation result.
- The revision example is preserved as a type distinction: narrator verdict `지금은 보류.` retains its period, while system label `관계 경고등 · 주의` has no terminal period.
- Authentication, payment destination, report identity, saved text, persistence schema, and specialized home/wedding renderers are unchanged.

## Verification scope and limits

- RED reproduced missing punctuation, paragraph, slash-list, semantic-block, legacy-fallback, and CTA behavior.
- Focused frontend 44/44 and persistence 8/8 pass. Typecheck and Vercel build pass.
- Local `/r/visual-check` loaded the real shell with meaningful content and no framework error overlay. Injecting a synthetic private result into the browser was blocked by browser URL policy, so actual styled answer/evidence/action visual inspection is NOT_RUN.
- The first full regression found one five-sentence legacy test fixture; the fixture was reduced to the new 2–4 sentence contract without weakening production validation.

## Not performed

- Live provider Korean semantic proofreading or one-thought-per-sentence grading
- Visual acceptance of the new semantic blocks or all specialized service renderers
- Full CTA inventory, corpus/RAG replacement, release attachment, deployment, database write, commit, push, or Production mutation
