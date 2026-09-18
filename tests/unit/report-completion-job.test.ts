import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'

/**
 * 2026-09-17: 결제한 해석이 사용자가 화면을 떠나면 그 자리에서 멈췄다.
 *
 * `/api/report/prewarm` 이 호출당 한 섹션만 만들었고, 다음 섹션은 화면이 다시 부를 때만
 * 만들어졌다. 목차가 열둘인 상품은 사용자가 몇 분을 붙들고 있어야 끝까지 나왔고, 탭을
 * 닫으면 미완성으로 남았다. `startReportPreGeneration` 은 정의만 있고 아무도 부르지 않았다.
 *
 * 이제 결제가 끝나면 작업을 큐에 넣고 워커가 남은 섹션을 이어 만든다. 이 파일이 지키는
 * 것은 두 가지다 — 같은 결제가 작업을 복제하지 않는 것, 그리고 하지 못한 일을 성공으로
 * 닫지 않는 것.
 */

const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://ops-queue.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_synthetic_ops_queue'
// 저장소를 파일로 고정해야 없는 리포트가 '못 찾음'으로 떨어진다.
process.env.REPORT_STORAGE_DIR = mkdtempSync(join(tmpdir(), 'umsh-completion-'))

const calls: Array<{ url: URL; init?: RequestInit }> = []
const nativeFetch = globalThis.fetch
let enqueueStatus = 201
let claimKind = 'report.sections.complete'
let claimRows: Array<{ id: string; kind: string; target_id: string; attempts: number; max_attempts: number }> | null = null

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  calls.push({ url, init })
  if (url.pathname.endsWith('/rpc/claim_ops_jobs')) {
    const rows = claimRows ?? [{ id: 'job-1', kind: claimKind, target_id: 'report-does-not-exist', attempts: 0, max_attempts: 5 }]
    return new Response(JSON.stringify(rows), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  if (url.pathname.endsWith('/ops_jobs') && init?.method === 'POST') return new Response(null, { status: enqueueStatus })
  if (url.pathname.endsWith('/ops_jobs') && (!init?.method || init.method === 'GET')) {
    const states = inList(url.searchParams.get('state'))
    const kind = url.searchParams.get('kind')?.replace(/^eq\./, '')
    const rows = opsRows.filter((row) => states.includes(row.state) && (!kind || row.kind === kind))
    return Response.json(rows)
  }
  if (url.pathname.endsWith('/ops_jobs') && init?.method === 'PATCH' && url.searchParams.get('id')?.startsWith('in.(')) {
    // closeOpsJobs: 상태가 대기·재시도인 행만 닫힌다. running 은 필터에 걸려 그대로 남는다.
    const ids = inList(url.searchParams.get('id'))
    const states = inList(url.searchParams.get('state'))
    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    const closed = opsRows.filter((row) => ids.includes(row.id) && states.includes(row.state))
    for (const row of closed) { row.state = String(body.state); row.last_error = String(body.last_error) }
    return Response.json(closed)
  }
  if (url.pathname.endsWith('/ops_jobs') && init?.method === 'DELETE') {
    const states = inList(url.searchParams.get('state'))
    const targets = inList(url.searchParams.get('target_id'))
    const kind = url.searchParams.get('kind')?.replace(/^eq\./, '')
    const gone = opsRows.filter((row) => states.includes(row.state) && targets.includes(row.target_id) && (!kind || row.kind === kind))
    opsRows = opsRows.filter((row) => !gone.includes(row))
    return Response.json(gone)
  }
  return new Response(null, { status: 204 })
}) as typeof fetch

/** PostgREST 의 `in.(a,b)` 필터를 배열로. */
function inList(value: string | null): string[] {
  const match = /^in\.\((.*)\)$/.exec(value ?? '')
  return match ? match[1].split(',').filter(Boolean) : []
}

