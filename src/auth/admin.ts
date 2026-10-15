import { adminAccountStoreAvailable, adminAccountStoreEnabled, findAdminAccountByEmail } from './admin-account-store.js'
import { superAdminEmails } from './staff.js'

/**
 * 결제 없이 유료 풀이를 여는 계정 = 관리자 계정.
 *
 * 2026-10-15 사용자 요청: 따로 두던 무료 열람 목록(Vercel `UMSH_ADMIN_EMAILS`)을 없애고, 관리자로 등록된 이메일만
 * 무료로 연다. 관리자는 아래 셋 중 하나다.
 *   1. 관리자 화면 계정(`umsh_admin_accounts`, 활성 상태) — 어드민 › 관리자에서 추가·비활성화한다.
 *   2. `UMSH_ADMIN_SUPER_EMAILS` — SNS 로그인으로 관리자 화면을 쓰는 계정.
 *   3. `UMSH_LOCAL_ADMIN_EMAIL` — 처음 설치할 때 쓰는 비상 계정.
 *
 * 방향은 한쪽뿐이다: 관리자 → 무료. 무료로 연다고 관리자 권한이 생기지 않는다(권한 판정은 `staff.ts`·관리자 로그인).
 * 손님 화면 로그인 이메일과 관리자 이메일이 같으면 무료다. 관리자 계정 조회는 1분 동안 기억하고,
 * 조회가 실패하면 무료로 열지 않는다(실수로 유료를 열지 않게 닫힌 쪽으로 실패).
 */
const CACHE_MS = 60_000
const accountCache = new Map<string, { admin: boolean; at: number }>()

function normalized(email?: string | null): string {
  return String(email ?? '').trim().toLowerCase()
}

/** 환경변수로 정한 관리자 이메일(2·3번). 코드에는 주소를 두지 않는다(공개 저장소). */
export function configuredAdminEmails(): string[] {
  const local = normalized(process.env.UMSH_LOCAL_ADMIN_EMAIL)
  return [...new Set([...superAdminEmails(), ...(local ? [local] : [])])]
}

async function isActiveAdminAccount(email: string): Promise<boolean> {
  if (!adminAccountStoreEnabled() || !adminAccountStoreAvailable()) return false
  const cached = accountCache.get(email)
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.admin
  try {
    const account = await findAdminAccountByEmail(email)
    const admin = Boolean(account?.isActive)
    accountCache.set(email, { admin, at: Date.now() })
    return admin
  } catch {
    return false
  }
}

/** 관리자 계정을 추가하거나 활성 상태를 바꾸면 바로 반영되게 기억을 지운다. */
export function forgetAdminAccountCache(): void {
  accountCache.clear()
}

export async function isAdminEmail(email?: string | null): Promise<boolean> {
  const value = normalized(email)
  if (!value) return false
  if (configuredAdminEmails().includes(value)) return true
  return isActiveAdminAccount(value)
}

export function isAdminOwner(owner?: { email?: string | null } | null): Promise<boolean> {
  return isAdminEmail(owner?.email)
}

export type AdminUnlockFields = {
  isPaid?: boolean
  paid?: boolean
  entitlement?: string
  paymentStatus?: string
  unlockReason?: string
}

/** 관리자 계정으로 확인된 리포트를 결제한 것처럼 표시한다. 확인은 부른 쪽(isAdminOwner)에서 한다. */
export function applyAdminReportUnlock<T extends AdminUnlockFields>(report: T): T {
  return {
    ...report,
    isPaid: true,
    paid: true,
    entitlement: 'paid',
    paymentStatus: 'paid',
    unlockReason: 'admin',
  }
}
