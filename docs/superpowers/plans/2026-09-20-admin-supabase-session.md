# Admin Supabase Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an active persisted administrator sign in with the password managed by Supabase Auth while preserving the existing local-admin fallback and HttpOnly admin session.

**Architecture:** The browser first attempts the existing local administrator login. On a credential rejection only, it authenticates through Supabase Auth and sends the returned access token to a new server exchange endpoint. The server validates the token with Supabase, independently requires an active `umsh_admin_accounts` row, and only then issues the existing signed HttpOnly cookie.

**Tech Stack:** TypeScript, Express, Supabase Auth, Node test runner, Vercel.

## Global Constraints

- Do not expose or persist passwords, access tokens, service-role keys, or cookies.
- Do not grant administrator access from Supabase authentication alone.
- Preserve local administrator login as a rollback path.
- Keep failure messages non-enumerating.

---

### Task 1: Reproduce the split-password failure

**Files:**
- Modify: `tests/unit/admin-shell.test.ts`
- Create: `tests/unit/admin-supabase-session.test.ts`

**Interfaces:**
- Consumes: existing `/api/admin/v1/login` and Supabase bearer tokens.
- Produces: executable checks for `/api/admin/v1/session/supabase`.

- [x] Add a shell contract test requiring a Supabase password fallback and session exchange.
- [x] Add server tests proving active accounts receive a cookie while inactive accounts and invalid tokens do not.
- [x] Run the focused tests and confirm they fail before implementation.

### Task 2: Exchange verified Supabase identity for the existing admin session

**Files:**
- Modify: `src/server/app.ts`
- Modify: `admin-ui/index.html`

**Interfaces:**
- Consumes: `Authorization: Bearer <Supabase access token>`.
- Produces: the existing `umsh_local_admin` signed HttpOnly cookie.

- [x] Add `POST /api/admin/v1/session/supabase`.
- [x] Validate the Supabase user and the active persisted administrator independently.
- [x] Add a browser fallback after local credential rejection and connect password recovery to the same exchange.

### Task 3: Verify and release

**Files:**
- Modify: `status.md`
- Modify: `tests.md`

**Interfaces:**
- Consumes: focused tests, full serial suite, typecheck, Vercel build, production deployment.
- Produces: verified production login path and sanitized operational evidence.

- [x] Run focused auth tests, typecheck, full serial tests, and `vercel-build`.
- [x] Complete independent review and address in-scope findings.
- [ ] Commit, push, verify production deployment, and reproduce the user login flow without reading the password.
- [x] Write and re-read the sanitized CreamWIKI record.
