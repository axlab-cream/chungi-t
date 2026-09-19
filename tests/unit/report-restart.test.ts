import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

/**
 * 2026-09-19: 작업 큐에 남은 dead 3건 중 2건이 REPORT_EXHAUSTED 였다. 이 코드는 자동 백필이
 * 의도적으로 영영 건너뛰므로(되살려도 같은 비용으로 같은 실패), 사람이 원인을 보고 결정할
 * 수동 재시작 경로가 필요했다. 지키는 것:
 *   1. 진단은 원문(raw)을 싣지 않고 사유·시도 수·상한 판정만 준다.
 *   2. 재시작은 시도 기록을 지우지 않는다 — retryFloorAt 으로 상한만 다시 연다.
 *   3. 재시작은 REPORT_EXHAUSTED 로 고정된 작업도 되살리고 last_error 를 비운다.
 *   4. 완료된 리포트는 재시작하지 않는다.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://report-restart.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_synthetic_restart'
process.env.REPORT_STORAGE_DIR = mkdtempSync(join(tmpdir(), 'umsh-restart-'))

const calls: Array<{ url: URL; init?: RequestInit }> = []
let reviveMatches = 1
const nativeFetch = globalThis.fetch
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  calls.push({ url, init })
  if (url.pathname.endsWith('/ops_jobs') && init?.method === 'PATCH') {
    return Response.json(Array.from({ length: reviveMatches }, (_, i) => ({ id: `job-${i}` })))
  }
  if (url.pathname.endsWith('/ops_jobs') && init?.method === 'POST') return new Response(null, { status: 201 })
  throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
}) as typeof fetch

const store = await import('../../src/report/report-store.js')
const queue = await import('../../src/report/report-queue.js')
const job = await import('../../src/report/report-completion-job.js')

type Attempt = NonNullable<import('../../src/types/index.js').SajuReportSection['attempts']>[number]
const failed = (error: string, startedAt: string): Attempt => ({ id: `a-${Math.random()}`, startedAt, finishedAt: startedAt, model: 'test', status: 'failed', error })
const manyFailures = () => Array.from({ length: job.REPORT_GIVE_UP_FAILURES }, (_, i) => failed('미래 사건을 확인된 사실처럼 쓰지 말고 조건과 가능성의 말로 바꾸세요.', `2026-09-18T0${i % 9}:00:00Z`))

function record(reportId: string, sections: Array<{ status: 'pending' | 'failed' | 'complete'; attempts?: Attempt[] }>, status: 'generating' | 'complete' = 'generating'): import('../../src/report/report-store.js').ReportRecord {
  return {
    reportId, revision: 1, owner: { id: 'owner-r', email: 'r@example.com', provider: 'email' },
    birth: { year: 1990, month: 1, day: 1, hour: 12, minute: 0, gender: 'female', calendar: 'solar' },
    context: { serviceKey: 'match_couple', name: '테스트', birthTimeKnown: true },
    status, createdAt: '2026-09-18T00:00:00Z', updatedAt: '2026-09-18T00:00:00Z',
    report: {
      title: '커플궁합', subtitle: '', model: 'test', generatedBy: 'template', status,
      sections: sections.map((section, index) => ({
        id: `s${index}`, order: index + 1, imageKey: '', imageSrc: '', imageAlt: '', category: '', categoryEn: '', classification: `항목 ${index + 1}`, hook: '', patternKeys: [], ragTopics: [],
        interpretation: section.status === 'complete' ? '본문' : '', status: section.status, attempts: section.attempts,
      })),
    },
  }
}

after(() => {
  globalThis.fetch = nativeFetch
  for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]
  Object.assign(process.env, previousEnv)
})

describe('수동 재시작은 상한만 다시 열고 기록은 남긴다', { concurrency: false }, () => {
  before(() => { calls.length = 0; reviveMatches = 1 })

  it('retryFloorAt 이전의 실패는 진짜 실패 수에서 빠지고, 이후 실패만 센다', () => {
    const section = { attempts: [failed('검수', '2026-09-18T09:00:00Z'), failed('검수', '2026-09-18T11:00:00Z')], retryFloorAt: '2026-09-18T10:00:00Z' }
    assert.equal(queue.countGenuineFailures(section), 1)
    assert.equal(queue.countGenuineFailures({ attempts: section.attempts }), 2, 'floor 가 없으면 전부 센다')
  })

  it('진단은 상한 판정과 항목별 실패 사유를 주고 원문은 싣지 않는다', async () => {
    const rec = record('r-diag', [{ status: 'complete' }, { status: 'failed', attempts: manyFailures() }])
    rec.report.sections[1].attempts![0].raw = '검수에 떨어진 긴 원문…'
    await store.saveReportRecord(rec)
    const diagnostics = await job.describeReportCompletion('r-diag')
    assert.equal(diagnostics?.verdict, 'exhausted')
    assert.deepEqual(diagnostics?.progress, { complete: 1, total: 2 })
    assert.equal(diagnostics?.sections.length, 1, '완성돼서 실패 기록도 없는 항목은 싣지 않는다')
    assert.equal(diagnostics?.sections[0].genuineFailures, job.REPORT_GIVE_UP_FAILURES)
    assert.match(diagnostics?.sections[0].lastError ?? '', /미래 사건/)
    assert.ok(!JSON.stringify(diagnostics).includes('긴 원문'), '원문이 진단에 실렸다')
    assert.equal(await job.describeReportCompletion('r-missing'), null)
  })

  it('재시작은 미완성 항목에 retryFloorAt 을 찍고, 고정된 작업을 되살리며, 판정이 exhausted 에서 풀린다', async () => {
    // 남은 두 항목이 모두 상한까지 실패해 있어야 exhausted 다(하나라도 여유가 있으면 자동 백필이 산다).
    const rec = record('r-restart', [{ status: 'complete' }, { status: 'failed', attempts: manyFailures() }, { status: 'failed', attempts: manyFailures() }])
    await store.saveReportRecord(rec)
    assert.equal(job.classifyRun((await store.getReportRecordAsService('r-restart'))!, 0), 'exhausted')

    const outcome = await job.restartReportCompletion('r-restart')
    assert.equal(outcome.reopenedSections, 2)
    assert.equal(outcome.forgivenFailures, job.REPORT_GIVE_UP_FAILURES * 2)
    assert.equal(outcome.revivedJobs, 1)
    assert.equal(outcome.enqueue, 'skipped')

    const after = (await store.getReportRecordAsService('r-restart'))!
    assert.ok(after.report.sections[1].retryFloorAt, 'retryFloorAt 이 찍혀야 한다')
    assert.equal(after.report.sections[1].attempts?.length, job.REPORT_GIVE_UP_FAILURES, '시도 기록은 지우지 않는다')
    assert.equal(after.report.sections[0].retryFloorAt, undefined, '완성 항목은 건드리지 않는다')
    assert.equal(job.classifyRun(after, 0), null, '상한이 다시 열려야 한다')

    const revive = calls.find((call) => call.init?.method === 'PATCH' && call.url.pathname.endsWith('/ops_jobs'))
    assert.ok(revive, '되살리기 PATCH 가 나가야 한다')
    assert.equal(revive?.url.searchParams.get('state'), 'in.(dead,succeeded)')
    // 대상(target_id)이 아니라 정식 멱등키로 건다 — 옛 쌍둥이 수십 건이 함께 살아나면 안 된다.
    assert.equal(revive?.url.searchParams.get('idempotency_key'), 'eq.report.sections.complete:r-restart')
    assert.equal(revive?.url.searchParams.get('target_id'), null)
    const body = JSON.parse(String(revive?.init?.body)) as Record<string, unknown>
    assert.equal(body.state, 'queued')
    assert.equal(body.last_error, null, 'REPORT_EXHAUSTED 를 비워야 다음 백필이 다시 돈다')
    assert.equal(body.attempts, 0)
  })

  it('되살릴 작업이 없으면 새 작업을 넣는다', async () => {
    reviveMatches = 0
    await store.saveReportRecord(record('r-fresh', [{ status: 'failed', attempts: manyFailures() }]))
    const outcome = await job.restartReportCompletion('r-fresh')
    assert.equal(outcome.revivedJobs, 0)
    assert.equal(outcome.enqueue, 'queued')
    assert.ok(calls.some((call) => call.init?.method === 'POST' && call.url.pathname.endsWith('/ops_jobs')))
  })

  it('완료된 리포트와 없는 리포트는 재시작하지 않는다', async () => {
    await store.saveReportRecord(record('r-done', [{ status: 'complete' }], 'complete'))
    await assert.rejects(job.restartReportCompletion('r-done'), /REPORT_ALREADY_COMPLETE/)
    await assert.rejects(job.restartReportCompletion('r-nope'), /REPORT_NOT_FOUND/)
  })
})

describe('진단·재시작 라우트', () => {
  const source = readFileSync(join(ROOT, 'src/server/app.ts'), 'utf8')
  const diagnosticsRoute = source.slice(source.indexOf("app.get('/api/admin/v1/reports/:id/diagnostics'"), source.indexOf("app.post('/api/admin/v1/reports/:id/restart'"))
  const restartRoute = source.slice(source.indexOf("app.post('/api/admin/v1/reports/:id/restart'"), source.indexOf("app.post('/api/admin/v1/reports/requeue-incomplete'"))

  it('진단은 reports:read 로 읽기만 하고, 재시작은 reports:write 로 감사 명령을 거친다', () => {
    assert.match(diagnosticsRoute, /requireStaff\(req, res, 'reports:read'\)/)
    assert.doesNotMatch(diagnosticsRoute, /executeAdminCommand\(/)
    assert.match(restartRoute, /requireStaff\(req, res, 'reports:write'\)/)
    assert.match(restartRoute, /executeAdminCommand\(/)
    assert.match(restartRoute, /adminCommandKey\(req\)/)
    assert.match(restartRoute, /'report\.generation\.restart'/)
  })
})
