import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { deleteOwnAccount, restAccountDeletionStore, type AccountDeletionStore } from '../../src/user/account-deletion.js'

/**
 * 2026-10: 회원 본인 탈퇴. 결제가 있으면 계정을 소프트 삭제해 결제 기록(5년 보관)을 남기고,
 * 없으면 계정을 완전히 지운다. 프로필·풀이 기록·푸시 기기는 어느 쪽이든 지운다.
 */
const USER = 'aaaaaaaa-0000-0000-0000-000000000001'

function recordingStore(hasPayments: boolean) {
  const calls: string[] = []
  const store: AccountDeletionStore = {
    async hasPaymentOrders() { return hasPayments },
    async deleteRows(table, filters) { calls.push(`rows:${table}:${JSON.stringify(filters)}`) },
    async deleteAuthUser(userId, soft) { calls.push(`auth:${userId}:${soft ? 'soft' : 'hard'}`) },
  }
  return { store, calls }
}

describe('deleteOwnAccount', () => {
  it('hard-deletes an account with no payments after removing owned rows', async () => {
    const { store, calls } = recordingStore(false)
    const result = await deleteOwnAccount(USER, store)
    assert.deepEqual(result, { userId: USER, paymentRecordsRetained: false })
    assert.equal(calls.at(-1), `auth:${USER}:hard`)
    for (const table of ['cheongi_reports', 'cheongi_user_profiles', 'push_devices', 'job_choice_free_preview_claims']) {
      assert.ok(calls.some((call) => call.startsWith(`rows:${table}:`)), table)
    }
  })

  it('soft-deletes an account with payments so the payment rows keep their owner', async () => {
    const { store, calls } = recordingStore(true)
    const result = await deleteOwnAccount(USER, store)
    assert.equal(result.paymentRecordsRetained, true)
    assert.equal(calls.at(-1), `auth:${USER}:soft`)
  })

  it('never touches payment, financial, refund tables or the consultation ledger', async () => {
    const { store, calls } = recordingStore(true)
    await deleteOwnAccount(USER, store)
    assert.ok(!calls.some((call) => /payment_orders|financial_events|refund_requests/.test(call)))
    const reports = calls.find((call) => call.startsWith('rows:cheongi_reports:'))
    assert.match(reports ?? '', /not\.like\.consultation-\*/)
  })

  it('keeps the account when a data step fails so the member can retry', async () => {
    const { store, calls } = recordingStore(false)
    store.deleteRows = async () => { throw new Error('ACCOUNT_DATA_DELETE_FAILED:cheongi_reports') }
    await assert.rejects(deleteOwnAccount(USER, store), /ACCOUNT_DATA_DELETE_FAILED/)
    assert.ok(!calls.some((call) => call.startsWith('auth:')))
  })

  it('rejects a malformed user id', async () => {
    const { store } = recordingStore(false)
    await assert.rejects(deleteOwnAccount('../admin', store), /ACCOUNT_ID_INVALID/)
  })
})

describe('restAccountDeletionStore', () => {
  const previousEnv = { ...process.env }
  const nativeFetch = globalThis.fetch
  after(() => { process.env = previousEnv; globalThis.fetch = nativeFetch })

  it('sends should_soft_delete to the Auth admin API and tolerates missing tables', async () => {
    process.env.SUPABASE_URL = 'https://account.synthetic.invalid'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
    const seen: Array<{ method: string; url: URL; body?: unknown }> = []
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
      seen.push({ method: init?.method ?? 'GET', url, body: init?.body ? JSON.parse(String(init.body)) : undefined })
      if (url.pathname === '/rest/v1/push_devices') return new Response('{}', { status: 404 })
      return new Response(null, { status: 204 })
    }) as typeof fetch

    const store = restAccountDeletionStore()
    await store.deleteRows('push_devices', { user_id: `eq.${USER}` })
    await store.deleteRows('cheongi_user_profiles', { user_id: `eq.${USER}` })
    await store.deleteAuthUser(USER, true)

    const auth = seen.find((call) => call.url.pathname === `/auth/v1/admin/users/${USER}`)
    assert.equal(auth?.method, 'DELETE')
    assert.deepEqual(auth?.body, { should_soft_delete: true })
    assert.equal(seen.find((call) => call.url.pathname === '/rest/v1/cheongi_user_profiles')?.url.searchParams.get('user_id'), `eq.${USER}`)
  })
})
