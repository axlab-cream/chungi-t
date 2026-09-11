# Admin Audit Command Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Execute the Task inline with a test-first sequence. This plan is intentionally limited to T06; no customer-support, payment, content, or media mutation is included.

**Goal:** Give every future administrator write operation an auditable, idempotent, server-only command foundation.

**Architecture:** Add two RLS-protected Supabase tables: an append-only audit ledger and command receipts keyed by actor/action/idempotency key. A server-only repository will reserve and replay receipts, reject a reused key with a different body, and require an audit entry before returning a successful mutation. The first exposed UI/API surface is read-only audit history; subsequent Tasks will plug their real mutations into this adapter.

**Tech Stack:** Express, TypeScript, Supabase PostgREST with service role, PostgreSQL migration, Node test runner.

## Global Constraints

- Server-only service-role access; no `anon` or `authenticated` grant and RLS enabled on both tables.
- The audit ledger is append-only: no browser endpoint can update or delete it.
- Never store a password, token, raw report, birth profile, or request body in the audit diff/receipt result.
- All future write operations must supply `Idempotency-Key`, a normalized action name, and a server-derived actor.
- Scope for this foundation is `audit:read`; write scopes are not enabled until a concrete command uses this adapter.

## T06 Task Brief

- User outcome: subsequent administrator actions can be safely implemented without duplicate writes or invisible changes.
- Screens/routes: `/admin/audit` (read-only ledger); `GET /api/admin/v1/audit`.
- Primary CTA: none in this foundation; a live audit table replaces the source-missing notice.
- Data source: `public.admin_audit_events` via server-only service role.
- Required states: loading, empty (no operational mutations yet), request failure, permission denied.
- Privacy: actor email is masked in UI; audit event DTO never contains secrets or raw customer payloads.
- Admin/front sync: each later admin write creates an immutable ledger record before the UI treats it as successful.
- Acceptance: same key + same request digest replays a stored result; same key + different digest raises conflict; audit insertion failure prevents callback execution; browser roles cannot query tables.

### Task 1: Schema and command repository

**Files:**
- Create: `supabase/migrations/<generated>_admin_audit_command_foundation.sql`
- Create: `src/admin/audit-store.ts`
- Create: `src/admin/admin-command.ts`
- Test: `tests/unit/admin-command.test.ts`

- [ ] Write red tests for receipt replay, digest conflict, and audit-first callback behavior.
- [ ] Implement a server-only REST repository with explicit selected fields and masked DTO mapping.
- [ ] Add additive migration with RLS, revoked browser grants, service-role-only grants, append-only audit table, and unique command receipt key.
- [ ] Apply migration to the linked production DB only after SQL review; query RLS/grants/constraints to verify.

### Task 2: Audit route and real screen

**Files:**
- Modify: `src/auth/staff.ts`
- Modify: `src/server/app.ts`
- Modify: `admin-ui/index.html`
- Modify: `tests/unit/admin-shell.test.ts`

- [ ] Add the `audit:read` scope and authenticated `GET /api/admin/v1/audit` API.
- [ ] Replace the audit source-missing notice with an empty/loading/error/live audit table.
- [ ] Test unauthenticated and unauthorized requests are rejected, and the shell contains no mock audit rows.

### Verification and release

- [ ] Run `npm run typecheck` and focused administrator tests.
- [ ] Run a linked DB query that confirms RLS, browser grants, and the unique receipt constraint.
- [ ] Commit only Task files and deploy to Production.
- [ ] Verify the audit page in a signed-in browser session.

## Out of Scope

- Adding administrators, password changes, support cases, refunds, media uploads, and content publishing. They are separate Tasks that will use this foundation.
