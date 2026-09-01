/** Super-admin emails that unlock paid reports without checkout. */

const DEFAULT_ADMIN_EMAILS = ['good1621@gmail.com']

export function adminEmails(): string[] {
  const fromEnv = String(process.env.UMSH_ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set([...DEFAULT_ADMIN_EMAILS.map((email) => email.toLowerCase()), ...fromEnv])]
}

export function isAdminEmail(email?: string | null): boolean {
  const normalized = String(email ?? '').trim().toLowerCase()
  return Boolean(normalized) && adminEmails().includes(normalized)
}

export function isAdminOwner(owner?: { email?: string | null } | null): boolean {
  return isAdminEmail(owner?.email)
}

export type AdminUnlockFields = {
  isPaid?: boolean
  paid?: boolean
  entitlement?: string
  paymentStatus?: string
  unlockReason?: string
}

/** Mark a client-facing report as fully unlocked for admin accounts. */
export function applyAdminReportUnlock<T extends AdminUnlockFields>(
  report: T,
  owner?: { email?: string | null } | null,
): T {
  if (!isAdminOwner(owner)) return report
  return {
    ...report,
    isPaid: true,
    paid: true,
    entitlement: 'paid',
    paymentStatus: 'paid',
    unlockReason: 'admin',
  }
}
