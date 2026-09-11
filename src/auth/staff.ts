/**
 * Staff membership source for operations admin authority.
 *
 * This module is deliberately separate from `src/auth/admin.ts`. That one holds
 * the legacy unlock list which opens paid reports without checkout. Reusing it
 * as operational authority would grant admin power with no revocation or audit
 * path — "authority embedded in code" (2026-09-10 Codex review, Critical).
 *
 * Authority here comes only from deployment configuration, so it is revoked by
 * changing one environment variable with no code change and no deploy of source.
 * Empty configuration means nobody is staff: authority is never a default.
 *
 * This is the bridge until T05 provides a persisted, auditable membership store.
 * The shape of `StaffMembership` is what T05 must keep returning.
 */

export type StaffRole = 'super_admin'

/**
 * Read scopes are all this stage grants. No write scope exists yet because no
 * command surface is audited (T06). A super admin can look, not act.
 */
const SUPER_ADMIN_SCOPES = Object.freeze([
  'orders:read',
  'members:read',
  'reports:read',
  'audit:read',
  'settings:read',
])

export type StaffMembership = {
  email: string
  role: StaffRole
  scopes: string[]
}

function configuredEmails(name: string): string[] {
  return String(process.env[name] ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

/** Emails configured as super admins. Never defaulted, never hard-coded. */
export function superAdminEmails(): string[] {
  return [...new Set(configuredEmails('UMSH_ADMIN_SUPER_EMAILS'))]
}

/** True when a membership source exists at all, so the UI can explain 403s. */
export function staffMembershipConfigured(): boolean {
  return superAdminEmails().length > 0
}

/**
 * Resolve the membership of an authenticated member. Returns undefined when the
 * member is not staff, which the caller must translate into 403 — not 401.
 */
export function staffMembership(owner?: { email?: string | null } | null): StaffMembership | undefined {
  const email = String(owner?.email ?? '').trim().toLowerCase()
  if (!email) return undefined
  if (!superAdminEmails().includes(email)) return undefined
  return { email, role: 'super_admin', scopes: [...SUPER_ADMIN_SCOPES] }
}
