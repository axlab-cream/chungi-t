import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

/**
 * 2026-09-19: 8/31~9/14 에 만들어졌지만 그때는 context.serviceKey 를 남기지 않던 옛
 * 리포트가 23건 있었다("기록 없음"). 항목 구성이 cmdg(종합사주) 전용 명리 용어와 겹칠
 * 때만, 그리고 값이 정말 비어 있을 때만 채운다. 지키는 것:
 *   1. 이미 값이 있으면 절대 덮어쓰지 않는다.
 *   2. 지문이 부족하게 겹치면(다른 서비스일 가능성) 손대지 않는다 — 지어내지 않는다.
 *   3. DB 쪽도 `payload->context->>serviceKey=is.null` 조건을 걸어 동시 쓰기를 막는다.
 *   4. context 의 다른 필드는 원본 그대로 보존한다(타입을 거친 재구성이 아니라 원본에 병합).
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://report-backfill.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_synthetic_backfill'

type Row = { report_id: string; payload: Record<string, unknown> }
const rows = new Map<string, Row>()
const calls: Array<{ method: string; url: URL; body?: unknown }> = []

const nativeFetch = globalThis.fetch
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const method = init?.method ?? 'GET'
  const body = init?.body ? JSON.parse(String(init.body)) : undefined
  calls.push({ method, url, body })
  if (url.pathname !== '/rest/v1/cheongi_reports') throw new Error(`Unexpected path: ${url.pathname}`)

  const reportId = url.searchParams.get('report_id')?.replace(/^eq\./, '')
  if (method === 'GET') {
    const row = reportId ? rows.get(reportId) : undefined
    return new Response(JSON.stringify(row ? [{ payload: row.payload }] : []), { headers: { 'content-type': 'application/json' } })
  }
  if (method === 'PATCH') {
    const row = reportId ? rows.get(reportId) : undefined
    const conditionKey = 'payload->context->>serviceKey'
    const requiresNull = url.searchParams.get(conditionKey) === 'is.null'
    const currentServiceKey = (row?.payload.context as Record<string, unknown> | undefined)?.serviceKey
    if (!row || (requiresNull && typeof currentServiceKey === 'string' && currentServiceKey)) {
      return new Response('[]', { headers: { 'content-type': 'application/json' } })
    }
    row.payload = body.payload
    return new Response(JSON.stringify([{ payload: row.payload }]), { headers: { 'content-type': 'application/json' } })
  }
  throw new Error(`Unexpected method: ${method}`)
}) as typeof fetch

// report-store 는 첫 import 시 SUPABASE_URL 을 한 번만 읽어 저장 모드를 굳힌다. 이미 위에서
// 켜 두었으니 이 import 는 'supabase' 모드로 고정된다(localFiles 는 만들어지지 않는다).
const store = await import('../../src/report/report-store.js')
const repair = await import('../../src/report/report-data-repair.js')

function seed(reportId: string, sections: Array<{ id: string }>, context: Record<string, unknown> = {}): void {
  rows.set(reportId, {
    report_id: reportId,
    payload: {
      reportId, status: 'complete', birth: { year: 1990, month: 1, day: 1, hour: 12, minute: 0, gender: 'female', calendar: 'solar' },
      context, report: { title: '테스트', subtitle: '', model: 'test', generatedBy: 'template', status: 'complete', sections: sections.map((s, i) => ({ ...s, order: i + 1, imageKey: '', imageSrc: '', imageAlt: '', category: '', categoryEn: '', classification: '', hook: '', patternKeys: [], ragTopics: [], interpretation: '본문', status: 'complete' })) },
    },
  })
}

after(() => {
  globalThis.fetch = nativeFetch
  for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]
  Object.assign(process.env, previousEnv)
})

const CMDG_LIKE_SECTIONS = [
  { id: 'profile' }, { id: 'pillars-structure' }, { id: 'day-master-strength' },
  { id: 'ten-gods-overview' }, { id: 'ten-gods-position' }, { id: 'useful-god-johu' },
  { id: 'daewoon-detail' }, { id: 'sewoon-detail' },
]

describe('cmdg 지문 백필 — 값이 없고 항목이 겹칠 때만 채운다', { concurrency: false }, () => {
  before(() => { rows.clear(); calls.length = 0 })

  it('지문이 충분히 겹치고 값이 비어 있으면 cmdg 로 채운다', async () => {
    seed('r-match', CMDG_LIKE_SECTIONS, { name: '홍길동', birthTimeKnown: true })
    const result = await repair.backfillCmdgServiceKeyIfMatching('r-match')
    assert.equal(result.outcome, 'filled')
    assert.ok((result.matchedSectionIds?.length ?? 0) >= 3)
    const after = rows.get('r-match')!.payload.context as Record<string, unknown>
    assert.equal(after.serviceKey, 'cmdg')
    assert.equal(after.name, '홍길동', '다른 context 필드는 그대로 보존해야 한다')
  })

  it('이미 serviceKey 가 있으면 절대 덮어쓰지 않는다', async () => {
    seed('r-has-key', CMDG_LIKE_SECTIONS, { serviceKey: 'money_save' })
    const result = await repair.backfillCmdgServiceKeyIfMatching('r-has-key')
    assert.equal(result.outcome, 'already_set')
    assert.equal((rows.get('r-has-key')!.payload.context as Record<string, unknown>).serviceKey, 'money_save')
  })

  it('지문이 부족하게 겹치면(다른 서비스일 가능성) 손대지 않는다', async () => {
    seed('r-other-service', [{ id: 'money-habit' }, { id: 'spending-pattern' }])
    const result = await repair.backfillCmdgServiceKeyIfMatching('r-other-service')
    assert.equal(result.outcome, 'fingerprint_mismatch')
    assert.equal((rows.get('r-other-service')!.payload.context as Record<string, unknown>).serviceKey, undefined)
  })

  it('없는 리포트는 not_found', async () => {
    assert.equal((await repair.backfillCmdgServiceKeyIfMatching('r-missing')).outcome, 'not_found')
  })

  it('DB 조건(payload->context->>serviceKey=is.null)이 실제로 걸린다 — 동시 쓰기 안전망', async () => {
    seed('r-write-check', CMDG_LIKE_SECTIONS)
    await repair.backfillCmdgServiceKeyIfMatching('r-write-check')
    const patchCall = calls.find((call) => call.method === 'PATCH' && call.url.searchParams.get('report_id') === 'eq.r-write-check')
    assert.equal(patchCall?.url.searchParams.get('payload->context->>serviceKey'), 'is.null')
  })

  it('잘못된 입력은 스토어 함수 단에서 거절한다', async () => {
    await assert.rejects(store.backfillMissingReportServiceKey('bad id!', 'cmdg'), /BACKFILL_INPUT_INVALID/)
    await assert.rejects(store.backfillMissingReportServiceKey('r-ok', 'Not_Lower'), /BACKFILL_INPUT_INVALID/)
  })
})

describe('백필 라우트는 reports:write 로 감사 명령을 거친다', () => {
  const source = readFileSync(join(ROOT, 'src/server/app.ts'), 'utf8')
  const route = source.slice(source.indexOf("app.post('/api/admin/v1/reports/:id/backfill-service-key'"), source.indexOf("app.post('/api/admin/v1/reports/requeue-incomplete'"))

  it('reports:write 를 요구하고 감사 명령·멱등 키를 거친다', () => {
    assert.match(route, /requireStaff\(req, res, 'reports:write'\)/)
    assert.match(route, /executeAdminCommand\(/)
    assert.match(route, /adminCommandKey\(req\)/)
    assert.match(route, /'report\.context\.backfill_service_key'/)
  })
})
