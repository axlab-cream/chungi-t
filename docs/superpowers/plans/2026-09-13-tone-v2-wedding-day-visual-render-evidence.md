# Wedding Day visual/render evidence plan

## Scope and user goal

The reader must let a customer move from the report overview to the 20-item contents and any detailed section, with readable long Korean prose on desktop and mobile and unclipped print output. The completed isolated synthetic result is the only data source for this QA run.

## Design direction

- Concept: preserve the existing warm paper Wedding editorial reader; correct information and reading continuity take priority over decoration.
- Colors: paper `#f6f0e8`, paper surface `#fff9f0`, ink `#2f2520`, muted `#66594f`, seal `#a73b26`, brass `#b79058`.
- Typography: MaruBuri Bold for the report title, Pretendard Medium/system Korean sans-serif for body, labels and controls.
- Layout: centered 430px reading column on desktop; full-width single column on mobile; stable section selector and explicit previous/next links.
- Signature element: brass-accented summary and seal-colored reading hierarchy.
- Avoid: hard-coded stale section counts, hidden horizontal overflow, clipped long prose, tracked screenshots containing provider prose, decorative motion, generic dashboard cards and Production/customer access.

## Evidence and acceptance

1. Serve the immutable isolated record through a local-only read-only endpoint and the actual static Wedding pages/scripts/styles.
2. Verify report overview, contents and detail routes with meaningful DOM and no error overlay.
3. Iterate all 20 detail identities and assert visible title, paragraphs, no viewport overflow and no image/text overlap.
4. Capture accepted 1440px desktop and 390px mobile screenshots in ignored `.cache` storage; inspect every accepted file.
5. Export and inspect print PDF evidence, checking page count, text presence and page dimensions.
6. Store only hashes, counts and findings in tracked evidence—never provider prose, credentials or personal data.

## Non-scope

No new provider generation, Production deployment, customer data, Supabase/DB/auth/payment/admin work, commit or push.
