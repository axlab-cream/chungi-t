import { after, it } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import express from 'express'
import type { ConsultationProvider, PartnerDetails } from '../../src/consultation/provider.js'
import type { UserBirthProfile } from '../../src/user/profile-store.js'

const names = ['NODE_ENV', 'DATABASE_URL', 'SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL', 'REPORT_STORAGE_DIR', 'VERCEL']
const env = new Map(names.map(k => [k, process.env[k]]))
for (const k of names) delete process.env[k]
process.env.NODE_ENV = 'test'
const { consultationChat, consultationRouter, validatePartner, isConsultationRecord } = await import('../../src/consultation/backend.js')
const { DEFAULT_CONSULTATION_SETTINGS } = await import('../../src/consultation/settings.js')
const { listReportRecords, mutateReportRecord } = await import('../../src/report/report-store.js')
after(() => { for (const [k, v] of env) { if (v === undefined) delete process.env[k]; else process.env[k] = v } })
const profile: UserBirthProfile = { userId: 'test', name: '테스트', birth: { year: 1994, month: 3, day: 11, hour: 9, minute: 15, gender: 'female', calendar: 'solar' }, birthTimeKnown: true, context: {}, createdAt: '', updatedAt: '' }
function setup() {
  const owner = { id: randomUUID() }
  const calls: string[] = []
  let partner: PartnerDetails = { requested: false }
  const provider: ConsultationProvider = {
    transcribe: async () => { calls.push('transcribe'); return '상대와 잘 지내고 싶어요' },
    extract: async () => { calls.push('extract'); return partner },
    reply: async (system, history, text) => { calls.push('reply'); assert.ok(system.includes('knowledge')); assert.ok(system.includes('dayMaster')); assert.ok(text); return `답변 ${history.length}` },
  }
  const order = { orderId: randomUUID(), ownerId: owner.id, buyerEmail: '', buyerTel: '', productKey: 'cheonmyeong_consultation', productTitle: '질문5회', amount: 4900, status: 'paid' as const, tid: 'verified-test', createdAt: '', updatedAt: '' }
  const options = { paymentOrders: async () => [order], paymentOrder: async () => order, provider, profile: async () => structuredClone(profile), settings: async () => ({ ...DEFAULT_CONSULTATION_SETTINGS }) }
  return { owner, calls, provider, options, setPartner: (p: PartnerDetails) => { partner = p } }
}
it('persists text/audio together, idempotently replays, preserves immutable report body', async () => {
  const s = setup(); const input = { requestId: randomUUID(), text: '직장 고민입니다' }
  const first = await consultationChat(s.owner, input, s.options)
  assert.equal(first.saved, true); assert.equal(first.history.length, 2)
  const replay = await consultationChat(s.owner, input, s.options)
  assert.equal(replay.text, first.text); assert.deepEqual(s.calls, ['extract', 'reply'])
  await assert.rejects(consultationChat(s.owner, { ...input, text: '다른 질문' }, s.options), /REQUEST_CONFLICT/)
  const before = (await listReportRecords(s.owner))[0]
  assert.ok(isConsultationRecord(before)); assert.equal(before.owner?.accessToken, undefined)
  const second = await consultationChat(s.owner, { requestId: randomUUID(), conversationId: first.conversationId, audio: 'YWJjZA==', mime: 'audio/webm' }, s.options)
  assert.equal(second.heard, '상대와 잘 지내고 싶어요'); assert.equal(second.history.length, 4)
  assert.deepEqual(s.calls.slice(-3), ['transcribe', 'extract', 'reply'])
  assert.deepEqual((await listReportRecords(s.owner))[0].report, before.report)
})
it('asks one missing partner detail and retains explicit corrected partner data', async () => {
  const s = setup(); s.setPartner({ requested: true, personLabel: '민수', relationship: '남자친구', identity: 'new', year: 1990, month: 5, day: 3 })
  const first = await consultationChat(s.owner, { requestId: randomUUID(), text: '궁합 부탁해요' }, s.options)
  assert.match(first.text, /양력/); assert.deepEqual(s.calls, ['extract'])
  s.setPartner({ requested: true, personLabel: '민수', identity: 'same', year: 1991, calendar: 'solar', gender: 'male', timeKnown: false })
  const second = await consultationChat(s.owner, { requestId: randomUUID(), conversationId: first.conversationId, text: '1991년 양력 남자이고 시간은 몰라요' }, s.options)
  assert.equal(second.partner?.year, 1991); assert.equal(second.partner?.timeKnown, false)
  assert.equal(second.partner?.hour, undefined); assert.equal(second.profile.birth.year, 1994)
  assert.equal(second.partner?.month, 5); assert.equal(second.partners[0].relationship, '남자친구')
})
it('keeps identified people separate, clarifies ambiguous identities, and retains earlier people', async () => {
  const s = setup(); s.setPartner({ requested: true, personLabel: '민수', name: '민수', identity: 'new', year: 1990, month: 5, day: 3, calendar: 'solar', gender: 'male', timeKnown: false })
  const first = await consultationChat(s.owner, { requestId: randomUUID(), text: '민수와 궁합' }, s.options)
  s.setPartner({ requested: true, personLabel: '지영', name: '지영', identity: 'new', year: 1992 })
  const second = await consultationChat(s.owner, { requestId: randomUUID(), conversationId: first.conversationId, text: '이번에는 친구 지영' }, s.options)
  assert.equal(second.partner?.month, undefined); assert.match(second.text, /생년월일/); assert.equal(second.partners.length, 2)
  s.setPartner({ requested: true, identity: 'unclear' })
  const third = await consultationChat(s.owner, { requestId: randomUUID(), conversationId: first.conversationId, text: '그 사람도 봐주세요' }, s.options)
  assert.match(third.text, /어느 분/); assert.equal(third.partner?.year, undefined)
  s.setPartner({ requested: true, personLabel: '민수', identity: 'same' })
  const fourth = await consultationChat(s.owner, { requestId: randomUUID(), conversationId: first.conversationId, text: '아까 민수요' }, s.options)
  assert.equal(fourth.partner?.year, 1990); assert.equal(fourth.partner?.month, 5)
})
it('uses updated personal birth profile when resuming without changing previous transcript', async () => {
  const s = setup()
  const first = await consultationChat(s.owner, { requestId: randomUUID(), text: '첫 질문' }, s.options)
  const changed = { ...profile, birth: { ...profile.birth, year: 1995 } }
  s.options.profile = async () => structuredClone(changed)
  const second = await consultationChat(s.owner, { requestId: randomUUID(), conversationId: first.conversationId, text: '새 질문' }, s.options)
  assert.equal(second.profile.birth.year, 1995)
  assert.deepEqual(second.history.slice(0, 2), first.history)
  assert.equal((await listReportRecords(s.owner))[0].birth.year, 1994)
})
it('validates malformed partner dates and lunar days without guessing fields', () => {
  assert.equal(validatePartner({ requested: true, year: 1991, month: 2, day: 31, calendar: 'solar' }).day, undefined)
  assert.equal(validatePartner({ requested: true, year: 1991, month: 2, day: 31, calendar: 'lunar', isLeapMonth: false }).day, undefined)
  assert.equal(validatePartner({ requested: true, hour: 99 }).hour, undefined)
  assert.throws(() => validatePartner({} as PartnerDetails), /PROVIDER_RESPONSE_INVALID/)
})
it('per-owner lease blocks concurrent conversations and failed calls can retry safely', async () => {
  const s = setup(); let release!: () => void
  const wait = new Promise<void>(resolve => { release = resolve }); let entered!: () => void
  const started = new Promise<void>(resolve => { entered = resolve })
  s.provider.reply = async () => { entered(); await wait; throw new Error('secret-provider-detail') }
  const input = { requestId: randomUUID(), text: '질문' }
  const first = consultationChat(s.owner, input, s.options)
  await started
  await assert.rejects(consultationChat(s.owner, { requestId: randomUUID(), text: '동시 질문' }, s.options), /GENERATION_BUSY/)
  release(); await assert.rejects(first)
  s.provider.reply = async () => '재시도 성공'
  const retried = await consultationChat(s.owner, input, s.options)
  assert.equal(retried.history.length, 2)
})
it('rejects missing profile, request overload and stored daily cap before provider', async () => {
  const s = setup()
  await assert.rejects(consultationChat(s.owner, { requestId: randomUUID(), text: '질문' }, { ...s.options, profile: async () => null }), /PROFILE_REQUIRED/)
  await assert.rejects(consultationChat(s.owner, { requestId: randomUUID(), text: 'a'.repeat(4001) }, s.options), /INPUT_INVALID/)
  await consultationChat(s.owner, { requestId: randomUUID(), text: '질문' }, s.options)
  const record = (await listReportRecords(s.owner))[0]
  await mutateReportRecord(record.reportId, s.owner, r => { (r.auxiliary as unknown as { consultation: { count: number } }).consultation.count = 40 })
  const calls = s.calls.length
  await assert.rejects(consultationChat(s.owner, { requestId: randomUUID(), text: '질문' }, s.options), /DAILY_LIMIT/)
  assert.equal(s.calls.length, calls)
})
it('rejects non-durable memory outside tests and caps stored session/turn growth', async () => {
  const s = setup()
  process.env.NODE_ENV = 'development'
  try { await assert.rejects(consultationChat(s.owner, { requestId: randomUUID(), text: '질문' }, s.options), /STORAGE_UNAVAILABLE/) }
  finally { process.env.NODE_ENV = 'test' }
  assert.equal(s.calls.length, 0)
  const first = await consultationChat(s.owner, { requestId: randomUUID(), text: '질문' }, s.options)
  const record = (await listReportRecords(s.owner))[0]
  await mutateReportRecord(record.reportId, s.owner, r => {
    const state = (r.auxiliary as unknown as { consultation: { sessions: Array<{ id: string; history: unknown[] }> } }).consultation
    state.sessions[0].history = Array.from({ length: 80 }, () => ({ role: 'user', content: '기존 기록' }))
  })
  await assert.rejects(consultationChat(s.owner, { requestId: randomUUID(), conversationId: first.conversationId, text: '추가' }, s.options), /CONVERSATION_LIMIT/)
  assert.equal(s.calls.length, 2)
})
it('never returns saved success when its generation lease is lost before the final write', async () => {
  const s = setup()
  s.provider.reply = async () => {
    const record = (await listReportRecords(s.owner))[0]
    await mutateReportRecord(record.reportId, s.owner, r => {
      delete (r.auxiliary as unknown as { consultation: { lease?: unknown } }).consultation.lease
    })
    return '저장되지 않은 답변'
  }
  await assert.rejects(consultationChat(s.owner, { requestId: randomUUID(), text: '질문' }, s.options), /GENERATION_EXPIRED/)
  const record = (await listReportRecords(s.owner))[0]
  const state = (record.auxiliary as unknown as { consultation: { sessions: Array<{ history: unknown[] }> } }).consultation
  assert.ok(state.sessions.length === 0 || state.sessions[0].history.length === 0)
})
it('router returns owner-only conversations, no-store and sanitized failures', async () => {
  const s = setup(); const other = { id: randomUUID() }
  const result = await consultationChat(s.owner, { requestId: randomUUID(), text: '저장된 상담' }, s.options)
  let settingsFailure = ''
  const app = express(); app.use(express.json()); app.use('/api/consultation', consultationRouter({ ...s.options, settings: async () => { if (settingsFailure) throw new Error(settingsFailure); return s.options.settings() }, authenticate: async req => req.headers.authorization === 'owner' ? s.owner : req.headers.authorization === 'other' ? other : null }))
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve))
  const address = server.address() as { port: number }; const base = `http://127.0.0.1:${address.port}/api/consultation`
  try {
    assert.equal((await fetch(`${base}/context`)).status, 401)
    const read = await fetch(`${base}/conversations/${result.conversationId}`, { headers: { authorization: 'owner' } })
    assert.equal(read.status, 200); assert.match(read.headers.get('cache-control')!, /no-store/)
    assert.match((await read.json()).transcript, /저장된 상담/)
    assert.equal((await fetch(`${base}/conversations/${result.conversationId}`, { headers: { authorization: 'other' } })).status, 404)
    s.provider.reply = async () => { throw new Error('secret-token-value') }
    const fail = await fetch(`${base}/chat`, { method: 'POST', headers: { authorization: 'owner', 'content-type': 'application/json' }, body: JSON.stringify({ requestId: randomUUID(), text: '실패' }) })
    assert.equal(fail.status, 503); assert.doesNotMatch(await fail.text(), /secret-token-value/)
    settingsFailure = 'CONSULTATION_SETTINGS_UNAVAILABLE'
    const settingsFail = await fetch(`${base}/context`, { headers: { authorization: 'owner' } })
    assert.equal(settingsFail.status, 503)
    assert.deepEqual(await settingsFail.json(), { code: 'CONSULTATION_SETTINGS_UNAVAILABLE', error: '상담 설정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' })
  } finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())) }
})

