import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { memoryKakaoChatStore } from '../../src/kakao/chat-store.js'
import { kakaoSkillHandler, type SkillResponse } from '../../src/kakao/skill.js'
import { kakaoLinkHandler, memoryKakaoLinkStore, sha256Hex, type KakaoLastResult } from '../../src/kakao/member-link.js'

const START = new Date('2026-10-16T03:00:00Z') // KST 12:00
const MEMBER = '11111111-2222-3333-4444-555555555555'
const APP_USER = '4000123456'
const BIRTH = '950302 여 15:00'

function fakeRes() {
  return {
    statusCode: 200, body: undefined as unknown, headers: {} as Record<string, string>,
    setHeader(name: string, value: string) { this.headers[name] = value },
    status(code: number) { this.statusCode = code; return this },
    json(body: unknown) { this.body = body; return this },
  }
}

function setup(options: { appUser?: boolean; members?: Record<string, string> } = {}) {
  let now = START
  const store = memoryKakaoChatStore()
  const links = memoryKakaoLinkStore(options.members ?? { [APP_USER]: MEMBER })
  const lookups: string[] = []
  const memberByAppUser = links.memberByAppUser
  links.memberByAppUser = async (id) => { lookups.push(id); return memberByAppUser(id) }
  const saved: Array<{ userId: string; result: KakaoLastResult }> = []
  const vault = async (userId: string, result: KakaoLastResult) => { saved.push({ userId, result }) }
  const aiCalls: string[] = []
  const handler = kakaoSkillHandler({
    store, links, vault, now: () => now, uiAnalysis: () => ({}), secret: () => 'test-secret', syncBudgetMs: 500, waitUntil: () => undefined,
    reply: async (_system, _history, text) => { aiCalls.push(text); return '천명.' },
  })
  const user = options.appUser === false ? { id: 'bot-user-1' } : { id: 'bot-user-1', properties: { appUserId: APP_USER } }
  const send = async (utterance: string) => {
    const res = fakeRes()
    const req = { body: { bot: { id: 'bot' }, userRequest: { utterance, user, block: { name: '폴백 블록' } } }, get: (name: string) => (name === 'x-umsh-kakao-secret' ? 'test-secret' : undefined) }
    await handler(req as never, res as never)
    return res.body as SkillResponse
  }
  const today = async () => { await send('오늘의 운'); return send(BIRTH) }
  const api = (member: { id: string } | null) => kakaoLinkHandler({
    links, vault, now: () => now,
    member: async (_req, res) => { if (!member) res.status(401).json({ code: 'MEMBER_REQUIRED' }); return member },
  })
  const post = async (token: unknown, member: { id: string } | null = { id: MEMBER }) => {
    const res = fakeRes()
    await api(member)({ body: { token } } as never, res as never)
    return res
  }
  return { store, links, saved, aiCalls, lookups, send, today, post, setNow: (value: Date) => { now = value } }
}

