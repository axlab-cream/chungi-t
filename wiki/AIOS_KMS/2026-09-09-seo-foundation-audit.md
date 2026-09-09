# SEO foundation re-audit — 2026-09-09

## Evidence
Production /robots.txt (text/plain), /sitemap.xml (application/xml), /about and /faq/use returned HTTP 200. Organization already existed on home/about; FAQPage already existed across 11 detailed categories containing 126 answers. The claim that these were missing is outdated. The FAQ hub is intentionally a CollectionPage, not duplicate FAQPage markup.

## Improvement
Unified homepage Organization @id with about (#organization); added homepage WebSite (#website) linked to that organization. Added actual about modification date to sitemap. Clarified robots comments: crawl restrictions are not authentication or a guarantee of removal from search. Existing authentication and crawl directives are unchanged.

## Reusable regression guard
scripts/verify-seo-foundation.mjs runs after FAQ generation during build. Checks robots basics, canonical-host unique sitemap URLs, absence of private paths, Organization identity parity, WebSite publisher, FAQ category inclusion and exact dataset/schema parity. Fails build on detected regressions. Detailed visible answer checks remain in verify-public-content.mjs.

## Validation
Build/TypeScript passed. SEO validation: 19 sitemap URLs, Organization/WebSite and 126 FAQ answers. Public content and authenticated APIs passed existing regression checks.

## References / limits
- https://developers.google.com/search/docs/appearance/structured-data/organization
- https://developers.google.com/search/docs/appearance/site-names
- https://developers.google.com/search/docs/crawling-indexing/robots/intro

Structured data and sitemap presence do not guarantee indexing or AI citations. Search Console submission/index status is not verified here. These incremental changes are local and not yet deployed.
