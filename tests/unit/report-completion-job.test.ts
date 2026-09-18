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

type OpsRow = { id: string; kind: string; target_id: string; state: string }
let opsRows: OpsRow[] = []

const job = await import('../../src/report/report-completion-job.js')
const worker = await import('../../src/admin/ops-worker.js')
const store = await import('../../src/report/report-store.js')

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
    // 409 뒤의 되살리기는 dead·retry 와 함께 succeeded 도 본다 — 키가 리포트당 하나가 된 뒤로
    // 재생성이 지나갈 유일한 문이다. running·queued 는 그대로 둔다.
    const revive = calls.find((call) => call.init?.method === 'PATCH' && call.url.pathname.endsWith('/ops_jobs'))
    assert.ok(revive, '409 뒤에 되살리기 PATCH 가 있어야 한다')
    assert.equal(revive?.url.searchParams.get('state'), 'in.(dead,retry,succeeded)')
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