type OpsRow = { id: string; kind: string; target_id: string; state: string; idempotency_key?: string; created_at?: string; last_error?: string }
let opsRows: OpsRow[] = []

const job = await import('../../src/report/report-completion-job.js')
const worker = await import('../../src/admin/ops-worker.js')
const store = await import('../../src/report/report-store.js')
const queue = await import('../../src/report/report-queue.js')

after(() => {
  globalThis.fetch = nativeFetch
  for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]
  Object.assign(process.env, previousEnv)
})

describe('결제한 해석의 백그라운드 완성', { concurrency: false }, () => {
  it('같은 리포트는 revision 과 상관없이 한 건만 큐에 넣는다', () => {
    /*
     * 2026-09-18: 예전 키는 `…:report-1:<revision>` 이었다. revision 은 항목이 하나 완성될 때마다
     * 오르고 cron 은 매분 미완성 리포트를 넣으므로, 생성 중인 리포트 하나가 매분 새 작업을
     * 만들었다 — 대기 작업이 227건까지 불었다. 이제 키에 revision 이 없다. 재생성은
     * reviveStalledJob 이 끝난(succeeded) 작업을 되살려 처리한다.
     */
    const first = job.reportCompletionIdempotencyKey('report-1')
    assert.equal(first, 'report.sections.complete:report-1')
    assert.doesNotMatch(first, /:\d+$/, '키 끝에 revision 이 붙으면 매분 새 작업이 생긴다')
  })

  it('작업을 멱등키와 함께 큐에 넣는다', async () => {
    calls.length = 0; enqueueStatus = 201
    assert.equal(await job.enqueueReportCompletion({ reportId: 'report-2' }), 'queued')
    const post = calls.find((call) => call.url.pathname.endsWith('/ops_jobs') && call.init?.method === 'POST')
    const body = JSON.parse(String(post?.init?.body)) as Record<string, unknown>
    assert.equal(body.kind, 'report.sections.complete')
    assert.equal(body.target_id, 'report-2')
    assert.equal(body.idempotency_key, 'report.sections.complete:report-2')
  })

  it('이미 큐에 있으면 중복으로 돌려주고 결제를 막지 않는다', async () => {
    calls.length = 0; enqueueStatus = 409
    assert.equal(await job.enqueueReportCompletion({ reportId: 'report-3' }), 'duplicate')
    // 409 뒤의 되살리기는 dead 와 succeeded 만 본다 — 키가 리포트당 하나가 된 뒤로 재생성이
    // 지나갈 유일한 문이다. retry 는 워커가 정한 백오프(잔액 소진 15분)를 지켜야 하므로 두고,
    // running·queued 는 돌거나 기다리는 중이다. 상한까지 실패한(REPORT_EXHAUSTED) dead 도 두 번 살리지 않는다.
    const revive = calls.find((call) => call.init?.method === 'PATCH' && call.url.pathname.endsWith('/ops_jobs'))
    assert.ok(revive, '409 뒤에 되살리기 PATCH 가 있어야 한다')
    assert.equal(revive?.url.searchParams.get('state'), 'in.(dead,succeeded)')
    assert.equal(revive?.url.searchParams.get('or'), '(last_error.is.null,last_error.neq.REPORT_EXHAUSTED)')
    enqueueStatus = 500
    assert.equal(await job.enqueueReportCompletion({ reportId: 'report-4' }), 'unavailable')
    // 리포트 아이디가 없으면 넣을 것도 없다. 던지지 않는다.
    assert.equal(await job.enqueueReportCompletion({ reportId: '' }), 'unavailable')
  })

  it('처리기가 실패하면 성공으로 닫지 않고 사유를 남긴다', async () => {
    calls.length = 0; claimKind = 'report.sections.complete'
    const result = await worker.runOpsWorker()
    assert.equal(result.succeeded, 0, '만들지 못한 해석을 완료로 닫으면 안 된다')
    assert.equal(result.retried, 1)
    const body = JSON.parse(String(calls.at(-1)?.init?.body)) as Record<string, unknown>
    assert.equal(body.state, 'retry')
    assert.equal(body.last_error, 'REPORT_NOT_FOUND')
  })

  it('처리기가 없는 종류는 예전처럼 되돌린다', async () => {
    calls.length = 0; claimKind = 'outbox.deliver'
    const result = await worker.runOpsWorker()
    assert.equal(result.succeeded, 0)
    const body = JSON.parse(String(calls.at(-1)?.init?.body)) as Record<string, unknown>
    assert.equal(body.last_error, 'NO_OPS_HANDLER')
  })

  it('한 실행 안에서 같은 리포트를 가리키는 쌍둥이 작업은 처리기를 태우지 않고 닫는다', async () => {
    // 2026-09-18: 키 결함으로 쌓인 쌍둥이가 세 차선에 나란히 올라 같은 항목을 겹쳐 만들려 했다.
    calls.length = 0
    const kind = 'report.sections.complete'
    claimRows = [
      { id: 'twin-1', kind, target_id: 'report-does-not-exist', attempts: 0, max_attempts: 5 },
      { id: 'twin-2', kind, target_id: 'report-does-not-exist', attempts: 0, max_attempts: 5 },
      { id: 'twin-3', kind, target_id: 'report-does-not-exist', attempts: 0, max_attempts: 5 },
    ]
    try {
      const result = await worker.runOpsWorker()
      const finals = calls
        .filter((call) => call.init?.method === 'PATCH')
        .map((call) => ({ id: /id=eq\.([^&]+)/.exec(call.url.search)?.[1], body: JSON.parse(String(call.init?.body)) as Record<string, unknown> }))
      const first = finals.find((final) => final.id === 'twin-1')
      const twins = finals.filter((final) => final.id !== 'twin-1')
      assert.equal(first?.body.last_error, 'REPORT_NOT_FOUND', '첫 작업만 실제로 처리기를 탄다')
      assert.equal(twins.length, 2)
      for (const twin of twins) {
        assert.equal(twin.body.state, 'succeeded')
        assert.equal(twin.body.last_error, 'OPS_DUPLICATE_TARGET')
      }
      assert.equal(result.succeeded, 2)
      assert.equal(result.retried, 1)
    } finally { claimRows = null }
  })
})

