# Refund Admin UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Execute inline, one testable task at a time.

**Goal:** Give authorised operations staff a real refund-request list and a safe request/independent-approval flow without representing an approved intent as a completed gateway refund.

**Architecture:** The browser receives only the server's restricted `refund_requests` DTO through `GET /api/admin/v1/refunds`. The server reads the existing service-role-only table; the existing request and approval commands remain the only mutation paths. The screen treats `unknown` and `failed` as investigation states, never as success.

**Tech Stack:** Express, TypeScript, Supabase PostgREST, server-rendered admin shell, Node test runner.

## Page Brief

- Page: `/admin/refunds`
- Purpose: triage actual refund intents while preserving requester/approver separation.
- Primary user: authorised operations administrator.
- Primary CTA: `환불 요청 저장` after a live order lookup; `승인 검토` is only available to a different authorised administrator.
- Data source: `refund_requests` via server-only `GET /api/admin/v1/refunds`; order facts from the existing restricted order endpoint.
- States: loading, no requests, source failure, requested, approved, processing, succeeded, failed, unknown, permission-disabled, request validation failure, stale approval failure.
- Safety: no synthetic rows, no unmasked customer data, no PG execution, and no success label for `requested`/`approved`/`unknown`.
- Accessibility/QA: semantic table with mobile-only table scrolling, text-plus-colour statuses, keyboard focus, disabled self-approval explanation, 1440/1280/768/390 layouts.

## TASK Brief

- TASK ID: T18
- Scope: add read-only refund API/store reads, connect `/admin/refunds` to real data, and surface the existing request/approval commands safely.
- Out of scope: PG cancellation execution, reconciliation completion, automatic refunds, and customer-facing refund changes.
- Acceptance: an empty database states that no actual requests exist; a requester cannot approve their own request; failed/unknown rows say to inspect/requery before retry; API reads require `refunds:read`.

### Task 1: Refund read contract

**Files:** `src/payment/refund-store.ts`, `src/server/app.ts`, `tests/unit/refund-store.test.ts`

- [ ] Write list/get tests using the test-only refund store.
- [ ] Add service-role PostgREST list/get readers and restricted Express routes.
- [ ] Return `403` for self-approval instead of conflating it with a revision conflict.

### Task 2: Real admin refund workspace

**Files:** `admin-ui/index.html`, `tests/unit/admin-shell.test.ts`

- [ ] Add a dedicated `/admin/refunds` loader, live order lookup, request form, status table, and independent-approval panel.
- [ ] Render actual data with DOM text nodes; do not interpolate DB data into HTML.
- [ ] Verify empty/error/unknown/self-approval states and responsive table containment.

### Task 3: Verify and record

- [ ] Run focused unit tests, typecheck, production build, and a browser smoke check.
- [ ] Update plan/status/tests, record reusable knowledge, commit, and deploy.
