import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://ops-worker.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_synthetic_ops_worker'
const calls: Array<{ url: URL; init?: RequestInit }> = []
const nativeFetch = globalThis.fetch
let claimedAttempts = 1
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  calls.push({ url, init })
  if (url.pathname.endsWith('/rpc/claim_ops_jobs')) {
    return new Response(JSON.stringify([{ id: 'job-1', kind: 'outbox.deliver', target_id: 'outbox-1', attempts: claimedAttempts, max_attempts: 2 }]), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  return new Response(null, { status: 204 })
}) as typeof fetch
const worker = await import('../../src/admin/ops-worker.js')
after(() => { globalThis.fetch = nativeFetch; for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]; Object.assign(process.env, previousEnv) })

describe('영속 작업 worker', { concurrency: false }, () => {
  it('처리기가 없는 outbox 작업을 성공으로 표기하지 않고 재시도한다', async () => {
    claimedAttempts = 1; calls.length = 0
    const result = await worker.runOpsWorker()
    const finalize = calls.at(-1)
    assert.deepEqual(result, { claimed: 1, retried: 1, dead: 0 })
    assert.equal(finalize?.init?.method, 'PATCH')
    const body = JSON.parse(String(finalize?.init?.body)) as Record<string, unknown>
    assert.equal(body.state, 'retry'); assert.equal(body.last_error, 'NO_OPS_HANDLER')
  })

  it('최대 시도에 도달한 처리기 없는 작업을 dead-letter로 이동한다', async () => {
    claimedAttempts = 2; calls.length = 0
    const result = await worker.runOpsWorker()
    const body = JSON.parse(String(calls.at(-1)?.init?.body)) as Record<string, unknown>
    assert.deepEqual(result, { claimed: 1, retried: 0, dead: 1 })
    assert.equal(body.state, 'dead'); assert.equal(body.last_error, 'NO_OPS_HANDLER')
  })
})