/**
 * 2026-09-18: 키 결함으로 쌓인 작업을 걷어내는 관리자 경로.
 *
 * 작업 행에는 소유자가 없으니 리포트를 읽어 맞춘다. 남의 리포트 작업과 워커가 들고 있는
 * running 은 어떤 경우에도 지우지 않는다.
 */
describe('한 회원의 완성 작업 걷어내기', { concurrency: false }, () => {
  function record(reportId: string, ownerId: string): import('../../src/report/report-store.js').ReportRecord {
    return {
      reportId, revision: 3, owner: { id: ownerId, email: `${ownerId}@example.com`, provider: 'email' },
      birth: { year: 1990, month: 1, day: 1, hour: 12, minute: 0, gender: 'female', calendar: 'solar' },
      context: { serviceKey: 'money_save', name: '테스트', birthTimeKnown: true },
      status: 'generating', createdAt: '2026-09-18T00:00:00Z', updatedAt: '2026-09-18T00:00:00Z',
      report: {
        title: '저축운', subtitle: '', model: 'test', generatedBy: 'template', status: 'generating',
        sections: [{ id: 's1', order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '', categoryEn: '', classification: '', hook: '', patternKeys: [], ragTopics: [], interpretation: '', status: 'pending' }],
      },
    }
  }

  it('그 회원의 리포트를 가리키는 대기·재시도·실패 작업만 지우고 running 과 남의 것은 남긴다', async () => {
    await store.saveReportRecord(record('r-good', 'owner-good'))
    await store.saveReportRecord(record('r-other', 'owner-other'))
    const kind = 'report.sections.complete'
    opsRows = [
      { id: 'j1', kind, target_id: 'r-good', state: 'queued' },
      { id: 'j2', kind, target_id: 'r-good', state: 'queued' },
      { id: 'j3', kind, target_id: 'r-good', state: 'retry' },
      { id: 'j4', kind, target_id: 'r-good', state: 'running' },
      { id: 'j5', kind, target_id: 'r-other', state: 'queued' },
      { id: 'j6', kind, target_id: 'r-missing', state: 'queued' },
      { id: 'j7', kind: 'outbox.deliver', target_id: 'r-good', state: 'queued' },
    ]
    calls.length = 0
    const outcome = await job.purgeReportCompletionJobsForOwner('owner-good')
    assert.equal(outcome.scannedJobs, 5, '이 종류의 지울 수 있는 상태만 센다 — running 과 다른 종류는 빠진다')
    assert.deepEqual(outcome.reports, [{ reportId: 'r-good', serviceKey: 'money_save', status: 'generating', jobs: 3 }])
    assert.equal(outcome.deleted, 3)
    assert.deepEqual(opsRows.map((row) => row.id), ['j4', 'j5', 'j6', 'j7'])
    const remove = calls.find((call) => call.init?.method === 'DELETE')
    assert.doesNotMatch(remove?.url.searchParams.get('state') ?? '', /running/, 'running 은 워커가 마감할 행이라 지우지 않는다')
    assert.equal(remove?.url.searchParams.get('kind'), 'eq.report.sections.complete', '같은 리포트의 다른 종류 작업은 남긴다')
  })

  it('running 을 지우라고 해도 거른다', async () => {
    opsRows = [{ id: 'j1', kind: 'report.sections.complete', target_id: 'r-good', state: 'running' }]
    const outcome = await job.purgeReportCompletionJobsForOwner('owner-good', ['running', 'queued'])
    assert.equal(outcome.deleted, 0)
    assert.equal(opsRows.length, 1)
  })
})

