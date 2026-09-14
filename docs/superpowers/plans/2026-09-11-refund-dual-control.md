# Refund Dual-Control Implementation Plan

> **For agentic workers:** Execute inline, test first, and do not call a live PG endpoint.

**Goal:** Persist refund requests with idempotency, independent approval, and an atomically reserved amount before any future gateway operation.

**Architecture:** A server-only `refund_requests` table is the source of truth. A SQL RPC locks the payment order and current active refund requests in one transaction so concurrent requests cannot reserve more than the original payment amount. `src/payment/refund-store.ts` performs no external payment request; it creates/approves durable intent only. T19 owns final reconciliation of unknown gateway outcomes.

**Tech Stack:** PostgreSQL/Supabase PostgREST RPC, Express, TypeScript, Node test runner.

## Global Constraints

- Every table has RLS; only `service_role` has data access and RPC execution.
- Requester and approver email must differ. Approval never calls the PG.
- Requested/approved/processing/unknown/succeeded amounts remain reserved; rejected/failed do not.
- No purchase right or completed report content is modified in this task.

### Task 1: Atomic refund intent store

**Files:**
- Create: `supabase/migrations/20260911141151_refund_requests_dual_control.sql`
- Create: `src/payment/refund-store.ts`
- Create: `tests/unit/refund-store.test.ts`

- [ ] Add `refund_requests` and a service-role-only `create_refund_request` RPC using `FOR UPDATE` on the order plus active reservations.
- [ ] Return a same-key/same-body request as the same row; reject same key/different amount and aggregate over-reservation.
- [ ] Add in-memory test storage only under `NODE_ENV=test`; non-test missing storage fails closed.

### Task 2: Independent approval API

**Files:**
- Modify: `src/auth/staff.ts`
- Modify: `src/server/app.ts`
- Modify: `tests/unit/refund-store.test.ts`

- [ ] Add `refunds:request`, `refunds:approve`, `refunds:read` scopes.
- [ ] Add request and approve endpoints with server-authenticated actor, Idempotency-Key, expected revision, audit command wrapper, and no PG call.
- [ ] Reject self-approval and stale revision; approval transitions only to `approved`.

### Task 3: Verification and record

- [ ] Apply and verify RLS/grants/RPC on production DB; deploy only after unit/type/build checks pass.
- [ ] Record actual evidence, no live refund execution, in ProjectOps and CreamWIKI.
