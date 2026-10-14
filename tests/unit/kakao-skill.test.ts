import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseKakaoBirth, describeBirth } from '../../src/kakao/birth-parse.js'
import { memoryKakaoChatStore } from '../../src/kakao/chat-store.js'
import { KAKAO_FREE_DAILY, KAKAO_UPSELL, kakaoSkillHandler, kstDay, type KakaoReply, type SkillResponse } from '../../src/kakao/skill.js'

const NOW = new Date('2026-10-14T03:00:00Z') // KST 12:00

function fakeRes() {
  const res = {
    statusCode: 200, body: undefined as unknown, headers: {} as Record<string, string>,
    setHeader(name: string, value: string) { this.headers[name] = value },
    status(code: number) { this.statusCode = code; return this },
    json(body: unknown) { this.body = body; return this },
  }
  return res
}

function fakeReq(body: unknown, secret = 'test-secret') {
  return { body, get: (name: string) => (name.toLowerCase() === 'x-umsh-kakao-secret' ? secret : undefined) }
}

function payload(utterance: string, extra: Record<string, unknown> = {}) {
  return { bot: { id: 'bot' }, userRequest: { utterance, user: { id: 'user-1' }, block: { name: '폴백 블록' }, ...extra } }
}

function setup(reply: KakaoReply = async () => '나는 천명이야, 운명상회 상주.') {
  const store = memoryKakaoChatStore()
  const calls: Array<{ system: string; text: string }> = []
  const handler = kakaoSkillHandler({
    store, now: () => NOW, secret: () => 'test-secret', syncBudgetMs: 200,
    reply: async (system, history, text) => { calls.push({ system, text }); return reply(system, history, text) },
    waitUntil: () => undefined,
  })
  const send = async (utterance: string, extra: Record<string, unknown> = {}, secret?: string) => {
    const res = fakeRes()
    await handler(fakeReq(payload(utterance, extra), secret) as never, res as never)
    return res
  }
  return { store, calls, send }
}

function texts(body: unknown): string {
  return JSON.stringify((body as SkillResponse).template?.outputs ?? [])
}

describe('kakao birth parser', () => {
  it('reads common Korean birth formats', () => {
    const a = parseKakaoBirth('1995년 3월 2일 양력 여자 오후 3시', NOW)
    assert.deepEqual(a, { ok: true, birth: { year: 1995, month: 3, day: 2, hour: 15, minute: 0, timeKnown: true, gender: 'female', calendar: 'solar' } })
    const b = parseKakaoBirth('941120 음력 남 모름', NOW)
    assert.ok(b.ok)
    if (b.ok) {
      assert.equal(b.birth.year, 1994); assert.equal(b.birth.calendar, 'lunar'); assert.equal(b.birth.isLeapMonth, false)
      assert.equal(b.birth.timeKnown, false); assert.equal(b.birth.gender, 'male')
      assert.match(describeBirth(b.birth), /시간 모름/)
    }
    const c = parseKakaoBirth('1990.07.15 여 22:40', NOW)
    assert.ok(c.ok && c.birth.hour === 22 && c.birth.minute === 40)
    const d = parseKakaoBirth('2001년 1월 9일 남자 새벽 12시 반', NOW)
    assert.ok(d.ok && d.birth.hour === 0 && d.birth.minute === 30)
  })

  it('asks for what is missing and rejects impossible dates', () => {
    assert.deepEqual(parseKakaoBirth('1995년 3월 2일 오후 3시', NOW), { ok: false, reason: 'gender' })
    assert.deepEqual(parseKakaoBirth('여자야', NOW), { ok: false, reason: 'date' })
    assert.deepEqual(parseKakaoBirth('1995년 2월 30일 여자', NOW), { ok: false, reason: 'invalid' })
    assert.deepEqual(parseKakaoBirth('2030년 1월 1일 여자', NOW), { ok: false, reason: 'invalid' })
  })
})

