import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ReportOwner, ReportRecord } from '../../src/report/report-store.js'
import type { SajuAnalysis, SajuReportSection } from '../../src/types/index.js'

/**
 * 목록용 경량 뷰(cheongi_report_list).
 *
 * 보관함 목록은 소유자의 리포트 100건을 본문째로 읽어 2.7~4초가 걸렸다(2026-09-17 운영 실측).
 * 뷰는 섹션 본문을 뺀 메타만 돌려주고, 뷰가 없으면(마이그레이션 전) 표로 되돌아간다.
 *
 * 이 파일은 자기 프로세스에서 돈다. 저장 모듈을 동적으로 불러오기 전에 환경을 고정해
 * dotenv 나 pg 가 실제 프로젝트를 고르지 못하게 한다. 네트워크는 전부 가짜 fetch 다.
 */
const testEnv = {
  NODE_ENV: 'test',
  SUPABASE_URL: 'https://report-list-view-test.invalid',
  SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_mock_server_key',
} as const
const oldEnv = new Map<string, string | undefined>(
  Object.keys(testEnv).concat('DATABASE_URL', 'REPORT_STORAGE_DIR', 'VERCEL').map((key) => [key, process.env[key]]),
)
Object.assign(process.env, testEnv)
delete process.env.DATABASE_URL
delete process.env.REPORT_STORAGE_DIR
delete process.env.VERCEL

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const owner: ReportOwner = { id: 'owner-a', email: 'a@example.invalid', provider: 'mock' }
const HEAVY_KEYS = ['interpretation', 'storytelling', 'attempts', 'generationLease', 'tokenUsage', 'patternKeys', 'ragTopics', 'imageSrc'] as const

function section(id: string, status: SajuReportSection['status']): SajuReportSection {
  return {
    id, order: 1, imageKey: 'k', imageSrc: 'data:image/png;base64,' + 'A'.repeat(500), imageAlt: '',
    category: `분류 ${id}`, categoryEn: id, classification: 'c', hook: '한 줄',
    patternKeys: ['p'], ragTopics: ['t'],
    interpretation: status === 'complete' ? '해석 본문 '.repeat(400) : '',
    attempts: [{ id: 'a1', startedAt: '2026-09-17T00:00:00Z', model: 'gpt-5.5', status: 'complete', raw: 'x'.repeat(3000) }],
    status,
  }
}

function fullRecord(reportId: string, done: number, total: number): ReportRecord {
  const sections = Array.from({ length: total }, (_, i) => section(`s${i + 1}`, i < done ? 'complete' : 'pending'))
  return {
    reportId, birth: { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' },
    context: { serviceKey: 'work_job', name: '경량 뷰', concern: '고민' },
    owner, lineageId: `lineage-${reportId}`,
    analysis: { pillars: { day: '甲子' } } as unknown as SajuAnalysis,
    preview: { title: 't', headline: 'h', summary: 's', insights: [], signals: [], paidValue: 'p' } as unknown as ReportRecord['preview'],
    report: { title: '제목', subtitle: '부제', model: 'gpt-5.5', generatedBy: 'openai', sections },
    status: done >= total ? 'complete' : 'generating',
    createdAt: '2026-09-17T00:00:00Z', updatedAt: `2026-09-17T00:0${reportId.length % 10}:00Z`,
    chatHistory: [{ role: 'user', content: '질문' } as never],
  }
}

const table = [fullRecord('r1', 39, 41), fullRecord('r2', 21, 21), fullRecord('r3', 0, 12)]
let viewAvailable = true
const calls: string[] = []
const omit = <T extends object>(value: T, keys: readonly string[]): Partial<T> =>
  Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key))) as Partial<T>

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  assert.equal(url.origin, testEnv.SUPABASE_URL, 'A real network URL must never be reached')
  assert.equal(new Headers(init?.headers).get('apikey'), testEnv.SUPABASE_SERVICE_ROLE_KEY)
  calls.push(url.pathname)
  if (url.pathname === '/rest/v1/cheongi_report_list') {
    if (!viewAvailable) return Response.json({ code: 'PGRST205', message: 'mock missing relation' }, { status: 404 })
    if (url.searchParams.get('limit') === '0') return Response.json([])
    assert.equal(url.searchParams.get('user_id'), `eq.${owner.id}`)
    const select = url.searchParams.get('select') ?? ''
    // 뷰가 하는 일을 그대로 흉내 낸다: 본문 키를 뺀 meta·report, 요청했을 때만 analysis.
    return Response.json(table.map((record) => ({
      meta: omit(record, ['report', 'analysis', 'chatHistory', 'flags']),
      report: { ...record.report, sections: record.report.sections.map((item) => omit(item, HEAVY_KEYS)) },
      ...(select.includes('analysis') ? { analysis: record.analysis ?? null } : {}),
      user_id: owner.id, created_at: record.createdAt, updated_at: record.updatedAt,
    })))
  }
  assert.equal(url.pathname, '/rest/v1/cheongi_reports')
  if (url.searchParams.get('limit') === '0') return Response.json([])
  return Response.json(table.map((record) => ({ payload: record, user_id: owner.id, created_at: record.createdAt, updated_at: record.updatedAt })))
}) as typeof globalThis.fetch

