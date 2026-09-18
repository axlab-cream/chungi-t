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
const queue = await import('../../src/admin/ops-queue.js')
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

/**
 * 2026-09-18: 잔액이 끊긴 사이 큐가 매분 헛호출을 냈다. 실패 코드마다 물러서는 폭이 달라야 한다.
 */
describe('마감 계획(planFinalize)', () => {
  const kind = 'report.sections.complete'
  const job = (attempts: number, max = 5) => ({ id: 'j', kind, target_id: 'r', attempts, max_attempts: max })
  const now = Date.parse('2026-09-18T10:00:00Z')

  it('끝났으면 succeeded, 진행하고 남았으면 5초 뒤 retry 에 시도 횟수 복원', () => {
    assert.equal(worker.planFinalize(job(2), { finished: true, error: '' }, now).state, 'succeeded')
    const progress = worker.planFinalize(job(2), { finished: false, error: '' }, now)
    assert.equal(progress.state, 'retry')
    assert.equal(progress.body.attempts, 1)
    assert.equal(progress.body.next_run_at, new Date(now + 5_000).toISOString())
  })

  it('잔액 소진은 15분 뒤 retry 이고 시도 횟수를 세지 않는다 — 한도에 닿아 있어도 dead 가 아니다', () => {
    const plan = worker.planFinalize(job(5), { finished: false, error: 'OPENAI_QUOTA_EXHAUSTED' }, now)
    assert.equal(plan.state, 'retry')
    assert.equal(plan.body.attempts, 4)
    assert.equal(plan.body.next_run_at, new Date(now + worker.QUOTA_BACKOFF_MS).toISOString())
    assert.equal(plan.body.last_error, 'OPENAI_QUOTA_EXHAUSTED')
  })

  it('키 거절(401/403)도 잔액 소진과 같은 길 — 15분 뒤 retry, 시도 횟수 미소모', () => {
    const plan = worker.planFinalize(job(5), { finished: false, error: 'OPENAI_KEY_REJECTED' }, now)
    assert.equal(plan.state, 'retry')
    assert.equal(plan.body.attempts, 4)
    assert.equal(plan.body.next_run_at, new Date(now + worker.QUOTA_BACKOFF_MS).toISOString())
  })

  it('상한 도달은 시도 횟수와 상관없이 바로 dead', () => {
    const plan = worker.planFinalize(job(1), { finished: false, error: 'REPORT_EXHAUSTED' }, now)
    assert.equal(plan.state, 'dead')
    assert.equal(plan.body.last_error, 'REPORT_EXHAUSTED')
  })

  it('그 밖의 실패는 해석 완성이면 1분, 다른 종류는 지수 백오프(최대 8분), 한도면 dead', () => {
    const report = worker.planFinalize(job(2), { finished: false, error: 'REPORT_SECTION_FAILED' }, now)
    assert.equal(report.state, 'retry')
    assert.equal(report.body.next_run_at, new Date(now + 60_000).toISOString())
    assert.equal('attempts' in report.body, false, '실패한 실행은 claim 이 올린 시도 횟수를 그대로 둔다')
    const other = worker.planFinalize({ ...job(3), kind: 'outbox.deliver' }, { finished: false, error: 'NO_OPS_HANDLER' }, now)
    assert.equal(other.body.next_run_at, new Date(now + 8 * 60_000).toISOString())
    assert.equal(worker.planFinalize(job(5), { finished: false, error: 'REPORT_SECTION_FAILED' }, now).state, 'dead')
  })
})

/**
 * 2026-09-18: 게이트 오탐으로 호출의 87% 가 실패하며 토큰을 태울 때 멈출 수단이 없었다.
 * 표지 행(kind ops.pause, state dead)이 있으면 워커는 집지도 않는다 — 집은 뒤 멈추면 attempts 만 오른다.
 */
describe('생성 일시정지', { concurrency: false }, () => {
  it('정지 표지가 있으면 claim 을 부르지 않고 paused 로 돌아온다', async () => {
    calls.length = 0
    queue.resetGenerationPauseCache()
    const original = globalThis.fetch
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
      calls.push({ url, init })
      if (url.pathname.endsWith('/ops_jobs') && url.searchParams.get('idempotency_key') === 'eq.ops.pause:report-generation') return Response.json([{ state: 'dead' }])
      if (url.pathname.endsWith('/rpc/claim_ops_jobs')) return Response.json([{ id: 'j', kind: 'report.sections.complete', target_id: 'r', attempts: 0, max_attempts: 5 }])
      return new Response(null, { status: 204 })
    }) as typeof fetch
    try {
      const result = await worker.runOpsWorker()
      assert.equal(result.paused, true)
      assert.equal(result.claimed, 0)
      assert.equal(calls.some((call) => call.url.pathname.endsWith('/rpc/claim_ops_jobs')), false, '정지 중에는 집지 않는다')
    } finally { globalThis.fetch = original; queue.resetGenerationPauseCache() }
  })

  it('표지가 succeeded 로 바뀌면 해제된 것이다', async () => {
    queue.resetGenerationPauseCache()
    const original = globalThis.fetch
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
      if (url.searchParams.get('idempotency_key') === 'eq.ops.pause:report-generation') return Response.json([{ state: 'succeeded' }])
      return new Response(null, { status: 204 })
    }) as typeof fetch
    try { assert.equal(await queue.isGenerationPaused(), false) }
    finally { globalThis.fetch = original; queue.resetGenerationPauseCache() }
  })

  it('setGenerationPaused 는 표지 행을 병합 저장하고 claim 이 집지 않는 상태·시각으로 둔다', async () => {
    const posts: Array<Record<string, unknown>> = []
    const original = globalThis.fetch
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
      if (url.pathname.endsWith('/ops_jobs') && init?.method === 'POST') { posts.push({ conflict: url.searchParams.get('on_conflict'), prefer: (init.headers as Record<string, string>).prefer, body: JSON.parse(String(init.body)) }); return new Response(null, { status: 201 }) }
      return new Response(null, { status: 204 })
    }) as typeof fetch
    try {
      assert.equal(await queue.setGenerationPaused(true, 'ops@example.com'), true)
      const body = posts[0].body as Record<string, unknown>
      assert.equal(posts[0].conflict, 'idempotency_key')
      assert.match(String(posts[0].prefer), /merge-duplicates/)
      assert.equal(body.kind, 'ops.pause')
      assert.equal(body.state, 'dead', 'dead 는 claim 이 집지 않는다')
      assert.equal(body.next_run_at, '2099-01-01T00:00:00.000Z')
      assert.equal(body.last_error, 'GENERATION_PAUSED')
      assert.equal(await queue.isGenerationPaused(), true, '방금 켠 값은 캐시로 바로 보인다')
      assert.equal(await queue.setGenerationPaused(false, 'ops@example.com'), true)
      assert.equal((posts[1].body as Record<string, unknown>).state, 'succeeded')
      assert.equal(await queue.isGenerationPaused(), false)
    } finally { globalThis.fetch = original; queue.resetGenerationPauseCache() }
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