/**
 * 2026-09-18: 큐의 자가 치유. 어떤 경로가 중복을 만들어도 1분 안에 걷혀야 한다 — 그래야
 * 대기 200건이 결제 고객 앞에 서는 일이 다시 생기지 않는다.
 */
describe('큐 자가 치유(sweep)', { concurrency: false }, () => {
  const kind = 'report.sections.complete'
  function record(reportId: string, status: 'generating' | 'complete'): import('../../src/report/report-store.js').ReportRecord {
    return {
      reportId, revision: 1, owner: { id: 'owner-sweep', email: 'sweep@example.com', provider: 'email' },
      birth: { year: 1990, month: 1, day: 1, hour: 12, minute: 0, gender: 'female', calendar: 'solar' },
      context: { serviceKey: 'money_save', name: '테스트', birthTimeKnown: true },
      status, createdAt: '2026-09-18T00:00:00Z', updatedAt: '2026-09-18T00:00:00Z',
      report: {
        title: '저축운', subtitle: '', model: 'test', generatedBy: 'template', status,
        sections: [{ id: 's1', order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '', categoryEn: '', classification: '', hook: '', patternKeys: [], ragTopics: [], interpretation: status === 'complete' ? '본문' : '', status: status === 'complete' ? 'complete' : 'pending' }],
      },
    }
  }

  it('쌍둥이는 정식 키 하나만 남기고, 끝난 대상·지워진 대상의 작업은 닫고, 미완성 정식 작업과 running 은 남긴다', async () => {
    await store.saveReportRecord(record('r-live', 'generating'))
    await store.saveReportRecord(record('r-done', 'complete'))
    opsRows = [
      // r-live: 예전 키 둘 + 정식 키 하나. 정식 키가 살아야 한다(가장 오래됐더라도).
      { id: 'live-old-1', kind, target_id: 'r-live', state: 'queued', idempotency_key: `${kind}:r-live:3`, created_at: '2026-09-18T01:00:00Z' },
      { id: 'live-canon', kind, target_id: 'r-live', state: 'retry', idempotency_key: `${kind}:r-live`, created_at: '2026-09-18T00:30:00Z' },
      { id: 'live-old-2', kind, target_id: 'r-live', state: 'queued', idempotency_key: `${kind}:r-live:7`, created_at: '2026-09-18T02:00:00Z' },
      // r-legacy: 정식 키 없음. 가장 새것이 산다. 미완성 목록에 있으니 대상 확인은 생략된다.
      { id: 'legacy-a', kind, target_id: 'r-legacy', state: 'queued', idempotency_key: `${kind}:r-legacy:1`, created_at: '2026-09-18T01:00:00Z' },
      { id: 'legacy-b', kind, target_id: 'r-legacy', state: 'queued', idempotency_key: `${kind}:r-legacy:2`, created_at: '2026-09-18T03:00:00Z' },
      // r-done: 리포트가 이미 끝났다.
      { id: 'done-1', kind, target_id: 'r-done', state: 'queued', idempotency_key: `${kind}:r-done`, created_at: '2026-09-18T01:00:00Z' },
      // r-gone: 리포트가 지워졌다.
      { id: 'gone-1', kind, target_id: 'r-gone', state: 'queued', idempotency_key: `${kind}:r-gone`, created_at: '2026-09-18T01:00:00Z' },
      // running 과 다른 종류는 어떤 경우에도 건드리지 않는다.
      { id: 'run-1', kind, target_id: 'r-done', state: 'running', idempotency_key: `${kind}:r-done:9`, created_at: '2026-09-18T01:00:00Z' },
      { id: 'other-1', kind: 'outbox.deliver', target_id: 'r-done', state: 'queued', idempotency_key: 'outbox:r-done', created_at: '2026-09-18T01:00:00Z' },
    ]
    calls.length = 0
    const outcome = await job.sweepReportCompletionJobs(new Set(['r-live', 'r-legacy']))
    assert.deepEqual(outcome, { scanned: 7, duplicates: 3, completeTargets: 1, goneTargets: 1 })
    const state = Object.fromEntries(opsRows.map((row) => [row.id, `${row.state}${row.last_error ? ':' + row.last_error : ''}`]))
    assert.deepEqual(state, {
      'live-old-1': 'succeeded:OPS_DUPLICATE_TARGET',
      'live-canon': 'retry',
      'live-old-2': 'succeeded:OPS_DUPLICATE_TARGET',
      'legacy-a': 'succeeded:OPS_DUPLICATE_TARGET',
      'legacy-b': 'queued',
      'done-1': 'succeeded:OPS_TARGET_COMPLETE',
      'gone-1': 'succeeded:OPS_TARGET_GONE',
      'run-1': 'running',
      'other-1': 'queued',
    })
    // 미완성 목록에 있는 대상은 레코드를 다시 읽지 않는다. 읽은 것은 r-done, r-gone 둘뿐이어야 한다.
    const closes = calls.filter((call) => call.init?.method === 'PATCH')
    for (const close of closes) assert.equal(close.url.searchParams.get('state'), 'in.(queued,retry)', 'running 은 닫는 필터에서 빠진다')
  })

  it('큐가 비어 있으면 아무것도 읽지 않는다', async () => {
    opsRows = []
    calls.length = 0
    const outcome = await job.sweepReportCompletionJobs(new Set())
    assert.deepEqual(outcome, { scanned: 0, duplicates: 0, completeTargets: 0, goneTargets: 0 })
    assert.equal(calls.filter((call) => call.init?.method === 'PATCH').length, 0)
  })

  it('pickSurvivor: 정식 키가 있으면 그것, 없으면 가장 새것', () => {
    const canon = { id: 'c', kind, target_id: 't', state: 'queued', idempotency_key: `${kind}:t`, created_at: '2026-01-01T00:00:00Z' }
    const newer = { id: 'n', kind, target_id: 't', state: 'queued', idempotency_key: `${kind}:t:5`, created_at: '2026-02-01T00:00:00Z' }
    const older = { id: 'o', kind, target_id: 't', state: 'queued', idempotency_key: `${kind}:t:4`, created_at: '2025-12-01T00:00:00Z' }
    assert.equal(job.pickSurvivor([older, canon, newer]).id, 'c')
    assert.equal(job.pickSurvivor([older, newer]).id, 'n')
  })
})

