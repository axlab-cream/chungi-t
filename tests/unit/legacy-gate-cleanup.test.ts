import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('../../사주/js/umsh-report-access.js', import.meta.url), 'utf8')

/**
 * 2026-09-18: 저축운 06 페이지는 자기만의 옛 한 칸씩 넘기는 뷰어(#lockedState·#missingState)를
 * 따로 갖고 있다. 그 뷰어는 페이지 로드 시점에 `hasVerifiedEntitlement()` 를 딱 한 번 동기로
 * 검사하는데, 공용 검증은 비동기라 그 시점에 아직 안 끝난 적이 있었다. 그러면 "권한 확인이
 * 필요합니다" 배너가 열린 채로 굳고, 다시 닫는 코드가 없어 영구히 남는다 — 완성된 해석
 * 본문 바로 위에 "권한이 필요하다"는 문구가 뜬 채 실측됐다(리포트 f19bf550…, 16/16 완성).
 *
 * 공용 리딩 뷰가 실제로 마운트됐다는 것 자체가 검증이 끝났다는 뜻이므로, 그 자리에서
 * 옛 뷰어의 상태 배너도 같이 닫는다.
 */
function extractHideNativeSeedDetail(): (native: unknown, gates: Record<string, unknown>, liveHost: unknown) => void {
  const start = source.indexOf('var LEGACY_GATE_IDS')
  const end = source.indexOf('function allowDesignMockReading')
  const body = source.slice(start, end)
  assert.ok(body.includes('LEGACY_GATE_IDS'), '함수를 찾지 못했다')
  const documentStub = (native: unknown, gates: Record<string, unknown>) => ({
    getElementById(id: string) { return id === 'detailContent' ? native : (gates[id] ?? null) },
  })
  // eslint-disable-next-line no-new-func
  const factory = new Function('document', `${body}\nreturn hideNativeSeedDetail;`)
  return (native, gates, liveHost) => factory(documentStub(native, gates))(liveHost)
}

function fakeElement() {
  const classes = new Set<string>()
  return {
    hidden: false,
    attrs: new Map<string, string>(),
    classList: { add: (name: string) => classes.add(name), contains: (name: string) => classes.has(name) },
    setAttribute(name: string, value: string) { this.attrs.set(name, value) },
  }
}

test('공용 리딩 뷰가 열리면 옛 잠금·누락 배너도 함께 닫는다', () => {
  const hide = extractHideNativeSeedDetail()
  const native = fakeElement()
  const locked = fakeElement()
  const missing = fakeElement()
  const liveHost = { id: 'live' }
  hide(native, { lockedState: locked, missingState: missing }, liveHost)
  assert.equal(native.hidden, true)
  assert.equal(native.attrs.get('data-umsh-seed-hidden'), '')
  assert.equal(locked.classList.contains('hidden'), true, '잠금 배너가 안 닫혔다')
  assert.equal(missing.classList.contains('hidden'), true, '누락 배너가 안 닫혔다')
})

test('그 배너가 없는 서비스 페이지에서는 조용히 지나간다', () => {
  const hide = extractHideNativeSeedDetail()
  const native = fakeElement()
  assert.doesNotThrow(() => hide(native, {}, { id: 'live' }))
})

test('실 라이브 호스트 자신은 닫지 않는다', () => {
  const hide = extractHideNativeSeedDetail()
  const locked = fakeElement()
  // liveHost 가 곧 lockedState 인 경우는 없지만, 자기 자신을 닫는 회귀를 막아 둔다.
  hide(null, { lockedState: locked }, locked)
  assert.equal(locked.classList.contains('hidden'), false)
})

test('저축운 06 페이지의 옛 뷰어 id 가 여전히 이 서비스에만 있다', () => {
  const money = readFileSync(new URL('../../사주/money/save/06-step-6_1-report-detail/index.html', import.meta.url), 'utf8')
  assert.match(money, /id="lockedState"/)
  assert.match(money, /id="missingState"/)
})
