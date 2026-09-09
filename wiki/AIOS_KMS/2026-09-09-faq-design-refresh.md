# FAQ design refresh

- Reference: user-supplied Faq.dc.html, 4 categories / 24 questions.
- Implemented: static semantic HTML, native details/summary, full-text search, working CTA links, responsive sidebar, high-contrast body text, canonical and matching FAQPage JSON-LD.
- Corrected saved-report destination from 운명록 to 보관함 to match existing navigation.
- No new /about page assumed: omitted unavailable introduction link.
- Image: 사주/사주/assets/faq-study-v2.png. Built-in image generation, user approved alternative to requested model; no Imagen 2.5 selection was available.
- Prompt: Create a cinematic editorial website hero image for Korean fortune interpretation brand 운명상회 FAQ help center. No text, no lettering, no logos. A quiet refined Korean wooden study, antique brass compass, folded cream hanji papers and a closed deep burgundy book on dark walnut desk, warm soft lantern lighting, charcoal and oxblood palette, elegant muted gold highlights, tactile natural materials, photographic realism, restrained not fantasy. Wide landscape 3:2 composition, still life concentrated right side, left side dark uncluttered negative space. No people, no magical symbols, no question marks. Premium calm trustworthy mood.
- Verification: vercel-build/typecheck, JS syntax, browser desktop/390px review, search and reset.
- FAQ answers are based on supplied copy, not a fresh end-to-end audit of all paid services. Review policy and feature claims before publication.
- Local preview: http://localhost:8790/faq. No production deployment in this change.
