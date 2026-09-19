# Review Report - administrator Supabase-session fallback

## 1. Scope
- Task id: `task-admin-supabase-session`
- Reviewed files:
  - `admin-ui/index.html`
  - `src/server/app.ts`
  - `tests/unit/admin-shell.test.ts`
  - `tests/unit/admin-supabase-session.test.ts`
  - `tests/unit/admin-local-auth.test.ts`
  - `사주/js/umsh-auth-session.js`
  - `docs/superpowers/plans/2026-09-20-admin-supabase-session.md`
- Review time: `2026-09-19T23:14:53Z`

## 2. Verdict
- Approved with comments
- Summary: No Critical or Major findings. Supabase authentication and administrator authorization remain separated at `src/server/app.ts:2112-2129`. The browser uses a non-persistent Supabase client, exchanges only the access token for the existing signed HttpOnly cookie, and clears transient sessions. Inactive or missing administrator records follow the same authorization response, while the login UI presents a non-enumerating failure. Recovery links are now handled before the local-auth shortcut. One minor logout regression remains.

## 3. Critical Issues
- None.

## 4. Major Issues
- None.

## 5. Minor Issues
- [`admin-ui/index.html:1762-1779`, `admin-ui/index.html:2185-2194`] Issue: Removing the local-auth guard from `authClient()` makes logout instantiate the persistent shared Supabase client and call `signOut()` even when the administrator authenticated exclusively through the existing local-login path.
- Risk: Logging out of the local administrator session can also clear an unrelated customer Supabase session stored for the same origin. Before this diff, `authClient()` returned `null` in local-auth mode, so local logout only expired the administrator cookie.
- Recommendation: Track whether the administrator flow actually used the persistent Supabase client, or condition Supabase logout on the authentication mode, while always expiring the HttpOnly administrator cookie.

## 6. Verification Gaps
- Gap: Required server cases are present: active administrator at `tests/unit/admin-supabase-session.test.ts:88-101`, inactive administrator at `tests/unit/admin-supabase-session.test.ts:103-108`, invalid token at `tests/unit/admin-supabase-session.test.ts:110-114`, and existing local login/logout at `tests/unit/admin-local-auth.test.ts:41-81`.
- Suggested check: Retain these tests in the focused authentication suite.

- Gap: `tests/unit/admin-shell.test.ts:208-229` verifies browser behavior through source-text assertions, but does not execute local rejection → Supabase login → cookie exchange, recovery completion, or transient-session cleanup.
- Suggested check: Add a browser or DOM-harness test covering successful fallback, inactive-account rejection, recovery-link startup and exchange, and logout without clearing an unrelated customer session.

- Gap: Focused runtime tests could not execute in the read-only review environment because `tsx` attempted to create `C:\Users\user\AppData\Local\Temp\tsx-CodexSandboxOffline` and failed with `EPERM`. TypeScript typechecking and `git diff --check` passed.
- Suggested check: Re-run the three focused authentication test files in a writable environment.

## 7. Final Recommendation
- Next action: Address or explicitly accept the local-login logout side effect, add behavioral browser coverage, and rerun the focused authentication suite before release.