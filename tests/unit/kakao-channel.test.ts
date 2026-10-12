import { test } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { KakaoChannelError, adminKakaoChannelRouter, createMemoryKakaoStore, kakaoPasteText, parseKakaoMessage, parsePartnerCenterUrl } from '../../src/kakao/channel-messages.js'

const code = (fn: () => unknown) => { try { fn(); return 'ok' } catch (error) { return (error as KakaoChannelError).code } }

test('channel message input: body limit, https-only links, button needs both parts', () => {
  const ok = parseKakaoMessage({ title: '10월 안내', body: '오늘의 운세\r\n확인하세요', imageUrl: 'https://umsh.kr/a.png', buttonLabel: '보러 가기', buttonUrl: 'https://umsh.kr/' })
  assert.equal(ok.body, '오늘의 운세\n확인하세요')
  assert.equal(ok.isAd, true, '기본은 광고성 — 표기를 빠뜨리는 쪽보다 붙이는 쪽이 안전하다')
  assert.equal(code(() => parseKakaoMessage({ title: 't', body: 'x'.repeat(1001) })), 'KAKAO_BODY_TOO_LONG')
  assert.equal(code(() => parseKakaoMessage({ title: 't', body: 'b', imageUrl: 'http://x.y/a.png' })), 'KAKAO_IMAGE_INVALID')
  assert.equal(code(() => parseKakaoMessage({ title: 't', body: 'b', buttonLabel: '가기' })), 'KAKAO_BUTTON_INVALID')
  assert.equal(code(() => parseKakaoMessage({ title: 't', body: 'b', buttonLabel: '열다섯글자가넘는버튼이름입니다', buttonUrl: 'https://umsh.kr' })), 'KAKAO_BUTTON_INVALID')
})

test('paste text carries the (광고) label once, and only for ads', () => {
  assert.equal(kakaoPasteText({ body: '이벤트', isAd: true }), '(광고) 이벤트')
  assert.equal(kakaoPasteText({ body: '(광고) 이벤트', isAd: true }), '(광고) 이벤트')
  assert.equal(kakaoPasteText({ body: '점검 안내', isAd: false }), '점검 안내')
})

test('partner center link must stay on kakao.com', () => {
  assert.equal(parsePartnerCenterUrl(''), null)
  assert.equal(parsePartnerCenterUrl('https://business.kakao.com/_abcd/messages'), 'https://business.kakao.com/_abcd/messages')
  for (const bad of ['http://business.kakao.com/', 'https://kakao.com.evil.example/', 'https://evil.example/kakao.com']) {
    assert.equal(code(() => parsePartnerCenterUrl(bad)), 'KAKAO_SETTINGS_URL_INVALID', bad)
  }
})

test('admin routes: write needs content:publish, open → copy text, mark sent with count', async () => {
  const store = createMemoryKakaoStore()
  const app = express(); app.use(express.json())
  app.use('/k', adminKakaoChannelRouter({
    staff: async (req, res, scope) => { if (!String(req.header('x-scopes') ?? '').split(',').includes(scope)) { res.sendStatus(403); return null } return { email: 'ops@example.invalid' } },
    store: () => store,
  }))
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>((resolve) => server.once('listening', resolve))
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  const post = (path: string, body: unknown, scopes = 'content:publish') => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-scopes': scopes }, body: JSON.stringify(body) })
  try {
    assert.equal((await post('/k', { title: 't', body: 'b' }, 'content:read')).status, 403)
    const created = await (await post('/k', { title: '10월', body: '오늘의 운세', isAd: true })).json()
    assert.equal(created.pasteText, '(광고) 오늘의 운세')
    const opened = await (await post(`/k/${created.item.id}/opened`, {})).json()
    assert.equal(opened.item.status, 'opened')
    assert.equal((await post(`/k/${created.item.id}/sent`, { sentCount: -1 })).status, 422)
    const sent = await (await post(`/k/${created.item.id}/sent`, { sentCount: 1234 })).json()
    assert.deepEqual([sent.item.status, sent.item.sentCount, sent.item.sentBy], ['sent', 1234, 'ops@example.invalid'])
    assert.equal((await (await post(`/k/${created.item.id}/opened`, {})).json()).item.status, 'sent', '이미 보낸 건을 다시 열어도 상태를 되돌리지 않는다')
    assert.equal((await post('/k/settings', { partnerCenterUrl: 'https://evil.example/' })).status, 422)
    const listed = await (await fetch(`${base}/k`, { headers: { 'x-scopes': 'content:read' } })).json()
    assert.equal(listed.items.length, 1)
  } finally { server.close() }
})
