# Consultation/coupon production release

Scope: consultation text/voice UI, GNB/footer, home carousel, transcripts alongside existing vault history, admin consultation settings, service and consultation coupons, server-authoritative discounts and credits.

Validation: 155/155 focused tests; vercel-build incl typecheck and SEO PASS; real Express guest pages 200, coupon/admin endpoints 401. Provider-setup gate 503 prevents purchases before Gemini configuration. Existing production baseline is 46275b4f, not the older origin/main.

Prepared migrations (not applied): 20261002081000_protect_consultation_ledger.sql and 20261002100000_coupon_store.sql. Approval separately requested per rules section 6 H2. Production currently has no GEMINI_API_KEY or CONSULTATION_VOICE_SECRET. No real charge, real coupon issuance, or model response has been verified. UI release does not mean operational service activation.

Rollback: promote chungi-d90kgyb0t-ax-lab-cream.vercel.app through existing Vercel workflow; no DB rollback necessary while migrations unapplied.
