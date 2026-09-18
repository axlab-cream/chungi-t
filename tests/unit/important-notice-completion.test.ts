import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('../../사주/js/umsh-report-access.js', import.meta.url), 'utf8')

/**
 * 2026-09-18: "완성까지 30~50분" 안내(`ensureImportantNotice`)가 `report.status` 를 보지
 * 않고 매 렌더에서 무조건 붙었다. 21/21·28/28 처럼 이미 다 끝난 리포트를 처음 여는 순간에도
 * 이 문구가 GNB 위 최상단에 실렸다 — 결제하고 완성까지 다 받은 고객에게 "30~50분 더
 * 기다리라"는 문구를 보여준 것이다. 14개 06-1 화면이 이 파일 하나를 공유하므로 넓게 걸렸다.
 */
function extractNoticeFns(): { reportIsComplete: (report: unknown) => boolean; ensureImportantNotice: (host: unknown, report: unknown) => void } {
  const start = source.indexOf('function reportIsComplete')
  const end = source.indexOf('function ensurePdfDock')
  const body = source.slice(start, end)
  assert.ok(body.includes('ensureImportantNotice'), '함수를 찾지 못했다')
  const documentStub = { querySelector: () => notice, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) }
  let notice: any = null
  // eslint-disable-next-line no-new-func
  const factory = new Function('document', 'isDetailPage', 'isPermalink', `${body}\nreturn { reportIsComplete: reportIsComplete, ensureImportantNotice: ensureImportantNotice };`)
  const fns = factory(documentStub, () => true, () => false)
  return {
    reportIsComplete: fns.reportIsComplete,
    ensureImportantNotice: (host: unknown, report: unknown) => fns.ensureImportantNotice(host, report),
  }
}

test('reportIsComplete: status 또는 진행률 어느 쪽으로도 완성을 알아본다', () => {
  const { reportIsComplete } = extractNoticeFns()
  assert.equal(reportIsComplete({ status: 'complete' }), true)
  assert.equal(reportIsComplete({ status: 'generating', progress: { complete: 21, total: 21 } }), true)
  assert.equal(reportIsComplete({ status: 'generating', progress: { complete: 20, total: 21 } }), false)
  assert.equal(reportIsComplete({ status: 'generating' }), false)
  assert.equal(reportIsComplete(undefined), false)
})

test('완성된 리포트를 처음 열 때는 "완성까지 30~50분" 안내를 아예 붙이지 않는다', () => {
  const start = source.indexOf('function reportIsComplete')
  const end = source.indexOf('function ensurePdfDock')
  const body = source.slice(start, end)
  const appended: unknown[] = []
  const anchor = { firstChild: null, insertBefore() { appended.push('inserted') }, appendChild() { appended.push('inserted') }, closest: () => anchor }
  const host = { closest: () => anchor }
  const documentStub = {
    _notice: null as any,
    querySelector(sel: string) { return sel === '[data-umsh-notice]' ? this._notice : null },
    createElement() { return { style: {}, setAttribute() {}, appendChild() {} } },
  }
  // eslint-disable-next-line no-new-func
  const factory = new Function('document', 'isDetailPage', 'isPermalink', `${body}\nreturn ensureImportantNotice;`)
  const ensureImportantNotice = factory(documentStub, () => true, () => false)
  ensureImportantNotice(host, { status: 'complete', progress: { complete: 21, total: 21 } })
  assert.equal(appended.length, 0, '완성본인데 안내를 새로 붙였다')
})

test('생성 중일 때 붙은 안내는 완성되면 화면에서 지운다', () => {
  const start = source.indexOf('function reportIsComplete')
  const end = source.indexOf('function ensurePdfDock')
  const body = source.slice(start, end)
  const removed: unknown[] = []
  const notice = { parentNode: { removeChild: (n: unknown) => removed.push(n) } }
  const documentStub = { querySelector: (sel: string) => (sel === '[data-umsh-notice]' ? notice : null), createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) }
  // eslint-disable-next-line no-new-func
  const factory = new Function('document', 'isDetailPage', 'isPermalink', `${body}\nreturn ensureImportantNotice;`)
  const ensureImportantNotice = factory(documentStub, () => true, () => false)
  ensureImportantNotice({ closest: () => null }, { status: 'complete', progress: { complete: 5, total: 5 } })
  assert.deepEqual(removed, [notice], '완성으로 바뀌었는데 이전 안내가 안 지워졌다')
})

test('두 호출부 모두 report 를 함께 넘긴다', () => {
  // 정의 줄(`function ensureImportantNotice(host, report) {`)은 호출이 아니므로 뺀다.
  const invocations = (source.match(/(?<!function )ensureImportantNotice\([^)]*\);/g) ?? [])
  assert.equal(invocations.length, 2, `호출부 수가 바뀌었다: ${invocations.join(' | ')}`)
  for (const call of invocations) assert.match(call, /,\s*report\)/, `report 인자가 빠졌다: ${call}`)
})
