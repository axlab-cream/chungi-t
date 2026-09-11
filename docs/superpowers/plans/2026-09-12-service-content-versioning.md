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

## T22 Slice 3 — Publish and Public Directory Read

### Page Brief

- Page: `/admin/services` and customer `/api/services` consumers.
- Purpose: explicitly promote one reviewed service draft to the current published configuration and expose only that published configuration to new service-list requests.
- Primary user: authenticated operations super admin; customer search visitors are read-only consumers.
- Primary CTA: `이 초안을 발행` → confirmation → atomic publish → refreshed version state.
- Secondary CTA: `초안 저장`; it remains non-public.
- Data source: private `service_config_versions` rows through server-only service-role calls.
- Admin-controlled fields: title, tagline, summary, category, discovery visibility. `landingPath` remains equal to the immutable code route.
- Required states: no draft, ready to publish, publishing, success, validation error, stale revision, permission denial, unavailable store, and hidden-service policy blocked.
- Alerts: publishing changes new public list responses; existing orders, prices, report ownership, saved report text, and service routes do not change.
- SEO/AEO/GEO: published copy can change search-card wording only; static metadata, canonical URLs, FAQ schema, and landing HTML remain unchanged in this slice.
- Analytics: `service.draft.publish` started/succeeded audit events with service key; no new customer tracking event.
- Legal/privacy: no personal customer data is read or written; admin email remains audit-only and is not returned publicly.
- Responsive/accessibility: reuse the existing compact form, visible focus, native confirmation, disabled in-flight CTA, and status text announced through `role=status`.

### TASK Brief

- TASK ID: T22 Slice 3.
- User outcome: a reviewed draft becomes the one published service configuration without deleting history, and the next customer service-list request receives the published non-payment fields.
- Scope: atomic publish RPC, server store, publish API, admin CTA, public directory adapter, audit/idempotency/revision tests, production verification.
- Out of scope: price or sale-state changes, media, scheduling, multi-review workflow, static landing-page rewriting, content_versions, and payment/refund work.
- Safe assumption: publishing a code-hidden service as discovery-visible is blocked until U10 explicitly allows new discovery/sales exposure.
- Publish transition: lock service key; require draft id/state/revision; archive the prior published row; promote the draft; increment revision; preserve every row.
- Public precedence: valid published fields override code title/tagline/summary/category/discovery only. Key, amount, image, and route remain code-owned. Missing/unavailable/invalid version storage falls back to the current code directory without sample data.
- Acceptance criteria:
  - [ ] only `services:publish` may call the publish endpoint;
  - [ ] stale revision or wrong draft state returns conflict with no partial transition;
  - [ ] the old published row becomes archived and the promoted row is the sole published row;
  - [ ] hidden-to-visible publication is blocked pending U10;
  - [ ] public output never includes revision, author, checksum, raw payload, or draft data;
  - [ ] amount, image, key, and route cannot be overridden by a published payload;
  - [ ] existing saved reports and orders remain unchanged;
  - [ ] publish audit and idempotency evidence exists;
  - [ ] 1440/768/390 administrator layouts remain usable.
- Definition of Done: targeted tests turn red then green; migration/RPC privileges and rollback transition pass; full test/type/build pass; production browser publish and public API are verified; status/tests/KMS are updated.

## T22 Slice 4 — Support Notice Versioning

### Page Brief

- Pages: administrator `/admin/content`; customer `/support`.
- Purpose: let an authorized operator save one structured support notice as a private draft, publish it explicitly, and show only the published revision to customers.
- Fixed placement: `support_top`. The placement is code-owned in this slice so arbitrary routes or page injection cannot be introduced from content data.
- Editable fields: plain-text `title` (1–100), plain-text `body` (1–1000), and internal `reviewNote` (0–500). HTML, scripts, images, links, service keys, scheduling, and customer data are not accepted.
- Primary CTA: `이 공지를 발행`; secondary CTA: `초안 저장`.
- Data source: private `content_versions` rows through server-only service-role calls. Browser roles never query the table directly.
- Customer fallback: when no valid published notice exists, the notice region stays absent and the existing support document remains unchanged. Storage failure also fails closed without synthetic content.
- Required states: loading, empty, draft saved, published, validation error, stale revision, permission denial, and unavailable source.
- Accessibility/responsiveness: reuse the existing LNB and compact form; use semantic heading/body text, `role=status`, native confirmation, disabled in-flight actions, and layouts usable at 1440/768/390.
- SEO/legal/privacy: existing metadata and policy copy remain unchanged; rendering uses `textContent`, not `innerHTML`; no personal data or customer identifiers are stored.
- Analytics: `content.notice.draft.create`, `.update`, and `.publish` audit commands only; no new customer tracking event.

### TASK Brief

- TASK ID: T22 Slice 4.
- User outcome: support notices have an auditable revision history and only a reviewed explicit publication changes the customer page.
- Scope: exact payload parser, content store, atomic create/publish RPCs, revision-CAS update, admin read/write/publish APIs, `/admin/content` editor, public allowlisted notice API, and `/support` renderer.
- Out of scope: FAQ/banner/legal/service-card editing, media, scheduling, multi-review approval, rollback UI, email/push delivery, and payment behavior.
- Publish transition: lock `notice/support_top`; require matching draft id/state/revision; archive the prior published row; promote the draft; increment revision; keep all history.
- Public DTO: `{ title, body, publishedAt }` only. It never exposes author email, review note, checksum, raw payload, draft id, or revision.
- Acceptance criteria:
  - [ ] anonymous users cannot read or mutate administrator notice endpoints;
  - [ ] only `content:read`, `content:write`, and `content:publish` scopes reach their matching operations;
  - [ ] unknown payload fields and HTML-shaped input are rejected before persistence;
  - [ ] create/update/publish use idempotency and write audit evidence;
  - [ ] stale revisions and wrong draft states conflict without partial transition;
  - [ ] the previous published row is archived and exactly one published `support_top` notice remains;
  - [ ] the customer API exposes only the allowlist and returns `notice: null` for no valid publication or unavailable storage;
  - [ ] `/support` escapes and renders the published notice without disturbing existing support content;
  - [ ] tests, typecheck, build, production migration, deployment, browser states, operational docs, and CreamWIKI evidence are complete.
