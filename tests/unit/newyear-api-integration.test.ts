import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { Server } from 'node:http'
import type { UserBirthProfile } from '../../src/user/profile-store.js'

// Snapshot all storage modules in memory before enabling synthetic auth. Never
// load dotenv or allow a provider/database/payment request out of this process.
const previousEnv = { ...process.env }
process.env.NODE_ENV = 'test'
for (const name of Object.keys(process.env)) {
  if (/DATABASE|SUPABASE|OPENAI|ANTHROPIC|INICIS|PAYMENT|VERCEL|REPORT_STORAGE|ADMIN_EMAIL/.test(name)) delete process.env[name]
}
const nativeFetch = globalThis.fetch
let origin = ''
const unexpected: string[] = []
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (url.href === 'https://synthetic-auth.invalid/auth/v1/user') {
    const token = new Headers(init?.headers).get('authorization')?.replace(/^Bearer /, '')
    return new Response(JSON.stringify({ id: token, email: `${token}@synthetic.invalid` }), { status: token ? 200 : 401, headers: { 'Content-Type': 'application/json' } })
  }
  if (origin && url.origin === origin) return nativeFetch(input, init)
  unexpected.push(url.origin)
  throw new Error('External requests are forbidden in this integration suite')
}) as typeof fetch

const store = await import('../../src/report/report-store.js')
const profiles = await import('../../src/user/profile-store.js')
const payments = await import('../../src/payment/order-store.js')
process.env.SUPABASE_URL = 'https://synthetic-auth.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'synthetic-public-fixture-only'
process.env.PAYMENT_TEST_MODE = 'true'
const { default: app } = await import('../../src/server/app.js')
let server: Server
const profile: UserBirthProfile = {
  userId: 'newyear-owner-a', name: '합성점검',
  birth: { year: 1975, month: 9, day: 26, hour: 5, minute: 0, gender: 'male', calendar: 'solar' },
  birthTimeKnown: true, context: {}, createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z',
}