it('grants one member-lifetime free answer, replay costs nothing, and new sessions cannot reset it', async () => {
  const s = setup(); s.options.paymentOrders = async () => []
  const input = { requestId: randomUUID(), text: '무료 질문' }
  const first = await consultationChat(s.owner, input, s.options)
  assert.equal(first.charged, true); assert.equal((await consultationChat(s.owner, input, s.options)).charged, true)
  assert.equal(first.access.freeRemaining, 0); assert.equal(first.access.remaining, 0)
  assert.equal((await consultationChat(s.owner, input, s.options)).access.remaining, 0)
  const called = s.calls.length
  await assert.rejects(consultationChat(s.owner, { requestId: randomUUID(), text: '새 상담' }, s.options), (error: any) => error.code === 'CONSULTATION_PAYMENT_REQUIRED' && error.status === 402 && error.access.remaining === 0)
  assert.equal(s.calls.length, called)
})
it('adds exactly five verified paid answers, counts saves only and never regrants a consumed pack', async () => {
  const s = setup()
  for (let index = 0; index < 6; index++) {
    const input = { requestId: randomUUID(), text: `질문${index}` }
    const result = await consultationChat(s.owner, input, s.options)
    assert.equal(result.access.remaining, 5 - index)
    assert.equal((await consultationChat(s.owner, input, s.options)).access.remaining, 5 - index)
  }
  await assert.rejects(consultationChat(s.owner, { requestId: randomUUID(), text: '일곱째' }, s.options), /CONSULTATION_PAYMENT_REQUIRED/)
})
it('partner clarification and provider failure preserve the free allowance', async () => {
  const s = setup(); s.options.paymentOrders = async () => []
  s.setPartner({ requested: true, personLabel: '상대', identity: 'new' })
  const first = await consultationChat(s.owner, { requestId: randomUUID(), text: '궁합' }, s.options)
  assert.equal(first.charged, false); assert.equal(first.access.freeRemaining, 1)
  s.setPartner({ requested: false }); s.provider.reply = async () => { throw new Error('provider-down') }
  const input = { requestId: randomUUID(), text: '질문' }
  await assert.rejects(consultationChat(s.owner, input, s.options), /provider-down/)
  s.provider.reply = async () => '성공'
  assert.equal((await consultationChat(s.owner, input, s.options)).access.freeRemaining, 0)
})
it('rejects wrong-owner, wrong-product, unapproved and wrong-price packs', async () => {
  for (const patch of [{ ownerId: 'other' }, { productKey: 'other' }, { tid: '' }, { amount: 1 }, { status: 'cancelled' }]) {
    const s = setup(); const [order] = await s.options.paymentOrders()
    Object.assign(order, patch)
    const first = await consultationChat(s.owner, { requestId: randomUUID(), text: '무료' }, s.options)
    assert.equal(first.access.paidRemaining, 0)
    await assert.rejects(consultationChat(s.owner, { requestId: randomUUID(), text: '유료' }, s.options), /CONSULTATION_PAYMENT_REQUIRED/)
  }
})
it('retains discovered older packs when listing omits them and invalidates refunds by order lookup', async () => {
  const s = setup(); const [order] = await s.options.paymentOrders()
  await consultationChat(s.owner, { requestId: randomUUID(), text: '무료' }, s.options)
  s.options.paymentOrders = async () => []
  const second = await consultationChat(s.owner, { requestId: randomUUID(), text: '유료' }, s.options)
  assert.equal(second.access.paidRemaining, 4)
  Object.assign(order, { status: 'cancelled' })
  await assert.rejects(consultationChat(s.owner, { requestId: randomUUID(), text: '환불후' }, s.options), /CONSULTATION_PAYMENT_REQUIRED/)
})
it('payment lookup failures fail closed before provider and capacity gates further pack purchases', async () => {
  const s = setup(); const { getConsultationAccess } = await import('../../src/consultation/backend.js')
  s.options.paymentOrders = async () => { throw new Error('secret') }
  await assert.rejects(consultationChat(s.owner, { requestId: randomUUID(), text: '질문' }, s.options), /CONSULTATION_CREDITS_UNAVAILABLE/)
  assert.equal(s.calls.length, 0)
  s.options.paymentOrders = async () => []
  await consultationChat(s.owner, { requestId: randomUUID(), text: '질문' }, s.options)
  const record = (await listReportRecords(s.owner))[0]
  await mutateReportRecord(record.reportId, s.owner, r => {
    const state = (r.auxiliary as any).consultation
    state.sessions = Array.from({ length: 20 }, (_, index) => ({ ...state.sessions[0], id: `session-${index}`, history: Array.from({ length: 80 }, () => ({ role: 'user', content: '기존' })) }))
  })
  const access = await getConsultationAccess(s.owner, s.options)
  assert.equal(access.purchaseAvailable, false); assert.equal(access.purchaseUnavailableReason, 'CONSULTATION_STORAGE_CAPACITY')
})

