import { configuredEnv } from '../env/load.js'
import { listPaymentOrders } from '../payment/order-store.js'

/**
 * 회원 본인 탈퇴(2026-10). 탈퇴 화면(사주/leave.html)이 부르는 DELETE /api/user/account 의 본체다.
 *
 * 지우는 것: 사주 프로필, 풀이 기록, 푸시 기기 연결, 무료 미리보기 사용 기록, 로그인 계정의 식별 정보.
 * 남기는 것: 결제 주문·매출 기록·환불 요청, 상담 이용권 기록(`consultation-` 리포트 행).
 *   전자상거래법 시행령 제6조 — 계약·대금결제·재화 공급 기록은 5년 보관한다.
 *
 * 결제 주문 표는 로그인 계정을 on delete restrict 로 참조한다. 그래서 결제가 한 건이라도 있는 회원은
 * 계정을 완전히 지울 수 없고, Supabase Auth 의 소프트 삭제(should_soft_delete)를 쓴다 — 계정 행은 남고
 * 이메일·전화번호·소셜 연결은 지워져 다시 로그인할 수 없다. 결제가 없는 회원은 계정을 완전히 지운다.
 *
 * 데이터를 먼저 지우고 계정을 마지막에 지운다. 중간에 실패해도 회원은 아직 로그인할 수 있어 다시 시도하면
 * 남은 단계만 이어서 처리된다(모든 단계가 이미 지워진 것을 다시 지워도 성공한다).
 */

export interface AccountDeletionStore {
  hasPaymentOrders(userId: string): Promise<boolean>
  deleteRows(table: string, filters: Record<string, string>): Promise<void>
  deleteAuthUser(userId: string, soft: boolean): Promise<void>
}

export interface AccountDeletionResult {
  userId: string
  /** 결제 기록이 있어 계정을 소프트 삭제하고 결제 기록을 보관했다. */
  paymentRecordsRetained: boolean
}

/** 회원 한 명에게 묶인 지울 행들. 결제·매출·환불 표와 상담 이용권 행은 일부러 뺐다. */
const OWNED_ROWS: Array<{ table: string; filters: (userId: string) => Record<string, string> }> = [
  { table: 'cheongi_reports', filters: (userId) => ({ user_id: `eq.${userId}`, report_id: 'not.like.consultation-*' }) },
  { table: 'cheongi_user_profiles', filters: (userId) => ({ user_id: `eq.${userId}` }) },
  { table: 'push_devices', filters: (userId) => ({ user_id: `eq.${userId}` }) },
  { table: 'job_choice_free_preview_claims', filters: (userId) => ({ user_id: `eq.${userId}` }) },
  { table: 'umsh_notification_prefs', filters: (userId) => ({ user_id: `eq.${userId}` }) },
]

export async function deleteOwnAccount(userId: string, store: AccountDeletionStore = restAccountDeletionStore()): Promise<AccountDeletionResult> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('ACCOUNT_ID_INVALID')
  const paymentRecordsRetained = await store.hasPaymentOrders(userId)
  for (const owned of OWNED_ROWS) await store.deleteRows(owned.table, owned.filters(userId))
  await store.deleteAuthUser(userId, paymentRecordsRetained)
  return { userId, paymentRecordsRetained }
}

export function restAccountDeletionStore(): AccountDeletionStore {
  const supabaseUrl = configuredEnv(process.env.SUPABASE_URL)?.replace(/\/$/, '')
  const serviceRoleKey = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)

  function serviceHeaders(): Record<string, string> {
    if (!supabaseUrl || !serviceRoleKey) throw new Error('ACCOUNT_STORE_UNAVAILABLE')
    const headers: Record<string, string> = { apikey: serviceRoleKey }
    if (!serviceRoleKey.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(serviceRoleKey)) {
      headers.authorization = `Bearer ${serviceRoleKey}`
    }
    return headers
  }

  return {
    async hasPaymentOrders(userId) {
      return (await listPaymentOrders(userId, 1)).length > 0
    },
    async deleteRows(table, filters) {
      const headers = serviceHeaders()
      const url = new URL(`${supabaseUrl}/rest/v1/${table}`)
      for (const [key, value] of Object.entries(filters)) url.searchParams.set(key, value)
      const response = await fetch(url, { method: 'DELETE', headers: { ...headers, prefer: 'return=minimal' } })
      // 404 는 표가 아직 이 환경에 없다는 뜻이다(준비만 된 마이그레이션). 지울 행도 없다.
      if (response.status === 404) return
      if (!response.ok) throw new Error(`ACCOUNT_DATA_DELETE_FAILED:${table}`)
    },
    async deleteAuthUser(userId, soft) {
      const headers = serviceHeaders()
      const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ should_soft_delete: soft }),
      })
      // 이미 지워진 계정이면 탈퇴는 끝난 것이다.
      if (response.status === 404) return
      if (!response.ok) throw new Error('ACCOUNT_AUTH_DELETE_FAILED')
    },
  }
}