const out = (body: SkillResponse) => JSON.stringify(body.template?.outputs ?? [])
function tokenFrom(body: SkillResponse): string {
  const match = out(body).match(/kakao\/link#t=([A-Za-z0-9_-]+)/)
  assert.ok(match, 'link button')
  return match[1]
}

describe('kakao member link: 방법 1(직접 연결)', () => {
  it('비연결 손님의 결과에는 [보관함에 저장하기] 버튼, 토큰은 해시로만 저장', async () => {
    const { links, saved, today } = setup({ appUser: false })
    const body = await today()
    assert.match(out(body), /보관함에 저장하기/)
    const token = tokenFrom(body)
    assert.equal(token.length, 43)
    assert.ok(links.tokens.has(sha256Hex(token)))
    assert.ok(![...links.tokens.keys()].includes(token))
    assert.doesNotMatch(out(body), /bot-user-1/)
    assert.equal(saved.length, 0)
    const userKey = links.tokens.get(sha256Hex(token))!.userKey
    assert.equal(links.metas.get(userKey)?.lastResult?.kind, 'today')
  })

  it('로그인 회원이 토큰을 쓰면 연결하고 마지막 결과를 보관함에 저장, 재사용은 거절', async () => {
    const { links, saved, today, post } = setup({ appUser: false })
    const token = tokenFrom(await today())
    const first = await post(token)
    assert.equal(first.statusCode, 200)
    assert.deepEqual(first.body, { ok: true, saved: true })
    assert.equal([...links.links.values()][0]?.userId, MEMBER)
    assert.equal([...links.links.values()][0]?.via, 'link')
    assert.equal(saved.length, 1)
    assert.equal(saved[0].result.kind, 'today')
    assert.equal(saved[0].result.birth.year, 1995)
    const again = await post(token)
    assert.equal(again.statusCode, 410)
    assert.equal(saved.length, 1)
  })

  it('10분 지난 토큰은 거절', async () => {
    const { links, today, post, setNow } = setup({ appUser: false })
    const token = tokenFrom(await today())
    setNow(new Date(START.getTime() + 10 * 60 * 1000 + 1))
    const res = await post(token)
    assert.equal(res.statusCode, 410)
    assert.equal(links.links.size, 0)
  })

  it('비회원·비로그인은 거절하고 토큰을 쓰지 않는다', async () => {
    const { links, today, post } = setup({ appUser: false })
    const token = tokenFrom(await today())
    const res = await post(token, null)
    assert.equal(res.statusCode, 401)
    assert.equal(links.links.size, 0)
    assert.equal([...links.tokens.values()][0].usedAt, null)
  })

  it('모양이 틀린 토큰은 회원 확인 전에 거절', async () => {
    const { post } = setup()
    assert.equal((await post('../../etc')).statusCode, 400)
    assert.equal((await post(undefined)).statusCode, 400)
  })
})

describe('kakao member link: 이어진 손님', () => {
  it('결과를 바로 보관함에 남기고 [보관함 열기]를 붙인다', async () => {
    const { links, saved, today, send } = setup({ appUser: false })
    await post1(links)
    const body = await today()
    assert.equal(saved.length, 1)
    assert.equal(saved[0].userId, MEMBER)
    assert.match(out(body), /보관함에도 꽂아 뒀어/)
    assert.match(out(body), /보관함 열기/)
    assert.doesNotMatch(out(body), /보관함에 저장하기/)
    await send('천명사주')
    const saju = await send(BIRTH)
    assert.equal(saved.length, 2)
    assert.equal(saved[1].result.kind, 'cmdg')
    assert.match(out(saju), /보관함 열기/)
  })

  it('"연결 끊기"로 연결을 지우고, 이어진 게 없으면 그렇게 말한다', async () => {
    const { links, send } = setup({ appUser: false })
    await post1(links)
    const cut = await send('연결 끊기')
    assert.match(out(cut), /끊었어/)
    assert.equal(links.links.size, 0)
    const none = await send('연결 해제')
    assert.match(out(none), /이어진 계정이 없어/)
  })
})

async function post1(links: ReturnType<typeof memoryKakaoLinkStore>) {
  await links.link(sha256Hex('kakao:bot-user-1'), MEMBER, 'link')
}

describe('kakao member link: 방법 2(카카오 자동 연결)', () => {
  it('같은 카카오 계정 회원이면 먼저 묻고, [남겨 줘]일 때만 연결·저장', async () => {
    const { links, saved, today, send } = setup()
    const asked = await today()
    assert.match(out(asked), /같은 카카오 계정이 있네/)
    assert.match(JSON.stringify(asked.template?.quickReplies), /남겨 줘/)
    assert.equal(links.links.size, 0)
    assert.equal(saved.length, 0)
    const yes = await send('남겨 줘')
    assert.match(out(yes), /남겨 뒀어/)
    assert.equal([...links.links.values()][0]?.via, 'kakao_auto')
    assert.equal(saved.length, 1)
    assert.equal(saved[0].result.kind, 'today')
  })

  it('[괜찮아]면 거절을 남기고 30일 동안 다시 묻지 않는다', async () => {
    const { links, today, send, setNow } = setup()
    await today()
    const no = await send('괜찮아')
    assert.match(out(no), /이 대화에만 둘게/)
    assert.equal(links.links.size, 0)
    setNow(new Date(START.getTime() + 29 * 24 * 60 * 60 * 1000))
    const later = await today()
    assert.doesNotMatch(out(later), /같은 카카오 계정/)
    assert.match(out(later), /보관함에 저장하기/)
    setNow(new Date(START.getTime() + 31 * 24 * 60 * 60 * 1000))
    assert.match(out(await today()), /같은 카카오 계정/)
  })

  it('회원이 아니면 계정을 만들지 않고 직접 연결 버튼만 보인다', async () => {
    const { links, today } = setup({ members: {} })
    const body = await today()
    assert.doesNotMatch(out(body), /같은 카카오 계정/)
    assert.match(out(body), /보관함에 저장하기/)
    assert.equal(links.links.size, 0)
  })

  it('묻지 않았는데 "괜찮아"라고 하면 보통 대화로 받는다', async () => {
    const { aiCalls, send } = setup()
    await send('괜찮아')
    assert.deepEqual(aiCalls, ['괜찮아'])
  })

  it('appUserId 가 없으면 회원 조회를 하지 않는다', async () => {
    const { lookups, today } = setup({ appUser: false })
    await today()
    assert.deepEqual(lookups, [])
  })

  it('보통 대화에서는 연결 조회를 하지 않고, 로그에는 appUserId 가 왔는지만 남긴다', async () => {
    const { lookups, send } = setup()
    const logs: string[] = []
    const original = console.info
    console.info = (...args: unknown[]) => { logs.push(args.map(String).join(' ')) }
    try { await send('안녕') } finally { console.info = original }
    assert.deepEqual(lookups, [])
    assert.ok(logs.some(line => line.includes('"appUserId":true')))
    assert.ok(logs.every(line => !line.includes(APP_USER) && !line.includes('bot-user-1')))
  })
})

describe('kakao member link: 연결 저장소가 고장 나도 결과는 나간다', () => {
  it('저장소 오류 → 버튼 없이 결과만', async () => {
    const { links, today } = setup({ appUser: false })
    links.linkedMember = async () => { throw new Error('down') }
    const body = await today()
    assert.match(out(body), /오늘의 운/)
    assert.doesNotMatch(out(body), /보관함/)
  })
})
