import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import type { Server } from 'node:http'
import OpenAI from 'openai'
process.env.NODE_ENV = 'test'
for (const name of Object.keys(process.env)) if (/DATABASE|SUPABASE|OPENAI|ANTHROPIC|INICIS|PAYMENT|VERCEL|REPORT_STORAGE|ADMIN_EMAIL/.test(name)) delete process.env[name]
const store = await import('../../src/report/report-store.js')
await import('../../src/user/profile-store.js')
const payments = await import('../../src/payment/order-store.js')
const { analyzeSaju } = await import('../../src/saju/analyzer.js')
process.env.SUPABASE_URL = 'https://reader-auth.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'test-key'
process.env.PAYMENT_TEST_MODE = 'true'
process.env.OPENAI_API_KEY = 'test-not-real'
const realFetch = globalThis.fetch
let origin = '', generated = 0, imageCalls = 0, server: Server
const imageFixture = Buffer.from('RIFF0000WEBPsynthetic-offline-provider-fixture')
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (url.href === 'https://reader-auth.invalid/auth/v1/user') {
    const owner = new Headers(init?.headers).get('authorization')?.replace('Bearer ', '')
    return new Response(JSON.stringify({ id: owner, email: owner + '@synthetic.invalid' }), { status: owner ? 200 : 401 })
  }
  if (url.origin === origin) return realFetch(input, init)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY === 'mock-storage-key') {
    if (url.pathname === '/storage/v1/bucket/report-sketches') return Response.json({ public: false })
    if (url.href === 'https://api.openai.com/v1/images/generations') {
      const sent = JSON.parse(String(init?.body)); imageCalls++
      assert.equal(sent.model, 'gpt-image-2'); assert.equal(sent.output_format, 'webp')
      assert.doesNotMatch(sent.prompt, /reader-owner|1994|03.11/)
      return Response.json({ data: [{ b64_json: imageFixture.toString('base64') }] })
    }
    if (url.pathname.startsWith('/storage/v1/object/authenticated/')) return new Response(imageFixture, { headers: { 'Content-Type': 'image/webp' } })
    if (url.pathname.startsWith('/storage/v1/object/') && init?.method === 'POST') return Response.json({ Key: 'saved' })
  }
  throw new Error('No external requests in this test')
}) as typeof fetch
const originalCreate = OpenAI.Chat.Completions.prototype.create
OpenAI.Chat.Completions.prototype.create = (async () => {
  generated++
  await new Promise(resolve => setTimeout(resolve, 60))
  return { choices: [{ message: { content: JSON.stringify({ answer: '이 질문의 답', basis: '개인 기둥에서 읽은 이유', turn: '달라지는 조건', action: '오늘 확인할 행동', question: '다음 질문?' }) }, finish_reason: 'stop' }] }
}) as unknown as typeof originalCreate
const { default: app } = await import('../../src/server/app.js')
const id = 'cmdg-reader-synthetic', owner = { id: 'reader-owner' }
const birth = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female' as const, calendar: 'solar' as const }
const section = { id: 'destiny-partner', order: 1, category: '연애', categoryEn: 'Love', classification: '관계', imageKey: '', imageSrc: '', imageAlt: '', hook: '원래 답', interpretation: '보존할 원문', status: 'complete' as const, patternKeys: [], ragTopics: [] }
async function request(path = '', body?: unknown, token = owner.id) {
  const response = await fetch(origin + `/api/report/${id}/reader` + path, { method: body === undefined ? 'GET' : 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  return { status: response.status, data: await response.json() as any }
}
before(async () => {
  await store.saveReportRecord({ reportId: id, owner, birth, context: { serviceKey: 'saju_master' }, analysis: analyzeSaju(birth), report: { title: '합성 점검', subtitle: '', model: 'test', generatedBy: 'template', sections: [section] }, status: 'complete', createdAt: '', updatedAt: '' })
  server = app.listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  const address = server.address() as { port: number }; origin = `http://127.0.0.1:${address.port}`
})
after(async () => { globalThis.fetch = realFetch; OpenAI.Chat.Completions.prototype.create = originalCreate; server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) })
test('로그인·소유권·결제 확인 후에만 장별 답변을 생성하고 재조회한다', async () => {
  assert.equal((await request('', undefined, '')).status, 401)
  assert.ok([403,404].includes((await request('', undefined, 'someone-else')).status))
  assert.equal((await request()).status, 402)
  assert.equal(generated, 0)
  await payments.savePaymentOrder({ orderId: 'reader-paid', ownerId: owner.id, buyerEmail: 'fixture@synthetic.invalid', buyerTel: '00000000000', productKey: 'cmdg', productTitle: 'test', amount: 9900, status: 'paid', reportId: id, createdAt: '', updatedAt: '' })
  assert.equal((await request()).status, 200)
  assert.equal((await request('/question', { sectionId: section.id, question: '' })).status, 400)
  assert.equal((await request('/question', { sectionId: 'missing', question: '고민' })).status, 400)
  const body = { sectionId: section.id, question: '약속을 자주 바꾸면 어떻게 대화할까요?' }
  const results = await Promise.all([request('/question', body), request('/question', body)])
  assert.deepEqual(results.map(item => item.status).sort(), [200,409])
  assert.equal(generated, 1)
  assert.equal((await request('/question', body)).status, 200)
  assert.equal(generated, 1)
  const saved = await request()
  assert.equal(saved.data.replies[0].input, body.question)
  assert.equal(saved.data.replies[0].answer.turn, '달라지는 조건')
  assert.equal((await store.getReportRecord(id, owner))!.report.sections[0].interpretation, '보존할 원문')
  assert.equal((await request('/sketch', { presentation: 'neutral' })).status, 503)
  assert.equal((await request('/sketch')).status, 404)
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-storage-key'
  assert.equal((await request('/sketch', { presentation: 'neutral' })).status, 200)
  assert.equal((await request('/sketch', { presentation: 'neutral' })).status, 200)
  assert.equal(imageCalls, 1, '이미 저장된 스케치는 과금 호출 없이 재사용')
  const imageResponse = await fetch(origin + `/api/report/${id}/reader/sketch`, { headers: { Authorization: `Bearer ${owner.id}` } })
  assert.equal(imageResponse.status, 200)
  assert.equal(imageResponse.headers.get('content-type'), 'image/webp')
  assert.match(imageResponse.headers.get('cache-control')!, /private, no-store/)
  assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()), imageFixture)
  assert.equal((await request()).data.hasSketch, true)
  assert.equal((await request('/sketch', undefined, 'someone-else')).status, 403)
  await store.mutateReportRecord(id, owner, current => { current.auxiliary!.readerTools!.attempts = { day: new Date().toISOString().slice(0,10), count: 8 } })
  assert.equal((await request('/question', { sectionId: section.id, question: '새 질문' })).status, 429)
})
