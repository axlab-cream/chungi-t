import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const source = readFileSync('사주/js/umsh-reviews.js', 'utf8')
function load() {
  const ctx: Record<string, unknown> = {}
  vm.createContext(ctx); vm.runInContext(source, ctx)
  return (ctx as { UMSHReviews: { listMarkup(data: unknown, shown?: number): string; mountWriter?: unknown } }).UMSHReviews
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
  // 처음 5개만 보이고, 더 있으면 '후기 더 보기'가 붙는다. 한 번 누르면 5개 더.
  const ten = { visible: true, total: 10, items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(item) }
  const first = ui.listMarkup(ten)
  assert.equal((first.match(/umsh-rv-item/g) || []).length, 5)
  assert.match(first, /후기 더 보기/)
  const second = ui.listMarkup(ten, 10)
  assert.equal((second.match(/umsh-rv-item/g) || []).length, 10)
  assert.doesNotMatch(second, /후기 더 보기/)
  assert.doesNotMatch(ui.listMarkup({ visible: true, total: 5, items: [1, 2, 3, 4, 5].map(item) }), /후기 더 보기/)
})

test('천명사주 teaser mounts the list below the price card; no review writer is shipped (2026-10-15 decision)', () => {
  const page = readFileSync('사주/사주/index.html', 'utf8')
  assert.match(page, /<script src="\/js\/umsh-reviews\.js\?v=\d+\w*"><\/script>/)
  assert.match(page, /if \(window\.UMSHReviews\) mountCmdgReviewList\(\);/)
  assert.match(page, /\[data-sample-section="package"\]/)
  const reader = readFileSync('사주/js/umsh-report-access.js', 'utf8')
  assert.doesNotMatch(reader, /umsh-reviews|mountCmdgReviewWriter/)
  assert.equal(load().mountWriter, undefined)
})
