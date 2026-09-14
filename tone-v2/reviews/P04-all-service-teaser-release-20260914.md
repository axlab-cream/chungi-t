# P04 all-service teaser release review — 2026-09-14

## Decision

PASS for the paid-service teaser slice. This does not change the complete Tone V2 release decision: the all-service release remains `NO_GO` until the provider/full-outline/visual evidence gates in the aggregate are complete.

## Evidence boundary

- Scope: 19 paid catalog services. `today_fortune` is a complete free result and is not assigned a false paid teaser.
- Source: current production-equivalent report builders and the active corpus/RAG/persona prompts, evaluated without customer records or payment execution.
- Machine evidence: `tone-v2/evaluations/P04-all-service-teaser-evidence-20260914.json`.
- Visual fixture: loopback-only synthetic `job_choice` preview rendered by the real shared report reader.

## Customer path audit

1. Verdict — PASS. The teaser opens with one input-grounded direction instead of an operations or payment state.
2. Representative evidence — PASS. One or two distinct grounds are shown, including a recognizable daily-life scene already present in the generated report.
3. Full-report scope — PASS. The next screen states the exact item count and comparison value without revealing paid report sections or using loss-pressure copy.

## Visual health

- Desktop — PASS. Reading width, hierarchy, evidence cards, scope card and CTA are legible with no overlap.
- Exact 390px mobile viewport — PASS. `innerWidth=390`, `scrollWidth=390`, two evidence rows, CTA height `53.75px`, no horizontal overflow.
- Fixed chrome — PASS. Top and bottom navigation remain available; final content is reachable above the bottom navigation through the existing reader padding.
- Accessibility — PASS. Semantic headings and labelled sections are present; the primary CTA exceeds the 44px target floor.

## Defects found and resolved

- The preview builder inspected only the first paragraph, leaving eleven of nineteen current teasers without a grounded daily-life scene. It now selects one already-authored scene from the first six sections while keeping the preview at no more than two grounds.
- The operations guard treated business decision authority as access-control permission. It now blocks only contextual login/payment/access-control copy.
- The shared UI preferred an empty `signals` array over populated `insights`. It now falls back correctly and separates verdict, grounds and full-report scope.
- The standalone service-contract check expected the retired legacy heading. It now validates the active Tone V2 persona promise and fields embedded in each runtime prompt.

## Verification

- Teaser evaluator: 19/19 PASS.
- Focused reader/content/workflow suite: 75/75 PASS.
- Regression after over-broad purchase-word fix: 34/34 PASS.
- TypeScript: PASS.
- Vercel Production build: PASS.
- Service prompt/corpus/persona contract: 20/20 PASS.