it('failed first turns release invisible session capacity and keep the same request retryable', async () => {
  const s = setup(); s.options.paymentOrders = async () => []
  s.provider.reply = async () => { throw new Error('down') }
  const input = { requestId: randomUUID(), text: '재시도' }
  for (let index = 0; index < 21; index++) {
    await assert.rejects(consultationChat(s.owner, index ? { ...input, requestId: randomUUID() } : input, s.options), /down/)
  }
  const record = (await listReportRecords(s.owner))[0]
  assert.equal((record.auxiliary as any).consultation.sessions.length, 0)
  s.provider.reply = async () => '완료'
  assert.equal((await consultationChat(s.owner, input, s.options)).access.freeRemaining, 0)
})
it('voice synthesis can supply audio only and cannot overwrite the saved answer or credits', async () => {
  const s = setup()
  const result = await consultationChat(s.owner, { requestId: randomUUID(), text: '질문' }, { ...s.options, synthesize: async () => ({ audio: 'YWJj', audioMime: 'audio/mpeg', text: 'malicious', saved: false, access: { remaining: 999 } }) })
  assert.equal(result.text, '답변 0'); assert.equal(result.saved, true); assert.equal(result.access.remaining, 5)
})

it('a refund during generation prevents saving and spending the paid answer', async () => {
  const s = setup(); const [order] = await s.options.paymentOrders()
  await consultationChat(s.owner, { requestId: randomUUID(), text: '무료' }, s.options)
  s.provider.reply = async () => { Object.assign(order, { status: 'cancelled' }); return '환불 중 답변' }
  await assert.rejects(consultationChat(s.owner, { requestId: randomUUID(), text: '유료' }, s.options), /CONSULTATION_PAYMENT_REQUIRED/)
  const state = ((await listReportRecords(s.owner))[0].auxiliary as any).consultation
  assert.equal(state.credits.usedByOrder[order.orderId], 0)
  assert.equal(state.sessions.reduce((n: number, session: any) => n + session.history.length, 0), 2)
})
it('failed final save does not consume a paid credit', async () => {
  const s = setup(); const [order] = await s.options.paymentOrders()
  await consultationChat(s.owner, { requestId: randomUUID(), text: '무료' }, s.options)
  s.provider.reply = async () => {
    const record = (await listReportRecords(s.owner))[0]
    await mutateReportRecord(record.reportId, s.owner, r => { (r.auxiliary as any).consultation.lease.until = 0 })
    return '저장 불가'
  }
  await assert.rejects(consultationChat(s.owner, { requestId: randomUUID(), text: '유료' }, s.options), /GENERATION_EXPIRED/)
  const state = ((await listReportRecords(s.owner))[0].auxiliary as any).consultation
  assert.equal(state.credits.usedByOrder[order.orderId], 0)
})

