import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

const ROOT = fileURLToPath(new URL('../../사주', import.meta.url))
const source = readFileSync(join(ROOT, 'js/umsh-analytics.js'), 'utf8')

/**
 * 2026-09-18: 고객 화면 135개 가운데 측정 태그가 붙은 곳은 홈 한 곳뿐이었다. 입력·결과·결제·
 * 보관함이 통째로 측정되지 않아 유입 뒤의 여정이 비어 있었다. 화면마다 스니펫을 붙이면 새 화면이
 * 생길 때마다 빠지므로 공용 파일 한 곳에서만 싣는다.
 */
/** 서비스에 쓰이지 않는 파일. 추출 잔재·내부 키트·결제 테스트 페이지. */
const NOT_CUSTOMER_FACING = new Set([
  'payment/test.html',
  'place/home/01-step-1-story/index.external-assets.html',
  'ui-kit/index.html',
  '사주/extracted_decoded.html',
])

function customerPages(dir = ROOT, prefix = ''): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const rel = prefix ? `${prefix}/${entry}` : entry
    if (statSync(full).isDirectory()) {
      if (entry === 'assets') continue
      found.push(...customerPages(full, rel))
    } else if (entry.endsWith('.html') && !NOT_CUSTOMER_FACING.has(rel)) {
      found.push(rel)
    }
  }
  return found
}

test('모든 고객 화면이 공용 측정 태그를 싣는다', () => {
  const missing = customerPages().filter((rel) => !readFileSync(join(ROOT, rel), 'utf8').includes('umsh-analytics.js'))
  assert.deepEqual(missing, [], `태그가 빠진 화면: ${missing.join(', ')}`)
})

test('측정 태그는 공용 파일 한 곳에서만 실린다', () => {
  // 화면마다 스니펫을 심으면 새 화면이 생길 때 빠지고, 측정 ID 가 갈린다.
  const inline = customerPages().filter((rel) => readFileSync(join(ROOT, rel), 'utf8').includes('googletagmanager.com/gtag'))
  assert.deepEqual(inline, [], `화면에 직접 심은 스니펫이 남아 있다: ${inline.join(', ')}`)
})

/**
 * 리포트와 결제 주소에는 reportId·orderId 가 붙는다. reportId 는 특정 고객의 사주 해석에
 * 1:1 로 연결되는 값이라 분석 도구로 넘길 성격이 아니다. 경로만 보내고 식별자는 뗀다.
 */
function runTag(href: string, referrer = '') {
  const url = new URL(href)
  const scripts: Array<{ src?: string; async?: boolean }> = []
  const listeners: Record<string, () => void> = {}
  const context: Record<string, unknown> = {
    location: { origin: url.origin, pathname: url.pathname, href },
    navigator: {},
    document: {
      referrer,
      createElement: () => ({} as Record<string, unknown>),
      head: { appendChild(node: { src?: string }) { scripts.push(node) } },
      documentElement: {},
    },
    addEventListener: (event: string, listener: () => void) => { listeners[event] = listener },
  }
  context.window = context
  runInNewContext(source, context)
  const layer = (context.dataLayer ?? []) as Array<IArguments>
  const config = [...layer].map((item) => [...item]).find((item) => item[0] === 'config') as
    | [string, string, Record<string, string>]
    | undefined
  return { config, scripts, layer, listeners }
}

test('주소의 식별자는 떼고 경로만 보낸다', () => {
  const { config } = runTag('https://umsh.kr/work/quit/06-step-6_1-report-detail/index.html?section=flow&reportId=abc-123#step-6_1-report')
  assert.ok(config, 'config 호출이 없다')
  assert.equal(config[1], 'G-QVQZSPWK6M')
  assert.equal(config[2].page_location, 'https://umsh.kr/work/quit/06-step-6_1-report-detail/index.html')
  assert.equal(config[2].page_path, '/work/quit/06-step-6_1-report-detail/index.html')
  assert.ok(!JSON.stringify(config[2]).includes('abc-123'), '식별자가 전송값에 남아 있다')
})

test('유입 주소(referrer)의 식별자도 뗀다', () => {
  const { config } = runTag('https://umsh.kr/vault', 'https://umsh.kr/match/cat/06-step-6_1-report-detail/index.html?reportId=secret-9')
  assert.ok(config)
  assert.equal(config[2].page_referrer, 'https://umsh.kr/match/cat/06-step-6_1-report-detail/index.html')
  assert.ok(!config[2].page_referrer.includes('secret-9'))
})

test('각 페이지 이탈은 식별자 없는 page_exit 이벤트로 한 번만 전송한다', () => {
  const { layer, listeners } = runTag('https://umsh.kr/today/free?reportId=private-123')
  assert.ok(listeners.pagehide, 'pagehide 이탈 처리기가 없다')
  listeners.pagehide()
  listeners.pagehide()
  const exits = [...layer].map((item) => [...item]).filter((item) => item[0] === 'event' && item[1] === 'page_exit') as Array<[string, string, Record<string, string>]>
  assert.equal(exits.length, 1)
  assert.equal(exits[0][2].page_path, '/today/free')
  assert.ok(!JSON.stringify(exits[0]).includes('private-123'), '이탈 이벤트에 식별자가 남아 있다')
})

test('추적을 끈 브라우저에서는 아무것도 싣지 않는다', () => {
  const url = new URL('https://umsh.kr/vault')
  const scripts: unknown[] = []
  const context: Record<string, unknown> = {
    location: { origin: url.origin, pathname: url.pathname },
    navigator: { doNotTrack: '1' },
    document: { referrer: '', createElement: () => ({}), head: { appendChild(node: unknown) { scripts.push(node) } }, documentElement: {} },
  }
  context.window = context
  runInNewContext(source, context)
  assert.equal(scripts.length, 0, '추적 거부 설정인데 태그를 실었다')
  assert.equal(context.dataLayer, undefined)
})

test('한 화면에서 두 번 실리지 않는다', () => {
  const url = new URL('https://umsh.kr/vault')
  const scripts: unknown[] = []
  const context: Record<string, unknown> = {
    location: { origin: url.origin, pathname: url.pathname },
    navigator: {},
    document: { referrer: '', createElement: () => ({}), head: { appendChild(node: unknown) { scripts.push(node) } }, documentElement: {} },
  }
  context.window = context
  runInNewContext(source, context)
  runInNewContext(source, context)
  assert.equal(scripts.length, 1)
})
