# Public MY and About
- Reference: user-provided Main.dc.html; project C:/Users/user/Desktop/chungi-t.
- Improvement: /my displays public navigation without sign-in; /about implements the supplied introduction with static HTML and native details.
- Security: optional session check is opt-in for MY only. Existing protected pages and server API authentication unchanged. No database/RLS changes.
- SEO: /about and /my canonical URLs, sitemap, robots allows MY, AboutPage schema, crawlable links.
- Reuse: public hub + protected personal actions; render guest HTML before network requests.
- Verification: vercel-build; anonymous navigation; protected APIs; stubbed member/session tests.