const store = await import('../../src/report/report-store.js')

after(() => {
  for (const [key, value] of oldEnv) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('보관함 목록용 경량 뷰 (가짜 fetch, DB·네트워크 없음)', { concurrency: false }, () => {
  it('경량 행은 본문 없이 진행률·상태·맥락을 그대로 돌려준다', async () => {
    assert.equal(store.getReportStorageMode(), 'supabase')
    // 아직 목록을 한 번도 읽지 않았으면 뷰 상태를 모른다. 준비 상태 프로브에 요청을 더하지 않는다.
    assert.equal(store.reportListViewState(), 'unknown')
    calls.length = 0
    const rows = await store.listReportRecords(owner, 100, { light: true })
    assert.equal(store.reportListViewState(), 'ready', 'health 가 보고할 뷰 상태')
    assert.equal(rows.length, 3)
    assert.deepEqual(calls, ['/rest/v1/cheongi_report_list'], '뷰만 읽어야 한다 — 표를 함께 읽으면 느린 이유가 그대로다')
    for (const [index, row] of rows.entries()) {
      const full = table[index]
      assert.equal(row.reportId, full.reportId)
      assert.equal(row.lineageId, full.lineageId)
      assert.deepEqual(row.context, full.context)
      assert.equal(row.owner?.id, owner.id)
      assert.equal(row.analysis, undefined, '요청하지 않은 analysis 가 실렸다')
      assert.equal(row.chatHistory, undefined)
      // 진행률 규칙은 본문 유무와 무관해야 한다.
      assert.deepEqual(store.reportProgressOf(row), store.reportProgressOf(full))
      for (const item of row.report.sections) {
        for (const key of HEAVY_KEYS) assert.equal(key in item, false, `경량 행 섹션에 본문 키 ${key} 가 남아 있다`)
        assert.ok(item.id && item.category && item.status, '진행률·현재 항목에 필요한 메타는 남아야 한다')
      }
    }
    // 목록 응답이 쓰는 클라이언트 리포트도 경량 행으로 만들어진다(본문은 이미 없다).
    const client = store.toClientReport(rows[0])
    assert.deepEqual(client.progress, { complete: 39, total: 41 })
  })

  it('includeAnalysis 를 켜면 사주 분석만 더 실린다', async () => {
    const rows = await store.listReportRecords(owner, 100, { light: true, includeAnalysis: true })
    assert.deepEqual(rows[0].analysis, table[0].analysis)
    assert.equal(rows[0].report.sections.some((item) => 'interpretation' in item), false)
  })

  it('뷰가 없으면(마이그레이션 전) 표로 되돌아가고, 잠시 뷰를 다시 찌르지 않는다', async () => {
    viewAvailable = false
    calls.length = 0
    const rows = await store.listReportRecords(owner, 100, { light: true })
    assert.equal(rows.length, 3)
    assert.deepEqual(calls, ['/rest/v1/cheongi_report_list', '/rest/v1/cheongi_reports'])
    assert.equal(store.reportListViewState(), 'missing', 'health 가 마이그레이션이 안 됐음을 드러내야 한다')
    assert.equal(rows[0].report.sections[0].interpretation.length > 0, true, '표로 되돌아가면 예전처럼 본문이 실린다')

    calls.length = 0
    await store.listReportRecords(owner, 100, { light: true })
    assert.deepEqual(calls, ['/rest/v1/cheongi_reports'], '404 를 한 번 받았으면 잠시 표로 바로 간다')
    viewAvailable = true
  })

  it('워커는 소유자 없이도 서버 키로 리포트를 읽고, 레코드의 소유자를 돌려받는다', async () => {
    // 소유자 검증 조회는 Supabase 모드에서 소유자가 없으면 거부한다 — 워커가 그 경로를 쓰면 첫 줄에서 죽는다.
    await assert.rejects(store.getReportRecord('r1'), /REPORT_ACCESS_DENIED/)
    const record = await store.getReportRecordAsService('r1')
    assert.equal(record?.reportId, 'r1')
    assert.equal(record?.owner?.id, owner.id, '이후 생성·저장 검증에 쓸 소유자가 실려야 한다')
    assert.equal(record?.report.sections[0].interpretation.length > 0, true, '본문을 만드는 경로라 본문째로 읽는다')
    // 이상한 ID 는 조회조차 하지 않는다.
    assert.equal(await store.getReportRecordAsService('bad id!'), null)
    // 완성 작업은 이 경로로만 읽는다.
    const job = readFileSync(join(root, 'src/report/report-completion-job.ts'), 'utf8')
    assert.doesNotMatch(job, /findReportRecord\(/)
    assert.match(job, /getReportRecordAsService\(reportId\)/)
  })

  it('옵션이 없으면 예전처럼 표를 읽는다 — 본문을 쓰는 곳은 바뀌지 않는다', async () => {
    calls.length = 0
    const rows = await store.listReportRecords(owner, 100)
    assert.equal(rows.length, 3)
    assert.equal(calls.includes('/rest/v1/cheongi_report_list'), false)
  })

  it('마이그레이션은 서버 전용 뷰를 만들고 본문 키를 뺀다', () => {
    const sql = readFileSync(join(root, 'supabase/migrations/20260917150000_cheongi_report_list_view.sql'), 'utf8')
    assert.match(sql, /create or replace view public\.cheongi_report_list/)
    assert.match(sql, /security_invoker = true/)
    assert.match(sql, /revoke all on public\.cheongi_report_list from public, anon, authenticated/)
    assert.match(sql, /grant select on public\.cheongi_report_list to service_role/)
    for (const key of HEAVY_KEYS) assert.ok(sql.includes(`'${key}'`), `뷰가 본문 키 ${key} 를 빼지 않는다`)
    // 저장 모듈이 같은 이름을 부른다.
    const storeSource = readFileSync(join(root, 'src/report/report-store.ts'), 'utf8')
    assert.match(storeSource, /\/rest\/v1\/cheongi_report_list/)
  })

  it('보관함·운명 목록·결제 계보 조회는 경량 행을 읽는다', () => {
    const app = readFileSync(join(root, 'src/server/app.ts'), 'utf8')
    assert.match(app, /listReportRecords\(owner, 100, \{ light: true, includeAnalysis: !slim \}\)/)
    assert.match(app, /listReportRecords\(owner, parseListLimit\(req\.query\.limit, 8\), \{ light: true, includeAnalysis: true \}\)/)
    assert.match(app, /listReportRecords\(owner, 100, \{ light: true \}\)\.catch/)
  })
})
