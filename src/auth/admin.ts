/**
 * Super-admin emails that unlock paid reports without checkout.
 *
 * 2026-10-15: 공개 저장소라 주소를 코드에 두지 않는다. 목록은 Vercel 환경변수
 * `UMSH_ADMIN_EMAILS`(쉼표로 구분)에만 있다. 비어 있으면 아무도 무료로 열지 못한다.
 */
export function adminEmails(): string[] {
  const fromEnv = String(process.env.UMSH_ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set(fromEnv)]
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
