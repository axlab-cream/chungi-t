# CMDG master teaser implementation plan

Goal: replace the cmdg result teaser with the supplied master-result composition and images, using the current member's calculated chart, at KRW 29,000 (reference 63,000, saving 34,000, about 54%).
Architecture: isolated browser renderer consumes existing analysis/state; no paid-report fields exposed. Existing auth, entitlement and checkout handlers retained. Payment catalog remains authoritative for new orders; historical orders untouched.
Stack: existing static HTML/JS/CSS and TypeScript payment catalog.

## Requirements / acceptance
- R1: supplied illustration order and quote/image rhythm; responsive 375/768/1024/1440, no text clipping.
- R2: name, four pillars, element balance, wealth relation, day branch and current/next cycle use real analysis. No example identity, fabricated date, full paid-section leakage or guessed birth hour.
- R3: catalog and customer price surfaces 29,000; teaser reference 63,000 / saving 34,000 / approx 54%. Old paid orders unchanged.
- R4: CTA retains existing login/payment/purchased routing. Missing analysis gives truthful retry/input state.

## Design
Supplied black/red/gold cinematic strip takes precedence over white default. Tokens #050202, #120706, #f6e6c8, #f2bf6b, #8b1e16; serif narration, sans utility. Full-width portrait rhythm, independent quote bands and boxed personal reading. Avoid sample facts, overlaid clipped prose, fake countdowns.

## Slice
- [ ] Extract supplied image assets and scoped CSS; implement personalized renderer and wire cmdg result only.
- [ ] Test two different calculated charts, missing hour/data, escaping, CTA and catalog consistency; build.
- [ ] Review diff, browser responsive QA, scoped commit/deploy, verify production.
- [ ] Append ProjectOps/KMS evidence and re-read.

Rollback: revert scoped commit through normal Git deployment. No schema or existing report/order mutation.
