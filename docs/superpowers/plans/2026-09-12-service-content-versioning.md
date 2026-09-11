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

1. [x] Map each current service-directory field to the immutable base catalog or an operator-controlled versioned field; expose the real catalog plus version metadata to authorized operations.
2. [ ] Add restricted Supabase schema/RPC/store tests for draft and publish state without changing current public reads. Draft commands are complete; publish commands remain.
3. Add server read adapter with a safe fallback to the existing deployed catalog only when version storage is unavailable; never substitute fake content.
4. Verify migration RLS/grants, unit/type/build, then deploy and validate the current customer service list remains unchanged.

## T22 Slice 2 — Structured Service Draft

- User outcome: an authorized operator selects one real catalog service, saves a structured draft, and immediately sees its persisted version and revision.
- Route and source: `/admin/services`, `service_config_versions`, T22 / R02 / S02.
- Editable fields: `title`, `tagline`, `summary`, `category`, `discoveryVisible`, and `landingPath`.
- Immutable or deferred fields: `canonicalKey` is immutable; `amount` and `saleAvailable` remain owned by the payment track and cannot be changed here.
- Command contract: authenticated `services:write` scope, `Idempotency-Key`, server validation, audit events, and compare-and-swap `expectedRevision` for updates.
- Persistence contract: one active draft per service; creation allocates the next version under a database advisory lock; updates increment revision only when the expected revision matches.
- UI states: loading, ready, saving, validation error, permission denial, stale revision conflict, unavailable store, and saved success.
- Customer impact: none in this slice. Draft rows are not read by public pages and publishing remains disabled.
- Acceptance criteria:
  - [x] a valid service draft is created in Supabase with revision `0` and a SHA-256 checksum;
  - [x] saving an existing draft requires the current revision and increments it once;
  - [x] duplicate idempotency keys replay the stored result and changed bodies conflict;
  - [x] invalid keys, paths, lengths, and payload types are rejected before persistence;
  - [x] every successful mutation has started/succeeded audit evidence;
  - [x] the services screen renders only real catalog/draft data and never sample rows;
  - [x] public catalog and paid prices remain unchanged.
