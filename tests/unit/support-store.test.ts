import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://support-store.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_synthetic_support_store'
const calls: Array<{ url: URL; init?: RequestInit }> = []
const nativeFetch = globalThis.fetch
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url); calls.push({ url, init })
  const isNote = url.pathname.endsWith('/support_notes')
  return new Response(JSON.stringify([isNote ? { id: 'n1', case_id: '11111111-1111-1111-1111-111111111111', author_email: 'staff@synthetic.invalid', kind: 'internal', text: '처리 메모', created_at: '2026-01-01T00:00:00Z' } : { id: '11111111-1111-1111-1111-111111111111', member_id: null, order_id: null, report_id: null, category: 'access', status: 'triaged', assignee_email: null, priority: 'high', resolution_code: null, revision: 4, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }]), { status: 200, headers: { 'content-type': 'application/json' } })
}) as typeof fetch
const store = await import('../../src/admin/support-store.js')
after(() => { globalThis.fetch = nativeFetch; for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]; Object.assign(process.env, previousEnv) })

describe('고객 지원 저장소', { concurrency: false }, () => {
  it('상태 변경은 revision 조건을 사용한다', async () => {
    const result = await store.updateSupportCase({ id: '11111111-1111-1111-1111-111111111111', expectedRevision: 3, status: 'triaged', priority: 'high', assigneeEmail: null, resolutionCode: null })
    const call = calls.at(-1); const payload = JSON.parse(String(call?.init?.body)) as Record<string, unknown>
    assert.equal(call?.init?.method, 'PATCH'); assert.equal(call?.url.searchParams.get('revision'), 'eq.3'); assert.equal(payload.revision, 4); assert.equal(result?.status, 'triaged')
  })
  it('고객 답변은 자동 발송이 아닌 초안 note로 저장한다', async () => {
    const result = await store.createSupportNote({ caseId: '11111111-1111-1111-1111-111111111111', kind: 'customer_reply_draft', text: '고객에게 보낼 초안', actorEmail: 'staff@synthetic.invalid' })
    const payload = JSON.parse(String(calls.at(-1)?.init?.body)) as Record<string, unknown>
    assert.deepEqual(payload, { case_id: '11111111-1111-1111-1111-111111111111', kind: 'customer_reply_draft', text: '고객에게 보낼 초안', author_email: 'staff@synthetic.invalid' }); assert.equal(result.kind, 'internal')
  })
})
