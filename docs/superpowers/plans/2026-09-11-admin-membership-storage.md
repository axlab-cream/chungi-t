# Admin Membership Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Execute one task at a time with a fresh verification gate before moving on.

**Goal:** Move the operations-admin membership source from deployment email lists to an auditable, server-only Supabase table without weakening the existing local admin session boundary.

**Architecture:** Keep `admin-ui/index.html` free of secrets and use the existing HTTP-only local admin cookie for the currently configured bootstrap administrator. Introduce a server-only account repository backed by `public.umsh_admin_accounts` through the existing `SUPABASE_SERVICE_ROLE_KEY`; browser clients never access the table. Before enabling the repository, place its schema and RLS/grants in a versioned migration and verify its remote state.

**Tech Stack:** Node 24, TypeScript, Express, Supabase PostgREST, Node `crypto.scrypt`, node:test.

## Global Constraints

- Do not use `UMSH_ADMIN_EMAILS` or `src/auth/admin.ts` as an operations authority source.
- Do not expose `password_hash`, service-role keys, an administrator email list, or raw customer data to the browser.
- Every administrator write requires a server-side super-admin check; account deletion is out of scope until an audit command surface exists.
- The existing local admin login must remain available as a rollback path until remote membership read/write tests and production verification are complete.
- RLS is enabled; `anon` and `authenticated` have no grants; only server-side `service_role` reaches the table.

---

### Task 1: Establish reproducible table schema and RLS

**Files:**
- Create: `supabase/migrations/<generated>_umsh_admin_accounts.sql`
- Create: `supabase/tests/umsh_admin_accounts_rls.test.sql`
- Modify: `docs/admin-ops/HANDOFF.md`

**Schema contract:**

```sql
create table if not exists public.umsh_admin_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  password_hash text not null,
  is_active boolean not null default true,
  role text not null default 'super_admin' check (role in ('super_admin')),
  revision integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.umsh_admin_accounts enable row level security;
revoke all on table public.umsh_admin_accounts from public, anon, authenticated;
grant select, insert, update on table public.umsh_admin_accounts to service_role;
```

- [ ] Generate the migration filename with `supabase migration new umsh_admin_accounts`; never invent a timestamp.
- [ ] Compare the generated SQL against the existing production table before applying it.
- [ ] Add pgTAP assertions that `anon` and `authenticated` have no select/insert/update/delete privilege and that RLS is enabled.
- [ ] Run the approved remote migration workflow only after backup/PITR, target ref, dry-run, schema review, and explicit remote-history approval are recorded.

### Task 2: Add a server-only account repository

**Files:**
- Create: `src/auth/admin-account-store.ts`
- Create: `tests/unit/admin-account-store.test.ts`
- Modify: `src/auth/staff.ts`

**Interfaces:**

```ts
export type AdminAccount = {
  id: string; email: string; passwordHash: string; isActive: boolean;
  role: 'super_admin'; revision: number; createdAt: string; updatedAt: string;
}
export async function findAdminAccountByEmail(email: string): Promise<AdminAccount | null>
export async function listAdminAccounts(): Promise<Array<Omit<AdminAccount, 'passwordHash'>>>
export async function createAdminAccount(input: { email: string; passwordHash: string }): Promise<AdminAccount>
export async function rotateAdminPassword(email: string, expectedRevision: number, passwordHash: string): Promise<AdminAccount>
```

- [ ] Write failing REST-contract tests: service-role headers only, normalized email query, no hash in list DTO, and revision-filtered password rotation.
- [ ] Implement PostgREST access following the existing `src/payment/order-store.ts` server-only header pattern.
- [ ] Make a missing service-role key return a classified server error; never silently fall back to a browser key.
- [ ] Preserve `staffMembership()` as the explicit deployment-list fallback until the rollout switch is enabled.

### Task 3: Add password verification and membership resolution

**Files:**
- Create: `src/auth/admin-password.ts`
- Create: `tests/unit/admin-password.test.ts`
- Modify: `src/auth/staff.ts`, `src/server/app.ts`

**Interfaces:**

```ts
export async function hashAdminPassword(password: string): Promise<string>
export async function verifyAdminPassword(password: string, stored: string): Promise<boolean>
export async function persistedStaffMembership(email: string): Promise<StaffMembership | undefined>
```

- [ ] Write failing tests for valid verification, wrong password, malformed stored hash, inactive account, and a revision conflict.
- [ ] Store an encoded scrypt hash with a random salt and compare derived hashes using `timingSafeEqual` only after lengths match.
- [ ] Change `POST /api/admin/v1/login` to prefer an active persisted account only when `UMSH_ADMIN_ACCOUNT_STORE=enabled`; leave the current encrypted bootstrap variables as an explicit rollback path otherwise.
- [ ] Resolve every `requireStaff` and `/api/admin/v1/me` request through the same source; do not create a UI-only role check.

### Task 4: Add audited administrator management APIs and settings UI

**Files:**
- Modify: `src/server/app.ts`, `admin-ui/index.html`
- Create: `tests/unit/admin-account-api.test.ts`
- Modify: `tests/unit/admin-shell.test.ts`

**Endpoints:**

```text
GET  /api/admin/v1/admin-accounts
POST /api/admin/v1/admin-accounts
PATCH /api/admin/v1/admin-accounts/:id/password
PATCH /api/admin/v1/admin-accounts/:id/status
```

- [ ] Require a future audited `settings:write` scope for all mutations; until T06 exists, expose only the read-only account list and keep mutation controls disabled.
- [ ] Return account id, normalized email, role, active state, revision, and timestamps; never return a hash or a password.
- [ ] Render the account list in `/admin/settings`, with explicit empty/error/loading states.
- [ ] Add a password-rotation form only after the audit command contract from T06 is available; require confirmation and prevent duplicate submission.

### Task 5: Roll out and verify safely

**Files:**
- Modify: `status.md`, `docs/admin-ops/HANDOFF.md`

- [ ] Deploy with the store switch disabled; confirm bootstrap login and all existing admin reads still work.
- [ ] Add one seeded account by an audited server-side path, enable `UMSH_ADMIN_ACCOUNT_STORE`, and verify active, inactive, and unknown-account outcomes.
- [ ] Verify the table rejects anon/authenticated access and the production UI never displays a hash or password.
- [ ] Record the rollback command: disable `UMSH_ADMIN_ACCOUNT_STORE`; bootstrap local login remains the immediate recovery path.

## Current Gate

Task 1 is blocked until the production table is independently inspected and the user explicitly approves migration-history writes. The Supabase CLI is not installed on this PC; installing it or using an authenticated MCP/SQL workflow is a separate environment action.