describe('백필 대상에 소유자와 결제 여부를 싣는다', () => {
  it('결제분은 paid, 관리자가 연 것도 paid, 티저는 false', () => {
    const targets = job.selectBackfillReports([
      incompleteRef({ reportId: 'paid-1', updatedAt: '2026-09-18T01:00:00.000Z' }),
      incompleteRef({ reportId: 'admin-1', updatedAt: '2026-09-18T02:00:00.000Z', adminAcquiredAt: '2026-09-18T02:00:00.000Z' }),
      incompleteRef({ reportId: 'teaser-1', updatedAt: '2026-09-18T03:00:00.000Z', ownerId: 'u9' }),
    ], new Set(['paid-1']))
    assert.deepEqual(targets, [
      { reportId: 'paid-1', ownerId: 'u1', paid: true },
      { reportId: 'admin-1', ownerId: 'u1', paid: true },
      { reportId: 'teaser-1', ownerId: 'u9', paid: false },
    ])
  })

  it('큐 작업 payload 에는 소유자 식별자와 결제 표시만 싣고 개인 정보는 싣지 않는다', async () => {
    calls.length = 0; enqueueStatus = 201
    await job.enqueueReportCompletion({ reportId: 'report-9', ownerId: 'owner-9', paid: true })
    const post = calls.find((call) => call.url.pathname.endsWith('/ops_jobs') && call.init?.method === 'POST')
    const body = JSON.parse(String(post?.init?.body)) as { payload: Record<string, unknown> }
    assert.deepEqual(body.payload, { reportId: 'report-9', revision: 0, ownerId: 'owner-9', paid: true })
  })
})