it('freezes paid packs with pending or partial refunds even while the order stays paid', async () => {
  const s = setup()
  const first = await consultationChat(s.owner, { requestId: randomUUID(), text: '무료' }, { ...s.options, refundBlocked: async () => true })
  assert.equal(first.access.paidRemaining, 0)
  await assert.rejects(consultationChat(s.owner, { requestId: randomUUID(), text: '유료' }, { ...s.options, refundBlocked: async () => true }), /CONSULTATION_PAYMENT_REQUIRED/)
  const renewed = await consultationChat(s.owner, { requestId: randomUUID(), text: '환불요청 거절후' }, { ...s.options, refundBlocked: async () => false })
  assert.equal(renewed.access.paidRemaining, 4)
})
it('a refund request created during generation freezes the pack before answer save', async () => {
  const s = setup(); let blocked = false
  const options = { ...s.options, refundBlocked: async () => blocked }
  await consultationChat(s.owner, { requestId: randomUUID(), text: '무료' }, options)
  s.provider.reply = async () => { blocked = true; return '환불요청 중 답변' }
  await assert.rejects(consultationChat(s.owner, { requestId: randomUUID(), text: '유료' }, options), /CONSULTATION_PAYMENT_REQUIRED/)
  const state = ((await listReportRecords(s.owner))[0].auxiliary as any).consultation
  assert.equal(Object.values(state.credits.usedByOrder)[0], 0)
})
it('refund lookup failure fails closed without contacting the provider', async () => {
  const s = setup()
  await assert.rejects(consultationChat(s.owner, { requestId: randomUUID(), text: '질문' }, { ...s.options, refundBlocked: async () => { throw new Error('private-detail') } }), /CONSULTATION_CREDITS_UNAVAILABLE/)
  assert.equal(s.calls.length, 0)
})

