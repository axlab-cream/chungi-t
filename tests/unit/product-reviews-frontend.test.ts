import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const source = readFileSync('사주/js/umsh-reviews.js', 'utf8')
function load() {
  const ctx: Record<string, unknown> = {}
  vm.createContext(ctx); vm.runInContext(source, ctx)
  return (ctx as { UMSHReviews: { listMarkup(data: unknown, shown?: number): string; writerMarkup(state: unknown): string } }).UMSHReviews
}
const item = (i: number) => ({ id: String(i), name: '박**', ilju: '을해일주', product: '천명사주', date: '2026.10.15', body: `소비 습관까지 딱 맞춰서 놀랐어요 ${i}`, verified: true })

test('list renders only when the server marks it visible, and escapes customer text', () => {
  const ui = load()
  assert.equal(ui.listMarkup({ visible: false, total: 0, items: [] }), '')
  assert.equal(ui.listMarkup(null), '')
  const html = ui.listMarkup({ visible: true, total: 7, items: [1, 2, 3, 4, 5].map(item).concat([{ ...item(6), body: '<img src=x onerror=alert(1)> 정말 잘 맞았어요 진짜로요' }]) }, 10)
  assert.match(html, /다녀간 손님들의 말/)
  assert.match(html, /손님 7명이 남긴 말/)
  assert.match(html, /구매 확인/)
  assert.match(html, /을해일주 · 천명사주 · 2026\.10\.15/)
  assert.doesNotMatch(html, /<img src=x/)
  assert.match(html, /&lt;img/)
  // 별점은 보이지 않는다(2026-10-15 결정).
  assert.doesNotMatch(html, /★|별점/)
  assert.equal((ui.listMarkup({ visible: true, total: 5, items: [1, 2, 3, 4, 5].map(item) }).match(/umsh-rv-item/g) || []).length, 3)
})

test('writer shows for eligible buyers only, mentions the reward only when offered', () => {
  const ui = load()
  assert.equal(ui.writerMarkup({ eligible: false }), '')
  const form = ui.writerMarkup({ eligible: true, reviewed: false, preview: { name: '박**', ilju: '을해일주' }, rewardOffered: false, draft: '' })
  assert.match(form, /이번 풀이, 어땠어\?/)
  assert.match(form, /‘박\*\* · 을해일주’로 보여/)
  assert.match(form, /disabled/)
  assert.doesNotMatch(form, /할인권/)
  assert.match(ui.writerMarkup({ eligible: true, rewardOffered: true, draft: '' }), /남겨주면 할인권 하나 줄게/)
  const done = ui.writerMarkup({ eligible: true, done: true, review: { name: '박**', ilju: '을해일주', body: '정말 잘 맞았어요 고마워요 진짜로' }, reward: { title: '연애운 15% 할인권', expiresAt: '2026-10-30T14:59:00.000Z' } })
  assert.match(done, /장부에 남겼어/)
  assert.match(done, /연애운 15% 할인권 \(2026\.10\.30까지\)/)
})

test('천명사주 teaser mounts the list below the price card and the paid reader mounts the writer', () => {
  const page = readFileSync('사주/사주/index.html', 'utf8')
  assert.match(page, /<script src="\/js\/umsh-reviews\.js\?v=\d+\w*"><\/script>/)
  assert.match(page, /mountCmdgReviewList\(\);/)
  assert.match(page, /\[data-sample-section="package"\]/)
  const reader = readFileSync('사주/js/umsh-report-access.js', 'utf8')
  assert.match(reader, /mountCmdgReviewWriter\(payload, epoch\);/)
  assert.match(reader, /\/js\/umsh-reviews\.js\?v=/)
})
