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
    assert.deepEqual(result, { claimed: 1, retried: 1, dead: 0, succeeded: 0, released: 0, capacity: 3 })
    assert.equal(finalize?.init?.method, 'PATCH')
    const body = JSON.parse(String(finalize?.init?.body)) as Record<string, unknown>
    assert.equal(body.state, 'retry'); assert.equal(body.last_error, 'NO_OPS_HANDLER')
    // 실패한 실행은 시도 횟수를 그대로 둔다(claim 이 올린 값). 되돌리는 건 진행한 실행만이다.
    assert.equal('attempts' in body, false)
    // 물러서는 폭은 8분을 넘지 않는다. 예전엔 64분까지 갔다.
    const wait = Date.parse(String(body.next_run_at)) - Date.now()
    assert.ok(wait > 0 && wait <= 8 * 60_000 + 5_000, `backoff ${wait}ms`)
    // 차선의 세 배를 집어 회원별로 고른다. 앉지 못한 것은 순번·시도 횟수를 그대로 되돌린다.
    const claim = calls.find((call) => call.url.pathname.endsWith('/rpc/claim_ops_jobs'))
    assert.equal(JSON.parse(String(claim?.init?.body)).p_limit, 9)
  })

  it('최대 시도에 도달한 처리기 없는 작업을 dead-letter로 이동한다', async () => {
    claimedAttempts = 2; calls.length = 0
    const result = await worker.runOpsWorker()
    const body = JSON.parse(String(calls.at(-1)?.init?.body)) as Record<string, unknown>
    assert.deepEqual(result, { claimed: 1, retried: 0, dead: 1, succeeded: 0, released: 0, capacity: 3 })
    assert.equal(body.state, 'dead'); assert.equal(body.last_error, 'NO_OPS_HANDLER')
  })
})

/**
 * 2026-09-18: 한 회원(관리자 QA 계정)의 리포트 4건이 큐 앞에 몰려 세 차선을 다 가져갔다.
 * 그 사이 결제한 다른 고객은 다음 분을 기다렸다. 차선은 회원별로 나누고 결제분을 먼저 앉힌다.
 */
describe('차선 배정(seatJobs)', () => {
  const kind = 'report.sections.complete'
  const row = (id: string, target: string, ownerId?: string, paid?: boolean, next?: string) => ({
    id, kind, target_id: target, attempts: 1, max_attempts: 5, next_run_at: next ?? '2026-09-18T00:00:00Z',
    payload: { ...(ownerId ? { ownerId } : {}), ...(paid ? { paid } : {}) },
  })

  it('회원당 한 건씩 앉히고 결제분을 먼저 본다', () => {
    const jobs = [
      row('a1', 'r-a1', 'owner-a'), row('a2', 'r-a2', 'owner-a'), row('a3', 'r-a3', 'owner-a'), row('a4', 'r-a4', 'owner-a'),
      row('b1', 'r-b1', 'owner-b', true),
      row('c1', 'r-c1', 'owner-c'),
      row('d1', 'r-d1', 'owner-d'),
    ]
    const { seated, duplicates, released } = worker.seatJobs(jobs, 3)
    assert.deepEqual(seated.map((job) => job.id), ['b1', 'a1', 'c1'], '결제분 b1 이 맨 앞, 그다음 도착 순으로 회원당 하나')
    assert.deepEqual(duplicates, [])
    assert.deepEqual(released.map((job) => job.id), ['a2', 'a3', 'a4', 'd1'])
  })

  it('회원이 차선보다 적으면 같은 회원의 다음 건으로 차선을 채운다', () => {
    const jobs = [row('a1', 'r-a1', 'owner-a'), row('a2', 'r-a2', 'owner-a'), row('b1', 'r-b1', 'owner-b')]
    const { seated, released } = worker.seatJobs(jobs, 3)
    assert.deepEqual(seated.map((job) => job.id), ['a1', 'b1', 'a2'])
    assert.deepEqual(released, [])
  })

  it('같은 대상의 쌍둥이는 따로 모으고, 소유자 없는 예전 작업은 저마다 다른 회원으로 본다', () => {
    const jobs = [row('x1', 'r-x'), row('x2', 'r-x'), row('y1', 'r-y'), row('z1', 'r-z'), row('w1', 'r-w')]
    const { seated, duplicates, released } = worker.seatJobs(jobs, 3)
    assert.deepEqual(duplicates.map((job) => job.id), ['x2'])
    assert.deepEqual(seated.map((job) => job.id), ['x1', 'y1', 'z1'])
    assert.deepEqual(released.map((job) => job.id), ['w1'])
  })
})

describe('앉지 못한 작업의 되돌리기', { concurrency: false }, () => {
  it('집었지만 차선이 없는 작업은 처리기 전에 원래 순번과 시도 횟수로 돌려놓는다', async () => {
    calls.length = 0
    const kind = 'report.sections.complete'
    const many = Array.from({ length: 5 }, (_, index) => ({
      id: `j${index}`, kind, target_id: `r${index}`, attempts: 2, max_attempts: 5,
      next_run_at: `2026-09-18T00:0${index}:00.000Z`, payload: { ownerId: `owner-${index}` },
    }))
    const original = globalThis.fetch
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
      calls.push({ url, init })
      if (url.pathname.endsWith('/rpc/claim_ops_jobs')) return Response.json(many)
      return new Response(null, { status: 204 })
    }) as typeof fetch
    try {
      const result = await worker.runOpsWorker()
      assert.equal(result.claimed, 5)
      assert.equal(result.released, 2)
      const patches = calls.filter((call) => call.init?.method === 'PATCH')
        .map((call) => ({ id: /id=eq\.([^&]+)/.exec(call.url.search)?.[1], body: JSON.parse(String(call.init?.body)) as Record<string, unknown> }))
      const releasedPatches = patches.filter((patch) => patch.id === 'j3' || patch.id === 'j4')
      assert.equal(releasedPatches.length, 2)
      for (const patch of releasedPatches) {
        assert.equal(patch.body.state, 'retry')
        assert.equal(patch.body.attempts, 1, 'claim 이 올린 시도 횟수를 되돌린다')
        assert.match(String(patch.body.next_run_at), /^2026-09-18T00:0[34]:00/, '원래 순번을 지킨다')
        assert.equal('last_error' in patch.body, false, '실패가 아니므로 오류를 남기지 않는다')
      }
      // 되돌리기는 처리기(200초까지 걸림)보다 먼저 일어나야 다른 실행이 바로 집을 수 있다.
      const firstReleaseIndex = calls.findIndex((call) => call.init?.method === 'PATCH' && /id=eq\.j3/.test(call.url.search))
      const firstSeatedFinalize = calls.findIndex((call) => call.init?.method === 'PATCH' && /id=eq\.j0/.test(call.url.search))
      assert.ok(firstReleaseIndex < firstSeatedFinalize, '되돌리기가 앉은 작업의 마감보다 앞선다')
    } finally { globalThis.fetch = original }
  })
})
