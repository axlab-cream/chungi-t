import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import type { Server } from 'node:http'
import { after, before, describe, it } from 'node:test'
import OpenAI from 'openai'
import type { BirthInput, SajuReport } from '../../src/types/index.js'

// Node's default per-file process isolation keeps these mocks out of other suites.
// Only a local HTTP listener is contacted; auth is a synthetic fetch response,
// report snapshots go to a uniquely allocated temp directory, and orders to memory.
const originalEnv = { ...process.env }
for (const name of Object.keys(process.env)) {
  if (/DATABASE|SUPABASE|OPENAI|ANTHROPIC|INICIS|PAYMENT|VERCEL|REPORT_STORAGE|ADMIN/.test(name)) delete process.env[name]
}
const storageDirectory = mkdtempSync(join(tmpdir(), 'umsh-api-chat-'))
const fakeAuthOrigin = 'https://chat-auth-test.invalid'
Object.assign(process.env, {
  NODE_ENV: 'test',
  SUPABASE_URL: fakeAuthOrigin,
  SUPABASE_PUBLISHABLE_KEY: 'mock-publishable-api-chat',
  OPENAI_API_KEY: 'mock-api-chat-key-no-network',
  OPENAI_MODEL: 'mock-api-chat-model',
  PAYMENT_TEST_MODE: 'true',
  REPORT_STORAGE_DIR: storageDirectory,
})
const nativeFetch = globalThis.fetch
const sdkCreate = OpenAI.Chat.Completions.prototype.create
const forbiddenCalls: string[] = []
let origin = ''
let modelCalls = 0
const owner = { id: 'api-chat-owner-a', email: 'api-a@example.invalid', provider: 'mock', accessToken: 'mock-api-token-a' }
const otherOwner = { id: 'api-chat-owner-b', email: 'api-b@example.invalid', provider: 'mock', accessToken: 'mock-api-token-b' }
const modelReply = '상담 원문 저장 확인용 답변입니다. 지금 알려 주신 내용에서 문제가 확인되지 않았다면 기존 방식을 유지해도 됩니다.\n\n최근 편했던 장면에서 어떤 조건이 도움이 되었는지 적어 보세요. 실제 상황이 바뀌면 그 조건과 비교하여 다음 선택을 정리할 수 있습니다.'

globalThis.fetch = (async (input: string | URL | Request, options?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (origin && url.origin === origin) return nativeFetch(input, options)
  if (url.origin === fakeAuthOrigin && url.pathname === '/auth/v1/user' && (!options?.method || options.method === 'GET')) {
    const headers = new Headers(options?.headers)
    assert.equal(headers.get('apikey'), 'mock-publishable-api-chat')
    const selected = headers.get('authorization') === `Bearer ${owner.accessToken}` ? owner : headers.get('authorization') === `Bearer ${otherOwner.accessToken}` ? otherOwner : undefined
    return new Response(JSON.stringify(selected ? { id: selected.id, email: selected.email, app_metadata: { provider: selected.provider } } : { message: 'invalid mock token' }), { status: selected ? 200 : 401, headers: { 'content-type': 'application/json' } })
  }
  forbiddenCalls.push(url.origin + url.pathname)
  throw new Error('This suite forbids external auth, provider, database and payment calls')
}) as typeof fetch

OpenAI.Chat.Completions.prototype.create = (async (request: { messages: Array<{ role: string; content: string }> }) => {
  modelCalls += 1
  assert.ok(modelCalls <= 2, 'The entire HTTP suite may make at most two mocked model calls')
  assert.equal(request.messages.at(-1)?.role, 'user')
  // The report generator uses JSON responses; a chat route must request natural dialogue.
  assert.ok(request.messages.some((message) => message.content.includes('저장된 문진')))
  return { model: 'mock-api-returned-model', choices: [{ message: { content: modelReply }, finish_reason: 'stop' }], usage: { prompt_tokens: 17, completion_tokens: 29, total_tokens: 46 } }
}) as unknown as typeof sdkCreate

const { default: app } = await import('../../src/server/app.js')
const store = await import('../../src/report/report-store.js')
const orders = await import('../../src/payment/order-store.js')
const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
const standaloneRequestId = randomUUID()
const parentRequestId = randomUUID()
const body = { requestId: standaloneRequestId, birth, serviceKey: 'work_job', message: '현재 업무가 만족스러워요. 잘 유지할 기준을 알려 주세요.' }
let server: Server
let standaloneResultId = ''
let standaloneReportId = ''
let parentReportId = ''
let parentResultId = ''
let childResultId = ''
let childReportId = ''
let paymentOrderId = ''

