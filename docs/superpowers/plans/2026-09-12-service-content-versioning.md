# Service Content Versioning Implementation Plan

**Goal:** Move the live service directory and customer-facing content to an auditable, versioned server source without inventing catalog entries.

## T22 Brief

- Source: `admin-ops-execution-pack/15-TASKS.md` T22; `06-SCREENS.md` S02/S03; `08-DATA.md`.
- User outcome: operators can prepare a structured service/content revision; only a validated published revision can affect new customer sessions and new orders.
- Existing source: `src/server/service-directory.ts`, `src/payment/catalog.ts`, generated FAQ HTML and service prompts.
- Data: additive `service_config_versions` and `content_versions`; RLS on; browser roles receive no direct table access; changes run through server/audit command API.
- Out of scope: media upload (T23), editor/scheduling UX (T24), release orchestration (T29), payment/price execution.
- Required states: no version, draft, published, invalid revision, stale revision, unavailable source, permission denial. No sample services or synthetic FAQ records.
- Customer sync: title/tagline/summary/discovery availability have a published server read; paid price changes remain a later payment-gated execution path and do not alter existing orders.
- QA: immutable canonical key; checksum/revision CAS; invalid/zero paid prices rejected; hidden service does not affect historic report access; 1440/768/390 UI is deferred to T24.

## Implementation Order

1. Map each current service-directory field to the immutable base catalog or an operator-controlled versioned field.
2. Add restricted Supabase schema/RPC/store tests for draft and publish state without changing current public reads.
3. Add server read adapter with a safe fallback to the existing deployed catalog only when version storage is unavailable; never substitute fake content.
4. Verify migration RLS/grants, unit/type/build, then deploy and validate the current customer service list remains unchanged.
