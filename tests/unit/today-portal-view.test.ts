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
      score: { total: 64, work: 78, money: 62, relationship: 58, caution: 54 },
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

  test(`${portal}: today's saved scores accompany the unchanged paragraphs, zodiac and conclusion`, () => {
    const { markup } = harness()
    assert.match(markup, /1983년생 · 돼지띠/)
    assert.match(markup, /<p>첫 문장입니다\.<\/p><p>두 번째 문장입니다\.<\/p>/)
    assert.match(markup, /오늘의 결론/)
    assert.match(markup, /중요한 한 가지부터 마무리하세요/)
    assert.match(markup, /목\(木\) · 나무처럼 자라고 뻗는 기운/)
    assert.doesNotMatch(markup, /today-saved-link|같은 내용으로 다시 보기|href="\/r\//)
    assert.match(markup, /저장된 이름님/)
    assert.doesNotMatch(markup, /임시 입력님|예측한 결과가 아닙니다/)
    assert.match(markup, /aria-label="오늘의 운 점수 64점, 100점 만점"/)
    for (const [label, value] of [['일', 78], ['돈', 62], ['관계', 58], ['주의점', 54]]) {
      assert.match(markup, new RegExp(`aria-label="${label} 점수 ${value}점, 100점 만점"`))
    }
    assert.equal((markup.match(/class="today-score-badge"/g) || []).length, 4)
    assert.match(markup, /100점 기준 · 오늘의 흐름 지표/)
    assert.match(html, /font: 400 15px\/1\.85 var\(--font-meta\)/)
    assert.match(html, /\.today-result-card\s*\{[^}]*max-height: none;[^}]*overflow: visible;/)
  })

  test(`${portal}: detail scores match their paragraphs and fall back to valid saved category scores`, () => {
    const { markup } = harness(true, { reading: { details: { work: { score: 81, text: '저장된 상세 일 풀이' }, money: { score: null }, relationship: { score: '99' }, caution: { score: Infinity } } } })
    assert.match(markup, /일 점수 81점, 100점 만점/)
    assert.match(markup, /저장된 상세 일 풀이/)
    assert.match(markup, /돈 점수 62점, 100점 만점/)
    assert.match(markup, /관계 점수 58점, 100점 만점/)
    assert.match(markup, /주의점 점수 54점, 100점 만점/)
  })

  test(`${portal}: zero, 100 and saved fractional scores are preserved without rounding`, () => {
    const { markup } = harness(true, { reading: { score: { total: 0, work: 0, money: 100, relationship: 84.5, caution: 54 } } })
    assert.match(markup, /오늘의 운 점수 0점, 100점 만점/)
    assert.match(markup, /일 점수 0점, 100점 만점/)
    assert.match(markup, /돈 점수 100점, 100점 만점/)
    assert.match(markup, /관계 점수 84\.5점, 100점 만점/)
  })

  test(`${portal}: missing or invalid scores never become fabricated defaults or unsafe markup`, () => {
    for (const value of [undefined, null, '', '64', '<img src=x>', false, NaN, Infinity, -1, 101]) {
      const { markup } = harness(true, { reading: { score: { total: value, work: value, money: value, relationship: value, caution: value } } })
      assert.doesNotMatch(markup, /class="today-total-score"|class="today-score-badge"|100점 기준|<img src=x>/)
      assert.match(markup, /오늘의 결론/)
    }
    const { markup } = harness(true, { reading: { score: undefined, details: { work: { score: 70 } } } })
    assert.doesNotMatch(markup, /class="today-total-score"/)
    assert.match(markup, /일 점수 70점, 100점 만점/)
    assert.equal((markup.match(/class="today-score-badge"/g) || []).length, 1)
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

  test(`${portal}: first direct visit is pending until auth and reading finish, not a false failure`, () => {
    const stage = { innerHTML: '' }
    runInNewContext(`${render}\nrenderTodayResult()`, {
      state: { scene: 'todayResult', todayFortune: null }, stage, escapeHtml,
      todayRequestError: '', wantsTodayEntry: () => true,
      document: { readyState: 'complete', getElementById: () => null }, window: {},
    })
    assert.match(stage.innerHTML, /role="status"[^>]*aria-busy="true"/)
    assert.match(stage.innerHTML, /준비하고 있어요/)
    assert.doesNotMatch(stage.innerHTML, /불러오지 못했습니다|다시 불러오기/)
    assert.match(html, /\[data-umsh-service-top\]:not\(:empty\) ~ header\.topbar/)
  })

  test(`${portal}: real request failure stays actionable and safely displays its message`, () => {
    const stage = { innerHTML: '' }
    runInNewContext(`${render}\nrenderTodayResult()`, {
      state: { todayFortune: null }, stage, escapeHtml,
      todayRequestError: '연결 확인 <필요>', wantsTodayEntry: () => true,
      document: { readyState: 'complete', getElementById: () => null }, window: {},
    })
    assert.match(stage.innerHTML, /연결 확인 &lt;필요&gt;/)
    assert.match(stage.innerHTML, /data-action="today-retry"/)
    assert.doesNotMatch(stage.innerHTML, /aria-busy="true"/)
  })

  test(`${portal}: deferred common chrome mounts after DOM readiness while reading remains pending`, () => {
    const stage = { innerHTML: '' }
    let ready: (() => void) | undefined
    let mounts = 0
    const win: { UMSHChrome?: { mount: () => object } } = {}
    runInNewContext(`${render}\nrenderTodayResult()`, {
      state: { scene: 'todayResult', todayFortune: null }, stage, escapeHtml, todayChrome: null,
      todayRequestError: '', wantsTodayEntry: () => true,
      document: { readyState: 'loading', getElementById: () => null, addEventListener: (name: string, callback: () => void) => { assert.equal(name, 'DOMContentLoaded'); ready = callback } },
      window: win,
    })
    assert.equal(mounts, 0)
    assert.ok(ready)
    win.UMSHChrome = { mount: () => { mounts += 1; return { appbar: {}, bottomNav: {} } } }
    ready()
    assert.equal(mounts, 1)
    assert.match(stage.innerHTML, /준비하고 있어요/)
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