async function request(path: string, value?: unknown, token: string | null = owner.accessToken, method = value === undefined ? 'GET' : 'POST') {
  const headers: Record<string, string> = {}
  if (token) headers.authorization = `Bearer ${token}`
  if (value !== undefined) headers['content-type'] = 'application/json'
  const response = await fetch(origin + path, { method, headers, ...(value === undefined ? {} : { body: JSON.stringify(value) }) })
  const text = await response.text()
  const payload = JSON.parse(text) as any
  return { response, text, payload }
}

function assertNoInternalData(result: Awaited<ReturnType<typeof request>>) {
  assert.equal(result.payload.context?.savedChat, undefined)
  for (const section of result.payload.report?.sections ?? []) {
    assert.equal(section.attempts, undefined)
    assert.equal(section.generationLease, undefined)
  }
  assert.doesNotMatch(result.text, /"savedChat"|"attempts"|"raw"|"messages"|mock-api-chat-key-no-network|mock-api-token-a/)
}

before(async () => {
  assert.equal(store.getReportStorageMode(), 'file')
  assert.equal(orders.getPaymentStorageMode(), 'memory')
  server = await new Promise<Server>((resolveServer, reject) => {
    const instance = app.listen(0, '127.0.0.1', () => resolveServer(instance))
    instance.once('error', reject)
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  origin = `http://127.0.0.1:${address.port}`
  assert.equal((await request('/api/auth/config')).payload.enabled, true)
  const template: SajuReport = { title: '합성 부모 해석', subtitle: '', generatedBy: 'template', model: 'template', sections: [{ id: 'parent-work', order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '업무', categoryEn: 'Work', classification: '확인한 업무 조건', hook: '현재의 만족을 유지할 기준', patternKeys: [], ragTopics: [], interpretation: 'SYNTHETIC_PARENT_PREVIEW: 현재 만족한 업무의 조건을 먼저 확인합니다.' }] }
  const parent = await store.createOrGetReportRecord({ reportId: randomUUID(), birth, context: { serviceKey: 'work_job', birthTimeKnown: false }, templateReport: template, owner })
  parentReportId = parent.record.reportId
  parentResultId = parent.record.resultId!
  await store.updateReportSection(parentReportId, { ...template.sections[0], interpretation: 'SYNTHETIC_PARENT_PAID_TEXT: 이미 확인한 업무 기준을 유지합니다.' }, { generatedBy: 'openai', model: 'fixture-only' }, owner)
})

after(async () => {
  if (server) {
    server.closeAllConnections()
    await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()))
  }
  globalThis.fetch = nativeFetch
  OpenAI.Chat.Completions.prototype.create = sdkCreate
  for (const name of Object.keys(process.env)) if (!(name in originalEnv)) delete process.env[name]
  Object.assign(process.env, originalEnv)
  // Only remove the known, generated temp child, never a broad directory.
  assert.equal(dirname(resolve(storageDirectory)), resolve(tmpdir()))
  assert.match(basename(storageDirectory), /^umsh-api-chat-/)
  await rm(storageDirectory, { recursive: true, force: true })
  assert.deepEqual(forbiddenCalls, [])
  assert.ok(modelCalls <= 2)
})

