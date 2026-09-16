import { strict as assert } from 'node:assert'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const accessSource = readFileSync(join(root, '사주', 'js', 'umsh-report-access.js'), 'utf8')
const jsRoot = join(root, '사주', 'js')

const TEASER_SERVICES = [
  'save-service.js',
  'couple-service.js',
  'cat-service.js',
  'thisyear-service.js',
  'lucky-service.js',
  'signal-service.js',
  'jobchoice-service.js',
  'quit-service.js',
  'marry-service.js',
  'pass-angle-service.js',
  'work-move-service.js',
]

function loadAccess(path: string) {
  const context: any = {
    location: new URL(path, 'https://umsh.kr'),
    document: {
      readyState: 'loading',
      documentElement: { setAttribute() {}, removeAttribute() {}, hasAttribute() { return false } },
      head: { appendChild() {}, children: [] },
      body: { children: [], appendChild() {} },
      addEventListener() {},
      querySelectorAll() { return [] },
      querySelector() { return null },
      getElementById() { return null },
      createElement() { return { id: '', setAttribute() {}, style: { cssText: '' }, appendChild() {} } },
    },
    fetch: async () => new Response('{}'),
    URL,
    URLSearchParams,
    Set,
    console,
    history: { replaceState() {} },
    sessionStorage: { getItem() { return null }, setItem() {}, removeItem() {} },
    addEventListener() {},
  }
  context.window = context
  runInNewContext(accessSource, context)
  return context.UMSHReportAccess
}

test('previewOnly 응답은 유료 섹션 없이도 티저로 받는다', () => {
  const api = loadAccess('/money/save/04-step-4-report/index.html')
  const accepted = api.acceptAnalyze({
    previewOnly: true,
    preview: { headline: '새는 자리', summary: '관계 정산에서 먼저 막힙니다.' },
    paymentUrl: '/payment?product=money_save',
  })
  assert.equal(accepted.preview.headline, '새는 자리')
  assert.equal(accepted.report, undefined)
  assert.equal(accepted.previewOnly, true)
})

test('빈 섹션만 있고 미리보기가 없으면 리포트로 받지 않는다', () => {
  const api = loadAccess('/money/save/04-step-4-report/index.html')
  assert.equal(api.acceptAnalyze({ report: { sections: [] } }), null)
  assert.equal(api.acceptAnalyze({}), null)
})

test('유료 섹션이 있으면 미리보기와 함께 리포트도 남긴다', () => {
  const api = loadAccess('/money/save/04-step-4-report/index.html')
  const accepted = api.acceptAnalyze({
    preview: { headline: '방향' },
    report: { sections: [{ id: 'a', interpretation: '본문' }] },
  })
  assert.equal(accepted.report.sections.length, 1)
  assert.equal(accepted.preview.headline, '방향')
})

test('공개 티저 서비스는 previewOnly를 계산 실패로 덮지 않는다', () => {
  for (const name of TEASER_SERVICES) {
    const source = readFileSync(join(jsRoot, name), 'utf8')
    assert.match(source, /acceptAnalyze/, `${name}: previewOnly 수락이 없다`)
    if (name === 'pass-angle-service.js') {
      assert.match(source, /lastPreview/, `${name}: 미리보기 바인딩이 없다`)
      continue
    }
    if (name === 'work-move-service.js') {
      assert.match(source, /readPreview\(/, `${name}: 미리보기 읽기가 없다`)
      continue
    }
    assert.match(source, /outcome\.preview && !outcome\.report/, `${name}: 티저 성공 분기가 없다`)
    assert.doesNotMatch(
      source,
      /if \(!report\?\.sections\?\.length\) return \{ reason: 'error' \}/,
      `${name}: 빈 섹션을 곧바로 실패로 본다`,
    )
  }
})

test('공유 접근기는 04 결론 칸을 미리보기 슬롯으로 본다', () => {
  assert.match(accessSource, /\[data-one-line-answer\]/)
  assert.match(accessSource, /function acceptAnalyze\(/)
  assert.match(accessSource, /function paintTeaserPreview\(/)
  assert.match(accessSource, /04-step-4-report/)
})

test('04 티저 HTML은 전부 in-place 옵트인이다', () => {
  const pages: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'assets' || entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const child = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === '04-step-4-report') {
          pages.push(join(child, 'index.html'))
          continue
        }
        walk(child)
      }
    }
  }
  walk(join(root, '사주'))
  assert.ok(pages.length >= 14, `04 페이지가 부족하다: ${pages.length}`)
  for (const page of pages) {
    const html = readFileSync(page, 'utf8')
    assert.match(html, /data-umsh-verified-inplace/, `${page}: in-place 옵트인이 없다`)
  }
})
