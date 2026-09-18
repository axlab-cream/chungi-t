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
interface FakeElement {
  hidden: boolean
  parentElement: FakeElement | null
  attrs: Map<string, string>
  classList: { add: (name: string) => void; contains: (name: string) => boolean }
  setAttribute: (name: string, value: string) => void
}

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

function fakeElement(parent: FakeElement | null = null): FakeElement {
  const classes = new Set<string>()
  const attrs = new Map<string, string>()
  return {
    hidden: false,
    parentElement: parent,
    attrs,
    classList: { add: (name: string) => classes.add(name), contains: (name: string) => classes.has(name) },
    setAttribute(name: string, value: string) { attrs.set(name, value) },
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
  // 저축운의 `.hidden{display:none!important}` 는 클래스로 가린다. 다른 페이지가 네이티브
  // 속성만 쓸 수도 있어 둘 다 건다 — 여기서는 클래스 쪽이 실제로 켜지는지 본다.
  assert.equal(locked.classList.contains('hidden'), true, '잠금 배너가 안 닫혔다')
  assert.equal(missing.classList.contains('hidden'), true, '누락 배너가 안 닫혔다')
  assert.equal(locked.hidden, true)
  assert.equal(missing.hidden, true)
})

/**
 * 2026-09-18: 결혼궁합 06 페이지는 실측에서 "결혼궁합 / 대분류 확인 / 중분류 확인 / 항목 없음"
 * 네 번째 칩을 진짜 탭처럼 보여 줬다. 그 뷰어의 항목 배열은 설계 시점 목업 id 만 담고 있어
 * 실제 생성 항목 id 와 맞은 적이 없다 — 그래서 모든 실제 고객에게 뜬다. 결혼궁합은 공용
 * `.hidden` CSS 규칙이 아예 없어(페이지도 공용 CSS 도) 네이티브 `hidden` 속성으로만 가려진다.
 */
test('결혼궁합의 access-chip 은 상위 contextbar 째 닫히고, 네이티브 hidden 속성으로도 가려진다', () => {
  const hide = extractHideNativeSeedDetail()
  const bar = fakeElement()
  bar.classList.add('contextbar')
  const chip = fakeElement(bar)
  hide(null, { 'access-chip': chip }, { id: 'live' })
  assert.equal(bar.hidden, true, '결혼궁합은 .hidden 클래스 규칙이 없어 네이티브 속성이 실제로 가린다')
  assert.equal(bar.classList.contains('hidden'), true)
  assert.equal(chip.hidden, false, '칩 하나가 아니라 상위 contextbar 를 닫는다')
})

test('access-chip 이 없는 서비스의 페이지는 건드리지 않는다', () => {
  const hide = extractHideNativeSeedDetail()
  assert.doesNotThrow(() => hide(null, {}, { id: 'live' }))
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

test('결혼궁합 06 페이지에서 access-chip 은 여전히 contextbar 안에 있다', () => {
  const marry = readFileSync(new URL('../../사주/match/marry/06-step-6_1-report-detail/index.html', import.meta.url), 'utf8')
  assert.match(marry, /<div class="contextbar"[^>]*>[\s\S]{0,200}id="access-chip"/, '마크업이 바뀌면 closestByClass 가 못 찾는다')
})