async function request(path: string, body?: unknown, owner = 'newyear-owner-a') {
  const response = await fetch(origin + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(owner ? { Authorization: `Bearer ${owner}` } : {}), 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  return { response, payload: await response.json() as any }
}

before(async () => {
  assert.equal(store.getReportStorageMode(), 'memory')
  assert.equal(profiles.getUserProfileStorageMode(), 'memory')
  assert.equal(payments.getPaymentStorageMode(), 'memory')
  for (const owner of ['newyear-owner-a', 'newyear-owner-b']) await profiles.saveUserBirthProfile({ ...profile, userId: owner }, { id: owner })
  server = await new Promise<Server>((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
    instance.once('error', reject)
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  origin = `http://127.0.0.1:${address.port}`
})

after(async () => {
  if (server) {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
  globalThis.fetch = nativeFetch
  for (const name of Object.keys(process.env)) if (!(name in previousEnv)) delete process.env[name]
  Object.assign(process.env, previousEnv)
  assert.deepEqual(unexpected, [])
})

describe('newyear preview, ownership and saved-result integration', { concurrency: false }, () => {
  it('routes saved UUID entry points to the report and keeps only allowed locator query fields', async () => {
    const savedId = '00000000-0000-4000-8000-000000000001'
    const query = new URLSearchParams({ paid: '1', orderId: 'synthetic order+1', reportId: savedId,
      returnTo: 'https://external.invalid/takeover', __umsh_path: 'untrusted-rewrite', unrelated: 'discard' })
    const targets = [
      ['', '04-step-4-report/index.html'], ['/', '04-step-4-report/index.html'], ['/index.html', '04-step-4-report/index.html'],
      ...[['input', '02-step-2-saju-input/index.html'], ['report', '04-step-4-report/index.html'],
        ['chat', '05-step-5-chat/chat.html'], ['detail', '06-step-6_1-report-detail/index.html']]
        .flatMap(([alias, page]) => [[`/${alias}`, page], [`/${alias}.html`, page]]),
    ]
    for (const [alias, page] of targets) {
      const response = await fetch(`${origin}/flow/newyear${alias}?${query}`, { redirect: 'manual' })
      assert.equal(response.status, 302)
      const location = response.headers.get('location')!
      assert.ok(location.startsWith('/flow/newyear/'))
      const target = new URL(location, origin)
      assert.equal(target.origin, origin)
      assert.equal(target.pathname, `/flow/newyear/${page}`)
      assert.deepEqual([...target.searchParams], [['paid', '1'], ['orderId', 'synthetic order+1'], ['reportId', savedId]])
    }
    const savedOnly = await fetch(`${origin}/flow/newyear?reportId=${savedId}`, { redirect: 'manual' })
    assert.equal(savedOnly.headers.get('location'), `/flow/newyear/04-step-4-report/index.html?reportId=${savedId}`)
    for (const [alias, page] of targets) {
      const preview = await fetch(`${origin}/flow/newyear${alias}?reportId=${savedId}&preview=1&returnTo=https://external.invalid/`, { redirect: 'manual' })
      assert.equal(preview.headers.get('location'), `/flow/newyear/${page}?reportId=${savedId}&preview=1`)
    }
    const invalidPreview = await fetch(`${origin}/flow/newyear/report?reportId=${savedId}&preview=all`, { redirect: 'manual' })
    assert.equal(invalidPreview.headers.get('location'), `/flow/newyear/04-step-4-report/index.html?reportId=${savedId}`)
    const intro = await fetch(`${origin}/flow/newyear?returnTo=https://external.invalid/`, { redirect: 'manual' })
    assert.equal(intro.headers.get('location'), '/flow/newyear/01-step-1-story/index.html')
  })

  it('requires authentication and profile before creating a preview', async () => {
    assert.equal((await request('/api/flow/newyear/analyze', { preview: true }, '')).response.status, 401)
    const missing = await request('/api/flow/newyear/analyze', { preview: true }, 'newyear-no-profile')
    assert.equal(missing.response.status, 409)
    assert.equal(missing.payload.code, 'PROFILE_REQUIRED')
  })

  it('creates a calculated free preview before payment and reuses the same UUID', async () => {
    const first = await request('/api/flow/newyear/analyze', { preview: true })
    assert.equal(first.response.status, 200)
    assert.equal(first.payload.previewOnly, true)
    assert.equal(first.payload.serviceKey, 'newyear_flow')
    assert.equal(first.payload.report, undefined)
    assert.match(first.payload.resultId, /^[a-f0-9-]{36}$/)
    assert.match(first.payload.preview.headline, /합성점검.*꾸준히/)
    assert.match(first.payload.preview.summary, /丁未.*식신/)
    assert.match(first.payload.paymentUrl, /product=newyear_flow/)
    const second = await request('/api/flow/newyear/analyze', { preview: true })
    assert.equal(second.payload.resultId, first.payload.resultId)
    assert.deepEqual(second.payload.preview, first.payload.preview)
    const stored = await store.findReportRecord(first.payload.resultId, { id: profile.userId })
    assert.equal(stored?.context.newyear?.targetYear, 2027)
    assert.equal(stored?.report.sections.length, 36)
    assert.ok(stored?.report.sections.every(section => section.status === 'pending' && section.generationId))
    const unpaid = await request('/api/flow/newyear/analyze', {})
    assert.equal(unpaid.response.status, 402)
    const get = await request(`/api/report/${first.payload.resultId}`)
    assert.equal(get.payload.previewOnly, true)
    assert.equal(get.response.headers.get('cache-control'), 'private, no-store')
    assert.deepEqual(await store.findReportRecord(first.payload.resultId, { id: profile.userId }), stored)
  })

  it('separates identical birth profiles across owners and rejects foreign/service IDs', async () => {
    const a = await request('/api/flow/newyear/analyze', { preview: true })
    const b = await request('/api/flow/newyear/analyze', { preview: true }, 'newyear-owner-b')
    assert.notEqual(a.payload.resultId, b.payload.resultId)
    assert.equal((await request(`/api/report/${a.payload.resultId}`, undefined, 'newyear-owner-b')).response.status, 403)
    assert.equal((await request('/api/work/job/analyze', { reportId: a.payload.resultId })).response.status, 409)
    assert.equal((await request('/api/flow/newyear/analyze', { reportId: 'missing-saved-id' })).response.status, 404)
  })

  it('paid return and repeated section lookup preserve saved UUID/content without new AI', async () => {
    const preview = await request('/api/flow/newyear/analyze', { preview: true })
    const id = preview.payload.reportId
    await payments.savePaymentOrder({
      orderId: 'synthetic-newyear-paid', ownerId: profile.userId, buyerEmail: 'fixture@synthetic.invalid', buyerTel: '00000000000',
      productKey: 'newyear_flow', productTitle: 'Synthetic fixture', amount: 19900, status: 'paid', reportId: id,
      createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z',
    })
    const paid = await request('/api/flow/newyear/analyze', { reportId: preview.payload.resultId, orderId: 'synthetic-newyear-paid' })
    assert.equal(paid.response.status, 200)
    assert.equal(paid.payload.report.isPaid, true)
    assert.equal(paid.payload.resultId, preview.payload.resultId)
    assert.equal(paid.payload.report.sections.length, 36)
    const record = await store.findReportRecord(preview.payload.resultId, { id: profile.userId })
    const section = record!.report.sections[0]
    await store.updateReportSection(id, { ...section, interpretation: 'SYNTHETIC_COMPLETED_YEAR_READING' }, { generatedBy: 'openai', model: 'synthetic-no-api', status: 'complete' }, { id: profile.userId })
    const before = await store.findReportRecord(preview.payload.resultId, { id: profile.userId })
    const reopened = await request(`/api/report/${preview.payload.resultId}`)
    assert.equal(reopened.payload.report.sections[0].interpretation, 'SYNTHETIC_COMPLETED_YEAR_READING')
    const repeated = await request('/api/report/section', { reportId: preview.payload.resultId, sectionId: section.generationId })
    assert.equal(repeated.payload.section.interpretation, 'SYNTHETIC_COMPLETED_YEAR_READING')
    assert.equal(repeated.payload.section.generationId, section.generationId)
    assert.deepEqual(await store.findReportRecord(preview.payload.resultId, { id: profile.userId }), before)
  })

  it('keeps an explicit preview GET limited and immutable for paid, admin and open access', async () => {
    const created = await request('/api/flow/newyear/analyze', { preview: true })
    const id = created.payload.resultId
    const before = await store.findReportRecord(id, { id: profile.userId })
    const adminBefore = process.env.UMSH_ADMIN_EMAILS
    const modeBefore = process.env.PAYMENT_TEST_MODE
    try {
      for (const access of ['paid', 'admin', 'open']) {
        if (access === 'admin') process.env.UMSH_ADMIN_EMAILS = 'newyear-owner-a@synthetic.invalid'
        if (access === 'open') { delete process.env.UMSH_ADMIN_EMAILS; delete process.env.PAYMENT_TEST_MODE }
        const preview = await request(`/api/report/${id}?preview=1`)
        assert.equal(preview.response.status, 200, access)
        assert.equal(preview.payload.previewOnly, true, access)
        assert.equal(preview.payload.resultId, id, access)
        assert.equal(preview.payload.report, undefined, access)
        assert.deepEqual(preview.payload.preview, created.payload.preview, access)
        const full = await request(`/api/report/${id}`)
        assert.equal(full.response.status, 200, access)
        assert.equal(full.payload.report.sections.length, 36, access)
        if (access !== 'admin') assert.equal(full.payload.report.isPaid, true, access)
        if (access === 'admin') assert.equal((await request('/api/user/profile')).payload.admin, true)
        if (access === 'open') assert.equal(full.payload.report.unlockReason, 'open')
        assert.deepEqual(await store.findReportRecord(id, { id: profile.userId }), before, access)
      }
    } finally {
      if (adminBefore === undefined) delete process.env.UMSH_ADMIN_EMAILS
      else process.env.UMSH_ADMIN_EMAILS = adminBefore
      if (modeBefore === undefined) delete process.env.PAYMENT_TEST_MODE
      else process.env.PAYMENT_TEST_MODE = modeBefore
    }
  })
})
