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

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  calls.push({ url, init })
  if (url.pathname.endsWith('/rpc/claim_ops_jobs')) {
    return new Response(
      JSON.stringify([{ id: 'job-1', kind: claimKind, target_id: 'report-does-not-exist', attempts: 0, max_attempts: 5 }]),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )
  }
  if (url.pathname.endsWith('/ops_jobs') && init?.method === 'POST') return new Response(null, { status: enqueueStatus })
  return new Response(null, { status: 204 })
}) as typeof fetch

const job = await import('../../src/report/report-completion-job.js')
const worker = await import('../../src/admin/ops-worker.js')

after(() => {
  globalThis.fetch = nativeFetch
  for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]
  Object.assign(process.env, previousEnv)
})

describe('결제한 해석의 백그라운드 완성', { concurrency: false }, () => {
  it('같은 리포트는 한 건만 큐에 넣는다', () => {
    const first = job.reportCompletionIdempotencyKey('report-1')
    assert.equal(first, job.reportCompletionIdempotencyKey('report-1', 0))
    assert.equal(first, 'report.sections.complete:report-1:0')
    // 재생성(revision 상승)은 새 작업이다. 같은 키로 막히면 다시 만들 수 없다.
    assert.notEqual(first, job.reportCompletionIdempotencyKey('report-1', 1))
  })

  it('작업을 멱등키와 함께 큐에 넣는다', async () => {
    calls.length = 0; enqueueStatus = 201
    assert.equal(await job.enqueueReportCompletion({ reportId: 'report-2' }), 'queued')
    const post = calls.find((call) => call.url.pathname.endsWith('/ops_jobs') && call.init?.method === 'POST')
    const body = JSON.parse(String(post?.init?.body)) as Record<string, unknown>
    assert.equal(body.kind, 'report.sections.complete')
    assert.equal(body.target_id, 'report-2')
    assert.equal(body.idempotency_key, 'report.sections.complete:report-2:0')
  })

  it('이미 큐에 있으면 중복으로 돌려주고 결제를 막지 않는다', async () => {
    enqueueStatus = 409
    assert.equal(await job.enqueueReportCompletion({ reportId: 'report-3' }), 'duplicate')
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
})