it('concurrent checkout reservations return one durable ID and reuse an interrupted missing order', async () => {
  const s = setup(); const { reserveConsultationCheckout } = await import('../../src/consultation/backend.js')
  const options = { ...s.options, paymentOrders: async () => [], paymentOrder: async () => null }
  await consultationChat(s.owner, { requestId: randomUUID(), text: '무료' }, options)
  const [first, second] = await Promise.all([
    reserveConsultationCheckout(s.owner, 'reserved-first', options),
    reserveConsultationCheckout(s.owner, 'reserved-second', options),
  ])
  assert.equal(first.orderId, second.orderId)
  assert.equal((await reserveConsultationCheckout(s.owner, 'reserved-third', options)).orderId, first.orderId)
})
it('checkout reuses ready orders, rejects approving orders and outstanding credits, then permits an exhausted replacement', async () => {
  const s = setup(); const { reserveConsultationCheckout } = await import('../../src/consultation/backend.js')
  const [template] = await s.options.paymentOrders()
  let order: import('../../src/payment/order-store.js').PaymentOrder | null = null
  const options = { ...s.options, paymentOrders: async () => order && ['paid', 'viewed'].includes(order.status) ? [order] : [], paymentOrder: async () => order }
  await assert.rejects(reserveConsultationCheckout(s.owner, 'reserved-first', options), /CONSULTATION_CREDITS_REMAINING/)
  await consultationChat(s.owner, { requestId: randomUUID(), text: '무료' }, options)
  const first = await reserveConsultationCheckout(s.owner, 'reserved-first', options)
  order = { ...template, orderId: first.orderId, status: 'ready' }
  assert.equal((await reserveConsultationCheckout(s.owner, 'unused-second', options)).orderId, first.orderId)
  order.status = 'approving'
  await assert.rejects(reserveConsultationCheckout(s.owner, 'unused-third', options), /CONSULTATION_CHECKOUT_BUSY/)
  order.status = 'paid'
  await assert.rejects(reserveConsultationCheckout(s.owner, 'unused-fourth', options), /CONSULTATION_CREDITS_REMAINING/)
  for (let i = 0; i < 5; i++) await consultationChat(s.owner, { requestId: randomUUID(), text: `유료 ${i}` }, options)
  assert.equal((await reserveConsultationCheckout(s.owner, 'next-pack', options)).orderId, 'next-pack')
})
it('checkout rejects a reservation pointing to another owner or wrong pack', async () => {
  const s = setup(); const { reserveConsultationCheckout } = await import('../../src/consultation/backend.js')
  const options = { ...s.options, paymentOrders: async () => [], paymentOrder: async (): Promise<import('../../src/payment/order-store.js').PaymentOrder | null> => null }
  await consultationChat(s.owner, { requestId: randomUUID(), text: '무료' }, options)
  const { orderId } = await reserveConsultationCheckout(s.owner, 'reserved-first', options)
  const [template] = await s.options.paymentOrders()
  for (const patch of [{ ownerId: 'another-owner' }, { amount: 1 }, { productKey: 'other' }]) {
    options.paymentOrder = async () => ({ ...template, orderId, ...patch })
    await assert.rejects(reserveConsultationCheckout(s.owner, 'not-created', options), /STORAGE_INVALID/)
  }
})