/**
 * 2026-09-18: OpenAI 잔액이 끊긴 사이 큐가 매분 리포트마다 여섯 번씩 헛호출을 냈다. 잔액 소진은
 * 이 실행으로 풀리지 않는 일이므로 코드로 던져 워커가 15분 물러서게 하고, 반대로 진짜 실패가
 * 상한까지 쌓인 리포트는 고정해 무한 재생성을 막는다.
 */
describe('실행 판정(classifyRun)과 상한', { concurrency: false }, () => {
  const QUOTA = queue.OPENAI_QUOTA_EXHAUSTED_MESSAGE
  type Attempt = NonNullable<import('../../src/types/index.js').SajuReportSection['attempts']>[number]
  const failed = (error: string, startedAt: string): Attempt => ({ id: `a-${Math.random()}`, startedAt, finishedAt: startedAt, model: 'test', status: 'failed', error })
  function record(sections: Array<{ status: 'pending' | 'failed' | 'complete'; attempts?: Attempt[] }>): import('../../src/report/report-store.js').ReportRecord {
    return {
      reportId: 'r-classify', revision: 1, owner: { id: 'owner-c', email: 'c@example.com', provider: 'email' },
      birth: { year: 1990, month: 1, day: 1, hour: 12, minute: 0, gender: 'female', calendar: 'solar' },
      context: { serviceKey: 'money_save', name: '테스트', birthTimeKnown: true },
      status: 'generating', createdAt: '2026-09-18T00:00:00Z', updatedAt: '2026-09-18T00:00:00Z',
      report: {
        title: '저축운', subtitle: '', model: 'test', generatedBy: 'template', status: 'generating',
        sections: sections.map((section, index) => ({
          id: `s${index}`, order: index + 1, imageKey: '', imageSrc: '', imageAlt: '', category: '', categoryEn: '', classification: '', hook: '', patternKeys: [], ragTopics: [],
          interpretation: section.status === 'complete' ? '본문' : '', status: section.status, attempts: section.attempts,
        })),
      },
    }
  }
  const runStart = Date.parse('2026-09-18T10:00:00Z')

  it('이 실행 안에 잔액 소진이 찍힌 항목이 하나라도 있으면 quota', () => {
    const rec = record([
      { status: 'complete' },
      { status: 'failed', attempts: [failed('검수 지적', '2026-09-18T10:00:10Z')] },
      { status: 'failed', attempts: [failed(QUOTA, '2026-09-18T10:00:20Z')] },
      { status: 'pending' },
    ])
    assert.equal(job.classifyRun(rec, runStart), 'quota')
  })

  it('키 거절은 잔액 소진보다 우선한다 — 잔액이 있어도 키가 죽었으면 아무것도 안 된다', () => {
    const rec = record([
      { status: 'failed', attempts: [failed(QUOTA, '2026-09-18T10:00:10Z')] },
      { status: 'failed', attempts: [failed(queue.OPENAI_KEY_REJECTED_MESSAGE, '2026-09-18T10:00:20Z')] },
    ])
    assert.equal(job.classifyRun(rec, runStart), 'key')
    assert.deepEqual([...job.PROVIDER_OUTAGE_CODES], ['OPENAI_QUOTA_EXHAUSTED', 'OPENAI_KEY_REJECTED'])
  })

  it('실행 전에 남은 옛 잔액 소진 기록은 이번 실행의 판정에 쓰지 않는다', () => {
    const rec = record([{ status: 'failed', attempts: [failed(QUOTA, '2026-09-18T09:00:00Z')] }, { status: 'pending' }])
    assert.equal(job.classifyRun(rec, runStart), null)
  })

  it('남은 항목 전부가 진짜 실패를 상한까지 쌓았을 때만 exhausted — 잔액 소진 실패는 세지 않는다', () => {
    const many = (error: string) => Array.from({ length: job.REPORT_GIVE_UP_FAILURES }, (_, i) => failed(error, `2026-09-18T0${i % 9}:00:00Z`))
    assert.equal(job.classifyRun(record([{ status: 'complete' }, { status: 'failed', attempts: many('검수 지적') }]), runStart), 'exhausted')
    // 하나라도 아직 여유가 있으면 포기하지 않는다.
    assert.equal(job.classifyRun(record([{ status: 'failed', attempts: many('검수 지적') }, { status: 'pending' }]), runStart), null)
    // 잔액 소진으로만 쌓인 것은 상한이 아니다 — 충전되면 살 수 있다.
    assert.equal(job.classifyRun(record([{ status: 'failed', attempts: many(QUOTA) }]), runStart), null)
    // 다 끝난 리포트는 판정할 것이 없다.
    assert.equal(job.classifyRun(record([{ status: 'complete' }]), runStart), null)
  })

  it('상한에 닿은 리포트는 모델을 부르기 전에 REPORT_EXHAUSTED 로 던진다', async () => {
    const rec = record([{ status: 'failed', attempts: Array.from({ length: job.REPORT_GIVE_UP_FAILURES }, (_, i) => failed('검수 지적', `2026-09-18T0${i % 9}:00:00Z`)) }])
    rec.reportId = 'r-exhausted'
    await store.saveReportRecord(rec)
    await assert.rejects(job.runReportCompletionJob('r-exhausted'), /REPORT_EXHAUSTED/)
  })

  it('sectionHitQuotaExhaustion 은 마지막 시도만 보고, countGenuineFailures 는 잔액 소진을 뺀다', () => {
    const section = { attempts: [failed('검수', '2026-09-18T09:00:00Z'), failed(QUOTA, '2026-09-18T10:00:30Z')] }
    assert.equal(queue.sectionHitQuotaExhaustion(section, runStart), true)
    assert.equal(queue.sectionHitQuotaExhaustion({ attempts: [failed(QUOTA, '2026-09-18T10:00:30Z'), failed('검수', '2026-09-18T10:00:40Z')] }, runStart), false)
    assert.equal(queue.countGenuineFailures(section), 1)
  })
})

