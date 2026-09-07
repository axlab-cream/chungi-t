import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext, Script } from 'node:vm'

const portals = ['cmdg', '사주']
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)

function functionSource(html: string, name: string, nextName: string) {
  const start = html.indexOf(`      function ${name}(`)
  const end = html.indexOf(`      function ${nextName}(`, start)
  assert.ok(start >= 0 && end > start)
  return html.slice(start, end)
}

for (const portal of portals) {
  const html = readFileSync(new URL(`../../사주/${portal}/index.html`, import.meta.url), 'utf8')
  const render = functionSource(html, 'renderTodayResult', 'loveDohwaInfoFromPillars')
  const format = functionSource(html, 'formatInterpretationHtml', 'renderReportTocMarkup')
  function harness(savedLayout = true, fortune?: Record<string, unknown>) {
    const stage = { innerHTML: '' }
    const chrome = { appbar: { hidden: true }, bottomNav: { hidden: true } }
    let mounts = 0
    const reading = {
      title: '오늘의 방향', summary: '첫 문장입니다.\n\n두 번째 문장입니다.',
      work: '일의 기준입니다.', money: '돈의 기준입니다.', relationship: '관계의 기준입니다.', caution: '확인할 조건입니다.',
      action: '중요한 한 가지부터 마무리하세요. 마친 뒤에는 남은 시간을 편안하게 쓰세요.',
      score: { total: 99 },
      zodiac: { birthYear: 1983, animal: '돼지', title: '이어갈 기회', text: '차근차근 시작하세요. 잘되는 방법을 이어가세요.' },
      ...fortune?.reading as object,
    }
    const state = { name: '임시 입력', todayFortune: { resultId: 'saved-uuid', date: { label: '합성 날짜' }, profile: { name: '저장된 이름' }, today: { pillarKo: '갑인', element: '목(木)' }, ...fortune, reading } }
    runInNewContext(`${format}\n${render}\nrenderTodayResult()`, {
      state, stage, escapeHtml, todayChrome: null,
      document: { getElementById: () => savedLayout ? {} : null },
      window: { UMSHChrome: { mount: () => { mounts += 1; return chrome } } },
    })
    return { markup: stage.innerHTML, mounts, chrome }
  }

  test(`${portal}: all inline scripts parse`, () => {
    for (const script of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new Script(script[1])
  })

  test(`${portal}: today's paragraphs, zodiac and conclusion are readable without invented scores`, () => {
    const { markup } = harness()
    assert.match(markup, /1983년생 · 돼지띠/)
    assert.match(markup, /<p>첫 문장입니다\.<\/p><p>두 번째 문장입니다\.<\/p>/)
    assert.match(markup, /오늘의 결론/)
    assert.match(markup, /중요한 한 가지부터 마무리하세요/)
    assert.match(markup, /목\(木\) · 나무처럼 자라고 뻗는 기운/)
    assert.match(markup, /href="\/r\/saved-uuid"/)
    assert.match(markup, /저장된 이름님/)
    assert.doesNotMatch(markup, /임시 입력님|99점|\/100|종합 점수|예측한 결과가 아닙니다/)
    assert.match(html, /font: 400 15px\/1\.85 var\(--font-meta\)/)
    assert.match(html, /\.today-result-card\s*\{[^}]*max-height: none;[^}]*overflow: visible;/)
  })

  test(`${portal}: saved reader owns shared chrome and legacy fallback reuses common mount`, () => {
    assert.equal(harness(true).mounts, 0)
    const fallback = harness(false)
    assert.equal(fallback.mounts, 1)
    assert.equal(fallback.chrome.appbar.hidden, false)
    assert.equal(fallback.chrome.bottomNav.hidden, false)
    assert.match(html, /src="\/js\/umsh-chrome\.js" defer/)
    assert.doesNotMatch(html, /src="\/js\/service-shell\.js"/)
    assert.match(html, /bottom: calc\(var\(--umsh-chrome-bottom-h, 74px\) \+ env\(safe-area-inset-bottom\)\)/)
  })

  test(`${portal}: escaped legacy reading renders without inventing a zodiac`, () => {
    const { markup } = harness(true, { reading: { zodiac: undefined, work: '<img src=x onerror=alert(1)>', details: {} } })
    assert.match(markup, /&lt;img src=x onerror=alert\(1\)&gt;/)
    assert.doesNotMatch(markup, /<img src=x|class="today-zodiac-card"/)
  })

  test(`${portal}: direct today result entry and its saved ID survive scene URL sync`, () => {
    assert.match(html, /todayEntryActive = initialAuthEntry === "today" \|\| location\.hash === "#todayResult"/)
    assert.match(html, /body: requestedTodayId \? JSON\.stringify\(\{ reportId: requestedTodayId \}\) : undefined/)
    const sync = functionSource(html, 'syncSceneUrl', 'getReportSections')
    const location = new URL('https://umsh.kr/cmdg/?reportId=old-id&entry=today#loading')
    let next = ''
    runInNewContext(`${sync}\nsyncSceneUrl('todayResult')`, {
      URL, location, state: { todayFortune: { resultId: 'saved-uuid' } }, history: { replaceState: (_a: unknown, _b: unknown, url: string) => { next = url } },
    })
    assert.equal(next, '/cmdg/?reportId=saved-uuid#todayResult')
  })
}
