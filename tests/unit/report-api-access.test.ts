import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { Server } from 'node:http'
import { after, before, describe, it } from 'node:test'
import type { BirthInput, SajuReport, SajuReportSection } from '../../src/types/index.js'

// This file runs in its own node:test process. Import the application only after
// disabling dotenv and removing every provider/storage credential from this process.
const originalEnv = { ...process.env }
process.env.NODE_ENV = 'test'
for (const name of Object.keys(process.env)) {
  if (/DATABASE|SUPABASE|OPENAI|ANTHROPIC|INICIS|PAYMENT|VERCEL|REPORT_STORAGE/.test(name)) delete process.env[name]
}
const nativeFetch = globalThis.fetch
const forbiddenCalls: string[] = []
let origin = ''
globalThis.fetch = (async (input: string | URL | Request, options?: RequestInit) => {
  const target = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (!origin || target.origin !== origin) {
    forbiddenCalls.push(target.origin)
    throw new Error('This regression suite forbids external network requests')
  }
  return nativeFetch(input, options)
}) as typeof fetch

const { default: app } = await import('../../src/server/app.js')
const { analyzeSaju } = await import('../../src/saju/analyzer.js')
const store = await import('../../src/report/report-store.js')
const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
const context = { serviceKey: 'love_this_year', name: '로컬 합성 점검', concern: '특별한 문제 없이 잘 지내고 있습니다.' }
const analysis = analyzeSaju(birth)
const reading = 'SYNTHETIC_SAVED_READING_ONLY\n\n저장된 해석은 주소를 다시 열어도 그대로입니다.'
const section: SajuReportSection = {
  id: 'api-access-fixture-section', order: 1, imageKey: '', imageSrc: '', imageAlt: '',
  category: '현재 상태', categoryEn: 'Current', classification: '유지할 기준',
  hook: '안정된 상태를 유지하는 기준', patternKeys: [], ragTopics: [], interpretation: 'SYNTHETIC_PENDING_TEMPLATE',
}
const template: SajuReport = { title: '로컬 합성 해석', subtitle: '실고객 데이터가 아닙니다', generatedBy: 'template', model: 'template', sections: [section] }
let server: Server
let anonymousId: string
let resultId: string
let sectionGenerationId: string
let ownerId: string
let ownerResultId: string
let pendingId: string