function incompleteRef(over: Partial<import('../../src/report/report-completion-job.js').IncompleteReportRef> & { reportId: string }) {
  return {
    ownerId: 'u1',
    serviceKey: 'money_save',
    updatedAt: '2026-09-18T00:00:00.000Z',
    ...over,
  }
}

describe('대기·실패 해석 매분 백필 대상', { concurrency: false }, () => {
  it('결제한 대기·실패 리포트는 회원 수와 상관없이 모두, 오래된 것부터 넣는다', () => {
    const paid = new Set(['a', 'b', 'c'])
    const ids = job.selectBackfillReportIds([
      incompleteRef({ reportId: 'c', updatedAt: '2026-09-18T03:00:00.000Z' }),
      incompleteRef({ reportId: 'a', updatedAt: '2026-09-18T01:00:00.000Z', ownerId: 'u2', serviceKey: 'quit_fortune' }),
      incompleteRef({ reportId: 'b', updatedAt: '2026-09-18T02:00:00.000Z', ownerId: 'u3' }),
    ], paid)
    assert.deepEqual(ids, ['a', 'b', 'c'])
  })

  it('미결제 티저는 서비스당 최신 하나, 관리자가 연 해석은 모두 남긴다', () => {
    const ids = job.selectBackfillReportIds([
      incompleteRef({ reportId: 'old-qa', updatedAt: '2026-09-18T01:00:00.000Z' }),
      incompleteRef({ reportId: 'new-qa', updatedAt: '2026-09-18T02:00:00.000Z' }),
      incompleteRef({ reportId: 'admin-1', updatedAt: '2026-09-18T00:30:00.000Z', adminAcquiredAt: '2026-09-18T00:30:00.000Z' }),
      incompleteRef({ reportId: 'admin-2', updatedAt: '2026-09-18T00:40:00.000Z', adminAcquiredAt: '2026-09-18T00:40:00.000Z' }),
    ], new Set())
    assert.deepEqual(ids, ['admin-1', 'admin-2', 'new-qa'])
  })

  it('결제 조회가 죽으면 미완성 전부를 넣어 구매 회원을 건너뛰지 않는다', () => {
    const ids = job.selectBackfillReportIds([
      incompleteRef({ reportId: 'p1', updatedAt: '2026-09-18T01:00:00.000Z' }),
      incompleteRef({ reportId: 'p2', updatedAt: '2026-09-18T02:00:00.000Z', ownerId: 'u2' }),
    ], null)
    assert.deepEqual(ids, ['p1', 'p2'])
  })

  it('결제 주문이 resultId UUID 여도 같은 서비스의 구매 리포트를 모두 백필한다', () => {
    const ids = job.selectBackfillReportIds([
      incompleteRef({
        reportId: 'hash-save-1',
        resultId: 'af9d5513-be18-4096-9ee1-c0eaea7fbeba',
        updatedAt: '2026-09-18T01:00:00.000Z',
      }),
      incompleteRef({
        reportId: 'hash-save-2',
        resultId: 'bbbbbbbb-be18-4096-9ee1-c0eaea7fbeba',
        updatedAt: '2026-09-18T02:00:00.000Z',
      }),
    ], new Set(['af9d5513-be18-4096-9ee1-c0eaea7fbeba', 'bbbbbbbb-be18-4096-9ee1-c0eaea7fbeba']))
    assert.deepEqual(ids, ['hash-save-1', 'hash-save-2'])
  })
})