it('pure greeting and thanks preserve free credit without extraction or model replies', async () => {
  const s = setup(); s.options.paymentOrders = async () => []
  const first = await consultationChat(s.owner, { requestId: randomUUID(), text: '안녕하세요!' }, s.options)
  assert.equal(first.charged, false); assert.equal(first.access.freeRemaining, 1)
  assert.match(first.text, new RegExp(DEFAULT_CONSULTATION_SETTINGS.name))
  const second = await consultationChat(s.owner, { requestId: randomUUID(), conversationId: first.conversationId, text: '감사합니다.' }, s.options)
  assert.equal(second.charged, false); assert.equal(second.access.freeRemaining, 1)
  assert.deepEqual(s.calls, [])
  const question = await consultationChat(s.owner, { requestId: randomUUID(), conversationId: first.conversationId, text: '안녕하세요 직장 고민이 있어요' }, s.options)
  assert.equal(question.charged, true); assert.equal(question.access.freeRemaining, 0)
  assert.deepEqual(s.calls, ['extract', 'reply'])
  await assert.rejects(consultationChat(s.owner, { requestId: randomUUID(), text: '안녕하세요' }, s.options), /CONSULTATION_PAYMENT_REQUIRED/)
  assert.deepEqual(s.calls, ['extract', 'reply'])
})
it('social acknowledgement retains partner identity and repeats the pending detail without charging', async () => {
  const s = setup(); s.options.paymentOrders = async () => []
  s.setPartner({ requested: true, personLabel: '민수', identity: 'new', year: 1990 })
  const first = await consultationChat(s.owner, { requestId: randomUUID(), text: '민수와 궁합' }, s.options)
  s.setPartner({ requested: false })
  const second = await consultationChat(s.owner, { requestId: randomUUID(), conversationId: first.conversationId, text: '네' }, s.options)
  assert.equal(second.charged, false); assert.equal(second.access.freeRemaining, 1)
  assert.deepEqual(second.partner, first.partner); assert.deepEqual(second.partners, first.partners)
  assert.match(second.text, /생년월일/); assert.deepEqual(s.calls, ['extract'])
})
