# Review Report - administrator Supabase-session fallback

## 1. Scope
- Task id: `task-admin-supabase-session`
- Reviewed files:
  - `admin-ui/index.html`
  - `src/server/app.ts`
  - `tests/unit/admin-shell.test.ts`
  - `tests/unit/admin-supabase-session.test.ts`
  - Relevant existing session behavior: `public/js/umsh-auth-session.js`
  - Task contract: `docs/superpowers/plans/2026-09-20-admin-supabase-session.md`
- Review time: `2026-09-19T23:08:10Z`

## 2. Verdict
- Changes requested
- Summary: Server-side authentication and authorization are correctly separated: the Supabase token is verified first, then an active persisted administrator record is independently required. Inactive and missing accounts receive the same authorization response, while browser login errors remain non-enumerating. However, the browser persists Supabase administrator tokens despite the task’s explicit prohibition, and password-recovery links remain unreachable whenever local administrator authentication is configured.

## 3. Critical Issues
- None.

## 4. Major Issues
- [`admin-ui/index.html:1765`] The changed gate now creates the shared Supabase client during local-admin operation, but that client persists the access and refresh session in `localStorage` (`public/js/umsh-auth-session.js:48-55`). A successful password fallback does not remove that session after exchanging it for the HttpOnly cookie (`admin-ui/index.html:2050-2063`).
- Risk: This directly violates `docs/superpowers/plans/2026-09-20-admin-supabase-session.md:13`. The JavaScript-readable refresh session outlives the intended eight-hour HttpOnly administrator cookie and weakens the security benefit of the exchange design.
- Recommendation: Use a non-persistent Supabase client for administrator password authentication, or explicitly remove the local Supabase session immediately after a successful exchange while preserving the issued HttpOnly cookie. Add a behavioral test proving no Supabase access or refresh token remains after login.

- [`admin-ui/index.html:2207`] When `adminLocalAuth` is enabled—the configuration required by the new exchange endpoint—the startup flow returns before reading the Supabase recovery session or checking `isRecoveryLink()`. The recovery branch at `admin-ui/index.html:2223` is therefore unreachable in the deployment targeted by this change.
- Risk: Recovery links show the anonymous login state instead of the password-reset form, so the newly added recovery exchange at `admin-ui/index.html:2122` cannot execute.
- Recommendation: Handle recovery links and resolve their Supabase session before the `adminLocalAuth` short-circuit. Add a browser-level or DOM behavioral test covering recovery-link startup, password update, administrator-session exchange, and transition to the authorized state.

## 5. Minor Issues
- None.

## 6. Verification Gaps
- Gap: `tests/unit/admin-supabase-session.test.ts:87-115` covers active, inactive, and invalid-token server exchanges. The existing `tests/unit/admin-local-auth.test.ts:41-81` covers successful and failed local login plus cookie logout. These required paths are present, but the new shell assertion only searches source text and does not execute the browser fallback.
- Suggested check: Exercise local-login rejection → Supabase sign-in → exchange → `/me`, including generic failure behavior for inactive and unknown accounts.

- Gap: Logout is not tested after a successful Supabase fallback, including removal of the Supabase session and device-session marker.
- Suggested check: Add a behavioral test confirming both the HttpOnly administrator cookie and browser-side Supabase credentials are cleared.

- Gap: Focused tests could not be independently executed in the read-only review sandbox because `tsx` failed while creating its temporary cache directory with `EPERM`. `git diff --check` passed.
- Suggested check: Re-run `admin-supabase-session.test.ts`, `admin-local-auth.test.ts`, and `admin-shell.test.ts` in the writable project environment after addressing the findings.

## 7. Final Recommendation
- Next action: Fix the persistent-token handling and recovery-startup ordering, add behavioral coverage for fallback/recovery/logout, then rerun the focused authentication suite before release.