describe('saved chat HTTP auth, persistence, parent entitlement and retry routes', { concurrency: false }, () => {
  it('requires a verified login before chat creation', async () => {
    assert.equal((await request('/api/chat', body, null)).response.status, 401)
    assert.equal((await request('/api/chat', body, 'invalid-mock-token')).response.status, 401)
    assert.equal(modelCalls, 0)
  })

  it('creates once for a repeated authenticated request ID and exposes only its public result', async () => {
    const [first, second] = await Promise.all([request('/api/chat', body), request('/api/chat', body)])
    assert.equal(first.response.status, 200)
    assert.equal(second.response.status, 200)
    assert.equal(first.payload.resultId, second.payload.resultId)
    assert.equal(first.payload.reply, second.payload.reply)
    assert.match(first.payload.reply, /상담 원문 저장 확인용/)
    standaloneResultId = first.payload.resultId
    standaloneReportId = first.payload.reportId
    assert.equal(modelCalls, 1)
    assertNoInternalData(first)
    assertNoInternalData(second)
    const repeated = await request('/api/chat', body)
    assert.equal(repeated.payload.resultId, standaloneResultId)
    assert.equal(modelCalls, 1)
  })

  it('reopens by legacy ID and UUID without a model call or saved prompt leakage', async () => {
    delete process.env.OPENAI_API_KEY
    const beforeRecord = await store.findReportRecord(standaloneResultId, owner)
    for (const route of [`/api/report/${standaloneReportId}`, `/api/reports/${standaloneResultId}`]) {
      const result = await request(route)
      assert.equal(result.response.status, 200)
      assert.equal(result.payload.resultId, standaloneResultId)
      assert.equal(result.payload.reply, beforeRecord?.report.sections[0].interpretation)
      assertNoInternalData(result)
    }
    const recalled = await request('/api/chat', { resultId: standaloneResultId, birth: { year: -999 }, message: 'This must not replace a saved reply.', retry: true })
    assert.equal(recalled.response.status, 200)
    assertNoInternalData(recalled)
    const byRequest = await request('/api/chat', { requestId: standaloneRequestId, birth: { year: -999 }, message: 'Ignore conflicting fresh input on request replay.' })
    assert.equal(byRequest.response.status, 200)
    assert.equal(byRequest.payload.resultId, standaloneResultId)
    assertNoInternalData(byRequest)
    assert.deepEqual(await store.findReportRecord(standaloneResultId, owner), beforeRecord)
    assert.equal(modelCalls, 1)
    process.env.OPENAI_API_KEY = 'mock-api-chat-key-no-network'
  })

  it('denies a different owner and prevents changing saved chat history', async () => {
    assert.equal((await request(`/api/report/${standaloneResultId}`, undefined, otherOwner.accessToken)).response.status, 403)
    assert.equal((await request('/api/chat', { resultId: standaloneResultId }, otherOwner.accessToken)).response.status, 403)
    const beforeRecord = await store.findReportRecord(standaloneResultId, owner)
    assert.equal((await request('/api/report/chat-history', { reportId: standaloneResultId, history: [] })).response.status, 409)
    assert.equal((await request('/api/report/section', { reportId: standaloneResultId, sectionId: 'not-a-chat-section' })).response.status, 404)
    assert.deepEqual(await store.findReportRecord(standaloneResultId, owner), beforeRecord)
    assert.equal(modelCalls, 1)
  })

  it('checks login and ownership before every saved-report read, write or generation route', async () => {
    const beforeRecord = await store.findReportRecord(parentReportId, owner)
    const beforeCalls = modelCalls
    const paths: Array<{ path: string; value?: unknown }> = [
      { path: `/api/report/${parentReportId}` },
      { path: `/api/reports/${parentResultId}` },
      { path: '/api/report/section', value: { reportId: parentResultId, sectionId: 'parent-work', retry: true } },
      { path: '/api/report/prewarm', value: { reportId: parentResultId } },
      { path: '/api/report/chat-history', value: { reportId: parentResultId, history: [{ role: 'user', content: 'ATTEMPTED_OTHER_OWNER_WRITE' }] } },
      { path: '/api/work/job/analyze', value: { resultId: parentResultId, preview: true } },
      { path: '/api/saju/analyze', value: { reportId: parentReportId } },
      { path: '/api/today/fortune', value: { reportId: parentReportId } },
      { path: '/api/chat', value: { parentReportId: parentResultId, message: 'An ID is not proof of ownership.' } },
    ]
    for (const route of paths) {
      for (const [token, expected] of [[null, 401], [otherOwner.accessToken, 403]] as const) {
        const result = await request(route.path, route.value, token)
        assert.equal(result.response.status, expected, `${route.path} must reject ${token ? 'another owner' : 'missing login'} before reading or changing a result`)
        assert.doesNotMatch(result.text, /SYNTHETIC_PARENT_PAID_TEXT|ATTEMPTED_OTHER_OWNER_WRITE|api-chat-owner-a|"birth"|"context"|"sections"/)
      }
    }
    assert.deepEqual(await store.findReportRecord(parentReportId, owner), beforeRecord)
    assert.equal(modelCalls, beforeCalls)
  })

  it('keeps an unpaid owner on the preview and scopes vault metadata to the verified owner', async () => {
    const beforeCalls = modelCalls
    const unpaid = await request(`/api/report/${parentResultId}`)
    assert.equal(unpaid.response.status, 200)
    assert.equal(unpaid.payload.previewOnly, true)
    assert.equal(unpaid.payload.report, undefined)
    assert.equal(unpaid.payload.context, undefined)
    assert.equal(unpaid.payload.birth, undefined)
    assert.doesNotMatch(unpaid.text, /SYNTHETIC_PARENT_PAID_TEXT|"attempts"|"generationLease"/)
    assert.equal((await request('/api/user/reports', undefined, null)).response.status, 401)
    const ownVault = await request('/api/user/reports')
    assert.equal(ownVault.response.status, 200)
    assert.ok(ownVault.payload.reports.length >= 2)
    assert.ok(ownVault.payload.reports.some((report: { resultId: string }) => report.resultId === parentResultId))
    assert.doesNotMatch(ownVault.text, /SYNTHETIC_PARENT_PAID_TEXT|상담 원문 저장 확인용|"savedChat"|"attempts"|"generationLease"|mock-api-token-a/)
    const otherVault = await request('/api/user/reports', undefined, otherOwner.accessToken)
    assert.equal(otherVault.response.status, 200)
    assert.deepEqual(otherVault.payload.reports, [])
    assert.equal(modelCalls, beforeCalls)
  })

  it('does not delete another owner\'s result and permits only the verified owner to delete it', async () => {
    const source = await store.findReportRecord(parentReportId, owner)
    assert.ok(source)
    const allocated = await store.createOrGetReportRecord({ reportId: randomUUID(), birth, context: source.context, templateReport: source.report, owner })
    const reportId = allocated.record.reportId
    const beforeRecord = await store.findReportRecord(reportId, owner)
    const path = `/api/user/reports/${reportId}`
    const unauthenticated = await request(path, undefined, null, 'DELETE')
    assert.equal(unauthenticated.response.status, 401)
    const other = await request(path, undefined, otherOwner.accessToken, 'DELETE')
    assert.equal(other.response.status, 200)
    assert.equal(other.payload.deleted, false)
    assert.deepEqual(await store.findReportRecord(reportId, owner), beforeRecord)
    const own = await request(path, undefined, owner.accessToken, 'DELETE')
    assert.equal(own.response.status, 200)
    assert.equal(own.payload.deleted, true)
    assert.equal(await store.findReportRecord(reportId, owner), null)
    assert.equal(modelCalls, 1)
  })

  it('requires the exact parent entitlement and routes failed chat-section retry through the chat generator', async () => {
    const childBody = { parentReportId: parentResultId, requestId: parentRequestId, message: '저장된 업무 조건을 어떻게 유지하면 좋을까요?' }
    const unpaid = await request('/api/chat', childBody)
    assert.equal(unpaid.response.status, 402)
    assert.equal(unpaid.payload.reportId, parentReportId)
    assert.equal(modelCalls, 1)
    paymentOrderId = randomUUID()
    await orders.savePaymentOrder({ orderId: paymentOrderId, ownerId: owner.id, buyerEmail: owner.email, buyerTel: '01000000000', productKey: 'work_job', productTitle: '합성 주문', amount: 9900, status: 'paid', reportId: parentReportId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    delete process.env.OPENAI_API_KEY
    const allocated = await request('/api/chat', childBody)
    assert.equal(allocated.response.status, 502)
    assert.equal(allocated.payload.reply, '')
    childResultId = allocated.payload.resultId
    childReportId = allocated.payload.reportId
    process.env.OPENAI_API_KEY = 'mock-api-chat-key-no-network'
    const pending = await store.findReportRecord(childResultId, owner)
    assert.equal(pending?.status, 'failed')
    const failedRead = await request(`/api/report/${childResultId}`)
    assert.equal(failedRead.response.status, 200, 'GET must expose the saved failure state so the reader can offer retry')
    assert.equal(failedRead.payload.status, 'failed')
    assert.equal(failedRead.payload.reply, '')
    assertNoInternalData(failedRead)
    assert.equal(modelCalls, 1)
    const retried = await request('/api/report/section', { reportId: childResultId, sectionId: pending!.report.sections[0].generationId, retry: true })
    assert.equal(retried.response.status, 200)
    assert.equal(retried.payload.resultId, childResultId)
    assert.equal(retried.payload.status, 'complete')
    assert.match(retried.payload.reply, /상담 원문 저장 확인용/)
    assertNoInternalData(retried)
    assert.equal(modelCalls, 2)
    const saved = await store.findReportRecord(childReportId, owner)
    assert.equal(saved?.context.birthTimeKnown, false)
    assert.equal(saved?.report.sections[0].attempts?.length, 2)
    const again = await request('/api/chat', childBody)
    assert.equal(again.response.status, 200)
    assert.equal(again.payload.resultId, childResultId)
    assert.equal((await request('/api/report/prewarm', { reportId: childResultId })).response.status, 200)
    assert.equal(modelCalls, 2)
  })

  it('rechecks a revoked parent entitlement for GET, result-ID and request-ID replay alike', async () => {
    await orders.updatePaymentOrder(paymentOrderId, { status: 'cancelled' })
    assert.equal((await request(`/api/report/${childResultId}`)).response.status, 402)
    assert.equal((await request('/api/chat', { resultId: childResultId })).response.status, 402)
    assert.equal((await request('/api/report/section', { reportId: childResultId, sectionId: 'chat-reply', retry: true })).response.status, 402)
    // Omitting the parent in a replay must not bypass the parent saved in the record.
    const byRequest = await request('/api/chat', { requestId: parentRequestId, birth, message: 'Reopen by request ID without sending parent metadata.' })
    assert.equal(byRequest.response.status, 402)
    assert.doesNotMatch(byRequest.text, /상담 원문 저장 확인용|SYNTHETIC_PARENT_PAID_TEXT/)
    assert.equal(modelCalls, 2)
  })
})