describe('kakao skill server', () => {
  it('rejects requests without the shared secret', async () => {
    const { send, calls } = setup()
    const res = await send('너 이름이 뭐야', {}, 'wrong')
    assert.equal(res.statusCode, 401)
    assert.equal(calls.length, 0)
  })

  it('answers free chat as 천명 and keeps the conversation', async () => {
    const { send, calls, store } = setup()
    const res = await send('너 이름이 뭐야')
    assert.equal(res.statusCode, 200)
    assert.match(texts(res.body), /나는 천명이야/)
    assert.match(calls[0].system, /천명/)
    assert.match(calls[0].system, /반말/)
    const saved = [...store.rows.values()].find(row => row.history.length)
    assert.equal(saved?.history.length, 2)
    assert.equal(saved?.historyDay, kstDay(NOW))
  })

  it('allows 10 free answers a day, then sends the upsell', async () => {
    const { send, calls } = setup()
    for (let i = 1; i <= KAKAO_FREE_DAILY; i += 1) {
      const res = await send(`질문 ${i}`)
      if (i === KAKAO_FREE_DAILY) assert.match(texts(res.body), new RegExp(KAKAO_UPSELL))
    }
    const over = await send('하나만 더')
    assert.equal(calls.length, KAKAO_FREE_DAILY)
    assert.match(texts(over.body), /10번을 다 썼어/)
    assert.match(texts(over.body), new RegExp(KAKAO_UPSELL))
    assert.match(texts(over.body), /umsh\.kr\/\?utm_source=kakao/)
  })

  it('refunds the free answer when the model fails', async () => {
    const { send, store } = setup(async () => { throw new Error('down') })
    const res = await send('안녕')
    assert.match(texts(res.body), /횟수에서 빼 둘게/)
    const user = [...store.rows.values()].find(row => row.quotaDay && row.used === 0)
    assert.ok(user)
  })

  it('runs the couple flow: own birth, partner birth, short reading, upsell', async () => {
    const { send, calls } = setup(async () => '둘은 물과 불이야.')
    const start = await send('우리궁합', { block: { name: '우리궁합' } })
    assert.match(texts(start.body), /손님 생일부터/)
    const missing = await send('1995년 3월 2일 오후 3시')
    assert.match(texts(missing.body), /남자인지 여자인지/)
    const self = await send('1995년 3월 2일 양력 여자 오후 3시')
    assert.match(texts(self.body), /상대 생일/)
    assert.equal(calls.length, 0, 'birth collection never calls the model')
    const done = await send('1994년 11월 20일 음력 남자 모름')
    assert.equal(calls.length, 1)
    assert.match(calls[0].system, /우리궁합 맛보기/)
    assert.match(calls[0].system, /dayMaster/)
    assert.match(texts(done.body), /둘은 물과 불이야/)
    assert.match(texts(done.body), new RegExp(KAKAO_UPSELL))
    assert.match(texts(done.body), /match\/couple/)
  })

  it('leaves the couple flow on cancel or on a non-birth message', async () => {
    const { send, calls } = setup()
    await send('궁합')
    const cancel = await send('그만')
    assert.match(texts(cancel.body), /궁합은 여기까지/)
    await send('궁합 보기')
    const chat = await send('너 이름이 뭐야')
    assert.match(texts(chat.body), /나는 천명이야/)
    assert.equal(calls.length, 1)
  })

  it('switches to the Kakao callback when the model is slow', async () => {
    const store = memoryKakaoChatStore()
    const posted: Array<{ url: string; body: SkillResponse }> = []
    let pending: Promise<unknown> | undefined
    const handler = kakaoSkillHandler({
      store, now: () => NOW, secret: () => 'test-secret', syncBudgetMs: 20,
      reply: () => new Promise<string>(resolve => setTimeout(() => resolve('천천히 답했어.'), 80)),
      waitUntil: (work) => { pending = work },
      postCallback: async (url, body) => { posted.push({ url, body }) },
    })
    const res = fakeRes()
    await handler(fakeReq(payload('오래 걸리는 질문', { callbackUrl: 'https://bot-api.kakao.com/callback/abc' })) as never, res as never)
    assert.deepEqual((res.body as SkillResponse).useCallback, true)
    await pending
    assert.equal(posted.length, 1)
    assert.equal(posted[0].url, 'https://bot-api.kakao.com/callback/abc')
    assert.match(texts(posted[0].body), /천천히 답했어/)
  })
})