async function request(path: string, body?: unknown) {
  const response = await fetch(origin + path, body === undefined ? undefined : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const text = await response.text()
  let payload: any
  try { payload = JSON.parse(text) } catch { payload = undefined }
  return { response, text, payload }
}

before(async () => {
  assert.equal(store.getReportStorageMode(), 'memory')
  server = await new Promise<Server>((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
    instance.once('error', reject)
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  origin = `http://127.0.0.1:${address.port}`
  assert.equal((await request('/api/auth/config')).payload.enabled, false)
  anonymousId = `api-access-${randomUUID()}`
  const anonymous = await store.createOrGetReportRecord({ reportId: anonymousId, birth, context, analysis, templateReport: template })
  resultId = anonymous.record.resultId!
  sectionGenerationId = anonymous.record.report.sections[0].generationId!
  await store.updateReportSection(anonymousId, { ...section, interpretation: reading }, { generatedBy: 'openai', model: 'local-fixture', status: 'complete' })
  ownerId = `api-owner-${randomUUID()}`
  const owned = await store.createOrGetReportRecord({ reportId: ownerId, birth, context, analysis, templateReport: template, owner: { id: 'synthetic-owner-only' } })
  ownerResultId = owned.record.resultId!
  pendingId = `api-pending-${randomUUID()}`
  await store.createOrGetReportRecord({ reportId: pendingId, birth, context, analysis, templateReport: template })
})

after(async () => {
  if (server) {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
  globalThis.fetch = nativeFetch
  for (const name of Object.keys(process.env)) if (!(name in originalEnv)) delete process.env[name]
  Object.assign(process.env, originalEnv)
  assert.deepEqual(forbiddenCalls, [], 'No external provider, database or payment request is allowed')
})

describe('saved report HTTP boundaries (local fixtures only)', { concurrency: false }, () => {
  it('makes storage readiness opt-in and returns uncached 503 for a non-durable memory store', async () => {
    const before = await store.getReportRecord(anonymousId)
    const health = await request('/api/health')
    assert.equal(health.response.status, 200)
    assert.equal(health.payload.ok, true)
    assert.equal(Object.hasOwn(health.payload, 'reportStorage'), false)
    assert.match(health.response.headers.get('cache-control') || '', /(?:^|,\s*)no-store(?:,|$)/)

    const readiness = await request('/api/health?storage=1')
    assert.equal(readiness.response.status, 503)
    assert.equal(readiness.payload.ok, false)
    assert.deepEqual(readiness.payload.reportStorage, {
      mode: 'memory', ok: false, durable: false, keyKind: 'none', errorCode: 'REPORT_STORAGE_NOT_DURABLE',
    })
    assert.match(readiness.response.headers.get('cache-control') || '', /(?:^|,\s*)no-store(?:,|$)/)
    assert.deepEqual(await store.getReportRecord(anonymousId), before)
    assert.deepEqual(forbiddenCalls, [], 'Readiness must not contact an external service in memory mode')
  })

  it('returns exactly the saved result through legacy ID, UUID and plural alias', async () => {
    const before = await store.getReportRecord(anonymousId)
    for (const path of [`/api/report/${anonymousId}`, `/api/report/${resultId}`, `/api/reports/${resultId}`]) {
      const result = await request(path)
      assert.equal(result.response.status, 200)
      assert.equal(result.response.headers.get('cache-control'), 'private, no-store')
      assert.match(result.response.headers.get('vary') || '', /Authorization/i)
      assert.equal(result.payload.reportId, anonymousId)
      assert.equal(result.payload.resultId, resultId)
      assert.equal(result.payload.publicUrl, `/r/${resultId}`)
      assert.equal(result.payload.report.sections[0].interpretation, reading)
      assert.equal(result.payload.report.sections[0].generationId, sectionGenerationId)
      assert.equal(result.payload.report.sections[0].attempts, undefined)
    }
    assert.deepEqual(await store.getReportRecord(anonymousId), before)
  })

  it('serves a data-free reader shell at /r/UUID', async () => {
    const result = await request(`/r/${resultId}`)
    assert.equal(result.response.status, 200)
    assert.match(result.response.headers.get('content-type') || '', /text\/html/)
    assert.match(result.text, /umsh-report-view\.js/)
    assert.doesNotMatch(result.text, /SYNTHETIC_SAVED_READING_ONLY|SYNTHETIC_PENDING_TEMPLATE|synthetic-owner-only/)
  })

  it('fails closed in production when authentication settings are missing', async () => {
    const previous = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      assert.equal((await request('/api/auth/config')).payload.developmentReportAccess, false)
      assert.equal((await request(`/api/report/${resultId}`)).response.status, 401)
      assert.equal((await request('/api/report/section', { reportId: resultId, sectionId: section.id })).response.status, 401)
    } finally { process.env.NODE_ENV = previous }
  })

  it('does not generate or mutate pending reports on GET', async () => {
    const before = await store.getReportRecord(pendingId)
    const result = await request(`/api/report/${pendingId}`)
    assert.equal(result.response.status, 200)
    assert.equal(result.payload.report.status, 'pending')
    assert.deepEqual(await store.getReportRecord(pendingId), before)
  })

  it('returns 404 for unknown report IDs and 400 when section lookup has no report ID', async () => {
    assert.equal((await request(`/api/report/missing-${randomUUID()}`)).response.status, 404)
    assert.equal((await request(`/api/reports/missing-${randomUUID()}`)).response.status, 404)
    assert.equal((await request('/api/report/section', { sectionId: section.id })).response.status, 400)
    assert.equal((await request('/api/report/section', { reportId: anonymousId })).response.status, 400)
  })

  it('rejects an owned report even when authentication is disabled for this development test', async () => {
    for (const path of [`/api/report/${ownerId}`, `/api/report/${ownerResultId}`, `/api/reports/${ownerResultId}`]) {
      const result = await request(path)
      assert.equal(result.response.status, 403)
      assert.doesNotMatch(result.text, /SYNTHETIC_PENDING_TEMPLATE|synthetic-owner-only/)
    }
    assert.equal((await request('/api/report/section', { reportId: ownerResultId, sectionId: section.id })).response.status, 403)
  })

  it('completed section POSTs reuse saved content and ignore conflicting fresh input', async () => {
    const before = await store.getReportRecord(anonymousId)
    for (const [id, item] of [[anonymousId, section.id], [resultId, section.id], [resultId, sectionGenerationId]]) {
      const result = await request('/api/report/section', {
        reportId: id, sectionId: item, retry: true,
        birth: { year: -999, gender: 'incorrect' }, context: { serviceKey: 'unrelated-service' }, interpretation: 'ATTEMPTED_OVERWRITE',
      })
      assert.equal(result.response.status, 200)
      assert.equal(result.payload.resultId, resultId)
      assert.equal(result.payload.section.interpretation, reading)
      assert.equal(result.payload.section.generationId, sectionGenerationId)
    }
    assert.deepEqual(await store.getReportRecord(anonymousId), before)
  })

  it('unknown section identifiers fail without changing the stored result', async () => {
    const before = await store.getReportRecord(anonymousId)
    assert.equal((await request('/api/report/section', { reportId: resultId, sectionId: 'unknown-section' })).response.status, 404)
    assert.deepEqual(await store.getReportRecord(anonymousId), before)
  })

  it('report-list source strips paid sections and retains a checked-result locator', () => {
    const source = readFileSync(new URL('../../src/server/app.ts', import.meta.url), 'utf8')
    const helper = source.split('function historyEntryFromRecord(record: ReportRecord) {')[1]?.split('/** Names the pieces')[0]
    assert.ok(helper, 'history metadata serializer must remain discoverable for this source guard')
    assert.match(helper, /analysis\.report\.sections\s*=\s*\[\]/)
    assert.ok(helper.indexOf('analysis.report.sections = []') < helper.indexOf('return {'))
    assert.match(helper, /resultId:\s*analysis\.report\.resultId/)
    assert.match(helper, /publicUrl:\s*analysis\.report\.publicUrl/)
    assert.doesNotMatch(helper, /sections:\s*record\.report\.sections/)
  })
})
