import { configuredEnv } from '../env/load.js'
import { listPaymentOrders } from '../payment/order-store.js'
import { removeWalletsForDeletedMember } from '../coupons/store.js'

/**
 * 회원 본인 탈퇴(2026-10). 탈퇴 화면(사주/leave.html)이 부르는 DELETE /api/user/account 의 본체다.
 * 원칙: "탈퇴하면 다 지운다". 법으로 보관해야 하는 것만 남긴다.
 *
 * 지우는 것
 *   - 사주 프로필(cheongi_user_profiles), 풀이 기록(cheongi_reports, 상담 이용권 행 제외)
 *   - 풀이 화면에서 만든 스케치 그림(Storage report-sketches/{회원 id}/)
 *   - 1:1 문의 글과 답변(support_cases·support_notes, 결제 관련 문의 제외)
 *   - 쿠폰함(coupon_state 의 wallets, 결제에 쓴 할인 쿠폰 제외)
 *   - 푸시 기기 연결(push_devices), 알림 설정(umsh_notification_prefs), 무료 미리보기 사용 기록
 *   - 상담 이용권 행 안의 대화 내용(sessions)·생년월일·이메일 — 이용권 사용 숫자만 남긴다
 *   - 로그인 계정의 식별 정보
 * 회원 연결만 끊는 것(통계 행은 남고 누구 것인지는 사라진다)
 *   - 이용 흐름 통계(umsh_funnel_events.user_id), 푸시 발송 결과(push_delivery_logs.user_id)
 * 남기는 것(전자상거래법 시행령 제6조)
 *   - 결제 주문·매출 기록·환불 요청, 상담 이용권 사용 기록: 계약·대금결제 기록 5년
 *   - 결제 관련 1:1 문의(분류가 결제이거나 주문 번호가 붙은 문의): 소비자 불만·분쟁처리 기록 3년
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
  /** 조건에 맞는 행의 한 칸 값을 모은다. 표가 없으면 빈 목록. */
  selectColumn(table: string, filters: Record<string, string>, column: string): Promise<string[]>
  deleteRows(table: string, filters: Record<string, string>): Promise<void>
  /** 행은 남기고 칸 값만 바꾼다(회원 연결 끊기). 표가 없으면 아무것도 하지 않는다. */
  updateRows(table: string, filters: Record<string, string>, values: Record<string, unknown>): Promise<void>
  /** 상담 이용권 행에서 대화 내용·생년월일·이메일을 지우고 이용권 숫자만 남긴다. */
  scrubConsultationLedger(userId: string): Promise<void>
  /** 쿠폰함에서 이 회원의 쿠폰을 지운다(결제에 쓴 할인 쿠폰은 남긴다). */
  deleteCouponWallets(userId: string): Promise<void>
  /** 파일 보관소에서 이 회원 폴더의 파일을 지운다. */
  deleteStoredFiles(userId: string): Promise<void>
  deleteAuthUser(userId: string, soft: boolean): Promise<void>
}

/** 상담 이용권 행 payload 중 탈퇴 때 손대는 부분. 나머지 칸은 그대로 둔다. */
interface LedgerPayload {
  revision?: number
  updatedAt?: string
  owner?: { id?: string; email?: string }
  auxiliary?: { consultation?: { sessions?: unknown[]; lease?: unknown } & Record<string, unknown> } & Record<string, unknown>
  [key: string]: unknown
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

/** 탈퇴한 회원의 상담 이용권 행에 넣는 자리표시 생년월일. 실제 생년월일은 남기지 않는다. */
export const ANONYMIZED_BIRTH = { year: 1900, month: 1, day: 1, hour: 0, minute: 0, gender: 'female', calendar: 'solar', isLeapMonth: false } as const

/** 행은 통계로 남기고 회원 id 만 비우는 표. 남은 행으로는 누구였는지 알 수 없다. */
const UNLINKED_ROWS = ['umsh_funnel_events', 'push_delivery_logs']

/**
 * 지울 1:1 문의. 결제 분류이거나 주문 번호가 붙은 문의는 소비자 불만·분쟁처리 기록(3년)이라 남긴다.
 * support_notes 가 support_cases 를 on delete restrict 로 참조하므로 글을 먼저 지우고 문의를 지운다.
 */
const DELETABLE_SUPPORT_CASES = (userId: string) => ({ member_id: `eq.${userId}`, order_id: 'is.null', category: 'neq.payment' })
/** 주소 길이를 넘기지 않게 문의 id 를 나눠 보낸다. */
const ID_BATCH = 50

export async function deleteOwnAccount(userId: string, store: AccountDeletionStore = restAccountDeletionStore()): Promise<AccountDeletionResult> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('ACCOUNT_ID_INVALID')
  const paymentRecordsRetained = await store.hasPaymentOrders(userId)

