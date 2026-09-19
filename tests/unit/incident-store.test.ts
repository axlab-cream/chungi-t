import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://incident-store.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_synthetic_incident_store'
const calls: Array<{ url: URL; init?: RequestInit }> = []
const nativeFetch = globalThis.fetch
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url); calls.push({ url, init })
  const isUpdate = url.pathname.endsWith('/admin_incident_updates')
  return new Response(JSON.stringify([isUpdate
    ? { id: 'u1', incident_id: '11111111-1111-1111-1111-111111111111', author_email: 'staff@synthetic.invalid', text: '원인 확인 중', created_at: '2026-01-01T00:00:00Z' }
    : { id: '11111111-1111-1111-1111-111111111111', title: '결제 실패 급증', severity: 'high', status: 'investigating', summary: '결제 승인율이 떨어졌다', affected_area: '결제', owner_email: 'staff@synthetic.invalid', created_by_email: 'staff@synthetic.invalid', revision: 2, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', resolved_at: null },
  ]), { status: 200, headers: { 'content-type': 'application/json' } })
}) as typeof fetch
const store = await import('../../src/admin/incident-store.js')
after(() => { globalThis.fetch = nativeFetch; for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]; Object.assign(process.env, previousEnv) })

describe('장애 저장소', { concurrency: false }, () => {
  it('상태 변경은 revision 조건을 쓴다', async () => {
    const result = await store.updateIncident({ id: '11111111-1111-1111-1111-111111111111', expectedRevision: 1, severity: 'high', status: 'investigating', ownerEmail: 'staff@synthetic.invalid' })
    const call = calls.at(-1); const payload = JSON.parse(String(call?.init?.body)) as Record<string, unknown>
    assert.equal(call?.init?.method, 'PATCH'); assert.equal(call?.url.searchParams.get('revision'), 'eq.1'); assert.equal(payload.revision, 2); assert.equal(result?.status, 'investigating')
  })

  /**
   * 2026-09-19: resolved·closed 로 옮기면 resolved_at 을 지금 시각으로 찍고, 그 밖의
   * 상태로는 항상 비운다 — 재발로 open 으로 되돌아가도 "해결 시각"이 예전 값으로 남지 않는다.
   */
  it('resolved·closed 로 옮기면 resolved_at 을 찍고, 그 밖의 상태는 비운다', async () => {
    await store.updateIncident({ id: '11111111-1111-1111-1111-111111111111', expectedRevision: 2, severity: 'high', status: 'resolved', ownerEmail: null })
    let payload = JSON.parse(String(calls.at(-1)?.init?.body)) as Record<string, unknown>
    assert.ok(typeof payload.resolved_at === 'string' && payload.resolved_at, 'resolved 인데 resolved_at 이 안 찍혔다')

    await store.updateIncident({ id: '11111111-1111-1111-1111-111111111111', expectedRevision: 3, severity: 'high', status: 'investigating', ownerEmail: null })
    payload = JSON.parse(String(calls.at(-1)?.init?.body)) as Record<string, unknown>
    assert.equal(payload.resolved_at, null, '다시 진행 중인데 resolved_at 이 남아 있다')
  })

  it('처리 기록은 담당자 이메일과 함께 저장된다', async () => {
    const result = await store.createIncidentUpdate({ incidentId: '11111111-1111-1111-1111-111111111111', text: '원인 확인 중', actorEmail: 'staff@synthetic.invalid' })
    const payload = JSON.parse(String(calls.at(-1)?.init?.body)) as Record<string, unknown>
    assert.deepEqual(payload, { incident_id: '11111111-1111-1111-1111-111111111111', text: '원인 확인 중', author_email: 'staff@synthetic.invalid' })
    assert.equal(result.text, '원인 확인 중')
  })

  it('목록은 열린 사건이 먼저 오도록 정렬 조건을 건다', async () => {
    await store.listIncidents()
    assert.equal(calls.at(-1)?.url.searchParams.get('order'), 'status.asc,created_at.desc')
  })
})
