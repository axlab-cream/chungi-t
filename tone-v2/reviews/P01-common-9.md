# P01 Review — 공통 프롬프트 §9 티저 규칙

## Scope

- Source: `tone-v2/source/규격/01-공통-프롬프트-규칙.md` §9
- Review units: `ZIP-003-077` through `ZIP-003-084`
- Runtime path: `createOrGetReportRecord` → `createSavedPreview` → stored preview response

## Decision

- `ZIP-003-077` is a heading-only REFERENCE and PASS.
- `ZIP-003-078~084` are ACTIVE and remain IN_PROGRESS until live output, old-record, and semantic conversion-copy evaluation is complete.
- A teaser is assembled from the input-specific deterministic report template before paid sections are redacted. The stored paid report still contains empty pending sections, so free teaser evidence does not unlock paid paragraphs.
- `reviewTeaser` checks a one-line sourced verdict, one or two grounds, an everyday scene signal, and concrete full-report scope.
- Operational state, fake locked-copy quotations, fear/loss pressure, and unsupported certain-event claims are blocking safety findings. `guardPreview` also applies these checks to saved previews at read time.

## Discovered integration defect

The first implementation reviewed the already-redacted pending report. That object intentionally has empty hooks and interpretations, so valid record creation failed with HTTP 500. The fix preserves the redacted saved report while assembling only the free preview from `params.templateReport`.

The first wedding integration after limiting grounds to two also removed its non-fortune boundary line. The boundary was moved into `paidValue`, where it remains visible without becoming a third representative ground.

## Verification scope and limits

- Deterministic fixtures cover positive structure and every explicit prohibited-copy class.
- New-year and wedding API integration, persistence, and the 19-product workflow sweep cover actual preview assembly and entitlement invariants.
- Keyword scene detection cannot prove that a scene is natural or personally useful.
- Exact source containment proves that the headline came from persisted deterministic input-specific material; it does not prove the interpretation itself is correct.
- Old records are guarded against unsafe copy at read time but are not structurally rewritten or migrated in this Task.

## Not performed

- Live provider output evaluation and human conversion-copy review across all 20 services
- Full existing-record preview corpus audit or migration
- Corpus/RAG replacement, release attachment, deployment, database write, or Production mutation