  const caseIds = await store.selectColumn('support_cases', DELETABLE_SUPPORT_CASES(userId), 'id')
  for (let i = 0; i < caseIds.length; i += ID_BATCH) {
    const ids = `in.(${caseIds.slice(i, i + ID_BATCH).join(',')})`
    await store.deleteRows('support_notes', { case_id: ids })
    await store.deleteRows('support_cases', { id: ids, member_id: `eq.${userId}` })
  }

  await store.deleteStoredFiles(userId)
  for (const owned of OWNED_ROWS) await store.deleteRows(owned.table, owned.filters(userId))
  for (const table of UNLINKED_ROWS) await store.updateRows(table, { user_id: `eq.${userId}` }, { user_id: null })
  await store.scrubConsultationLedger(userId)
  await store.deleteCouponWallets(userId)

  await store.deleteAuthUser(userId, paymentRecordsRetained)
  return { userId, paymentRecordsRetained }
}

export function restAccountDeletionStore(): AccountDeletionStore {
  const supabaseUrl = configuredEnv(process.env.SUPABASE_URL)?.replace(/\/$/, '')
  const serviceRoleKey = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)
  // 풀이 스케치 그림 보관 버킷. src/report/cmdg-reader-tools.ts 와 같은 값을 쓴다.
  const sketchBucket = configuredEnv(process.env.REPORT_SKETCH_BUCKET) || 'report-sketches'

  function serviceHeaders(): Record<string, string> {
    if (!supabaseUrl || !serviceRoleKey) throw new Error('ACCOUNT_STORE_UNAVAILABLE')
    const headers: Record<string, string> = { apikey: serviceRoleKey }
    if (!serviceRoleKey.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(serviceRoleKey)) {
      headers.authorization = `Bearer ${serviceRoleKey}`
    }
    return headers
  }

  function tableUrl(table: string, filters: Record<string, string>): URL {
    const url = new URL(`${supabaseUrl}/rest/v1/${table}`)
    for (const [key, value] of Object.entries(filters)) url.searchParams.set(key, value)
    return url
  }

  /** 버킷 안 한 폴더의 항목. 폴더는 id 가 null 이다. 버킷이 없으면 null. */
  async function listFolder(prefix: string): Promise<Array<{ name: string; id: string | null }> | null> {
    const response = await fetch(`${supabaseUrl}/storage/v1/object/list/${sketchBucket}`, {
      method: 'POST',
      headers: { ...serviceHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
    })
    if (response.status === 404 || (response.status === 400 && /not.?found/i.test(await response.text()))) return null
    if (!response.ok) throw new Error('ACCOUNT_FILES_DELETE_FAILED')
    return await response.json() as Array<{ name: string; id: string | null }>
  }

  return {
    async hasPaymentOrders(userId) {
      return (await listPaymentOrders(userId, 1)).length > 0
    },
    async selectColumn(table, filters, column) {
      const url = tableUrl(table, { ...filters, select: column })
      const response = await fetch(url, { headers: serviceHeaders() })
      // 404 는 표가 아직 이 환경에 없다는 뜻이다(준비만 된 마이그레이션). 고를 행도 없다.
      if (response.status === 404) return []
      if (!response.ok) throw new Error(`ACCOUNT_DATA_READ_FAILED:${table}`)
      const rows = await response.json() as Array<Record<string, unknown>>
      return rows.map((row) => String(row[column]))
    },
    async deleteRows(table, filters) {
      const response = await fetch(tableUrl(table, filters), { method: 'DELETE', headers: { ...serviceHeaders(), prefer: 'return=minimal' } })
      // 404 는 표가 아직 이 환경에 없다는 뜻이다(준비만 된 마이그레이션). 지울 행도 없다.
      if (response.status === 404) return
      if (!response.ok) throw new Error(`ACCOUNT_DATA_DELETE_FAILED:${table}`)
    },
    async updateRows(table, filters, values) {
      const response = await fetch(tableUrl(table, filters), {
        method: 'PATCH',
        headers: { ...serviceHeaders(), 'content-type': 'application/json', prefer: 'return=minimal' },
        body: JSON.stringify(values),
      })
      if (response.status === 404) return
      if (!response.ok) throw new Error(`ACCOUNT_DATA_UNLINK_FAILED:${table}`)
    },
    async scrubConsultationLedger(userId) {
      // 상담 이용권 행은 결제·이용 기록이라 남기지만, 대화 내용(sessions — 질문·답변·상대방 정보)은
      // 그 기록이 아니다. 이용권 숫자(credits)·요청 기록(attempts)·결제 예약(checkoutOrderId)만 남긴다.
      // 같은 행을 상담 화면이 동시에 고칠 수 있어 revision 이 같을 때만 바꾸고, 어긋나면 다시 읽는다.
      for (let retry = 0; retry < 6; retry += 1) {
        const response = await fetch(tableUrl('cheongi_reports', { user_id: `eq.${userId}`, report_id: 'like.consultation-*', select: 'report_id,user_email,payload' }), { headers: serviceHeaders() })
        if (response.status === 404) return
        if (!response.ok) throw new Error('ACCOUNT_DATA_READ_FAILED:cheongi_reports')
        const rows = await response.json() as Array<{ report_id: string; user_email: string | null; payload: LedgerPayload | null }>
        let conflict = false
        for (const row of rows) {
          const payload: LedgerPayload = row.payload ?? {}
          const ledger = payload.auxiliary?.consultation
          const hasConversation = Array.isArray(ledger?.sessions) && ledger.sessions.length > 0
          if (!hasConversation && !row.user_email && !payload.owner?.email && payload.anonymizedAt) continue
          const revision = payload.revision
          const next = structuredClone(payload)
          if (next.auxiliary?.consultation) {
            next.auxiliary.consultation.sessions = []
            delete next.auxiliary.consultation.lease
          }
          next.owner = { id: userId }
          // 생년월일도 지운다(2026-10-12 사용자 결정). 보관함·관리자 화면의 공용 코드가 birth 모양을 기대하므로
          // 칸을 없애지 않고 누구의 것도 아닌 고정값으로 바꾸고, 바꿨다는 표시(anonymizedAt)를 남긴다.
          next.birth = ANONYMIZED_BIRTH
          next.anonymizedAt = next.anonymizedAt ?? new Date().toISOString()
          next.revision = (typeof revision === 'number' ? revision : 0) + 1
          next.updatedAt = new Date().toISOString()
          const url = tableUrl('cheongi_reports', {
            report_id: `eq.${row.report_id}`,
            user_id: `eq.${userId}`,
            'payload->>revision': typeof revision === 'number' ? `eq.${revision}` : 'is.null',
          })
          const patched = await fetch(url, {
            method: 'PATCH',
            headers: { ...serviceHeaders(), 'content-type': 'application/json', prefer: 'return=representation' },
            body: JSON.stringify({ payload: next, user_email: null, updated_at: next.updatedAt }),
          })
          if (!patched.ok) throw new Error('ACCOUNT_DATA_SCRUB_FAILED:cheongi_reports')
          if (!(await patched.json() as unknown[]).length) conflict = true
        }
        if (!conflict) return
      }
      throw new Error('ACCOUNT_DATA_SCRUB_FAILED:cheongi_reports')
    },
    async deleteCouponWallets(userId) {
      // 쿠폰 표가 이 환경에 아직 없으면(준비만 된 마이그레이션) 지울 쿠폰도 없다.
      const probe = await fetch(tableUrl('coupon_state', { id: 'eq.1', select: 'id' }), { headers: serviceHeaders() })
      if (probe.status === 404) return
      if (!probe.ok) throw new Error('ACCOUNT_DATA_READ_FAILED:coupon_state')
      if (!(await probe.json() as unknown[]).length) return
      await removeWalletsForDeletedMember(userId)
    },
    async deleteStoredFiles(userId) {
      // 스케치는 {회원 id}/{풀이 id}/{파일} 에 저장된다. 목록은 한 단계씩만 보여 줘서 두 번 내려간다.
      const folders = await listFolder(userId)
      if (!folders) return
      const paths: string[] = []
      for (const entry of folders) {
        if (entry.id) { paths.push(`${userId}/${entry.name}`); continue }
        for (const file of (await listFolder(`${userId}/${entry.name}`)) ?? []) {
          if (file.id) paths.push(`${userId}/${entry.name}/${file.name}`)
        }
      }
      for (let i = 0; i < paths.length; i += 100) {
        const response = await fetch(`${supabaseUrl}/storage/v1/object/${sketchBucket}`, {
          method: 'DELETE',
          headers: { ...serviceHeaders(), 'content-type': 'application/json' },
          body: JSON.stringify({ prefixes: paths.slice(i, i + 100) }),
        })
        if (!response.ok) throw new Error('ACCOUNT_FILES_DELETE_FAILED')
      }
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
