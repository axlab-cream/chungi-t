# FAQ knowledge expansion — 2026-09-09

## Problem
The public FAQ repeated breadcrumb, eyebrow and title, then showed a large image before 24 short questions. Users needed service selection and concrete next steps, not only account/payment answers.

## Implementation / reusable pattern
- Canonical editorial source: `data/public-faq.json` (126 unique questions, 11 categories).
- 24 operating questions, 90 service-specific questions covering 15 active services, 12 explicitly illustrative workflows (not testimonials).
- Each answer has detailed paragraphs, related local links and internal source references. Workflow examples include three concrete steps.
- `scripts/build-public-faq.mjs` produces static HTML, per-category FAQPage JSON-LD, canonical URLs and sitemap entries from one source. Build preparation imports the generator. `--check` detects stale output.
- Hub is a CollectionPage with search and direct question links; detailed category pages contain all answers in HTML even without JavaScript. JSON-LD matches visible answer text. Old 24 anchors remain compatible.
- Removed visual breadcrumb/eyebrow and large decorative image. Retained the common brand logo and public MY navigation. BreadcrumbList remains machine-readable.
- Search is local and sends no query to a third-party service. Empty state, reset, query URL and opening deep-linked answers are supported.

## Accuracy corrections / editorial constraints
Actual partner birth requirements differ between couple/marriage/signal and wedding-date services. Do not describe all partner information as optional. Cat inputs use observed age/behavior/routine, not a fabricated exact feline birth requirement. Refund explanations follow generation/provision and error conditions in the published policy, not only whether a result was opened. No promises of indefinite storage, identical regenerated outputs, guaranteed outcomes or professional medical/legal/investment advice.

Update year-sensitive new-year entries when the service target year changes. Review service capabilities and policy claims against implementation before changing this dataset. Avoid invented success stories and repetitive keyword doorway pages.

## Reference
Google official AI optimization guidance: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
Useful accessible content and ordinary SEO remain the foundation; question count or structured data does not guarantee search indexing or AI citation. No special AI-only schema is claimed.

## Verification
- `npm run vercel-build`: static generation and TypeScript passed.
- `node scripts/build-public-faq.mjs --check`: 126 entries / 11 categories fresh.
- `node scripts/verify-public-content.mjs`: exact question/answer schema parity, all next-action URLs, existing 14 about services and public MY/private API behavior passed.
- `node scripts/verify-public-my.mjs`: 7 session cases passed.
- Local browser: one H1, search for 이직 returns 10, unknown search returns zero and help links; workflow-2 auto-opens with 3 steps. Desktop and 390px mobile show no horizontal overflow.

No production deployment is recorded by this change; preview is http://localhost:8790/faq.
