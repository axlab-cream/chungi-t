import { strict as assert } from 'node:assert'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const accessSource = readFileSync(join(root, '사주', 'js', 'umsh-report-access.js'), 'utf8')
const inplaceCss = readFileSync(join(root, '사주', 'css', 'umsh-verified-inplace.css'), 'utf8')
const serverSource = readFileSync(join(root, 'src', 'server', 'app.ts'), 'utf8')
const saveReportHtml = readFileSync(join(root, '사주', 'money', 'save', '04-step-4-report', 'index.html'), 'utf8')
const moveReportHtml = readFileSync(join(root, '사주', 'work', 'move', '04-step-4-report', 'index.html'), 'utf8')
const moveInputHtml = readFileSync(join(root, '사주', 'work', 'move', '02-step-2-saju-input', 'index.html'), 'utf8')
const moveServiceSource = readFileSync(join(root, '사주', 'js', 'work-move-service.js'), 'utf8')
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

test('직장 선택 티저는 실제 해석 1·2와 이미지·표·차트를 읽기 순서대로 렌더한다', () => {
  const api = loadAccess('/work/job-choice/04-step-4-report/index.html')
  const teaserSections = [
    { id: 'company-fit', order: 1, imageSrc: '/assets/one.webp', interpretation: '**첫 기준**입니다.\n\n| 조건 | 값 |\n| --- | --- |\n| 역할 | 기획 |' },
    { id: 'daily-fit', order: 2, imageSrc: '/assets/two.webp', interpretation: '**둘째 기준**입니다.', storytelling: { chartPoints: [{ label: '왕복', value: 80 }] } },
  ]
  const accepted = api.acceptAnalyze({
    previewOnly: true,
    preview: { headline: '제안의 속을 봅니다', summary: '**실제 산출물**부터 확인합니다.' },
    teaserSections,
    toc: [
      ...teaserSections,
      ...Array.from({ length: 8 }, (_, index) => ({ id: `locked-${index + 3}`, classification: `잠긴 해석 ${index + 3}` })),
    ],
  })

  assert.equal(accepted.payload.teaserSections.length, 2)
  assert.equal(accepted.payload.teaserSections[0].imageSrc, '/assets/one.webp')
  assert.match(accessSource, /function renderJobChoiceTeaserSections\(/)
  assert.match(accessSource, /renderSectionImage\(section, 'job_choice'\)/)
  assert.match(accessSource, /richText\(bodyText/)
  assert.match(accessSource, /renderStoryChart\(story\.chartPoints/)
  assert.match(accessSource, /jobChoiceCommuteChart\(bodyText, index\)/)
  assert.match(accessSource, /왕복 ' \+ commute\[1\] \+ '분, 이 회사가 내 하루에서 가져가는 시간/)
  assert.match(accessSource, /전면 출근이라면/)
  assert.match(accessSource, /전면 출근이라는/)
    assert.match(accessSource, /참고합니다\\\.를 참고하되/)
    assert.match(accessSource, /해석을 연결합니다\\\.\\s\*를 참고하되/)
  assert.match(accessSource, /job-teaser-final-cta/)
  assert.match(accessSource, /function renderJobChoiceLockedToc\(/)
  assert.match(accessSource, /slice\(2, 10\)/)
  assert.match(accessSource, /<section class="job-teaser-toc" aria-label="나머지 잠긴 목차">/)
  assert.doesNotMatch(accessSource, /<details class="job-teaser-toc">/)
  assert.doesNotMatch(accessSource, /무료 해석의 이야기 순서/)
  assert.match(accessSource, /inlineMarkdown\(escapeHtml\(preview\.summary/)
  assert.match(inplaceCss, /\.job-teaser-reading/)
  assert.match(inplaceCss, /\.job-teaser-toc/)
  assert.match(inplaceCss, /\[data-umsh-slot="preview"\] \.reading-table/)
})

test('퇴사운 티저는 저장 해석 1·2와 실제 시각화 뒤에 항상 펼친 3~10 잠금 목차를 렌더한다', () => {
  const api = loadAccess('/work/quit/04-step-4-report/index.html')
  const teaserSections = [
    { id: 'flow-1', order: 1, imageSrc: '/work/quit/assets/quit/04-teaser.png', interpretation: '[주요 포인트] 실제 첫 본문', storytelling: { tableMd: '| 항목 | 입력값 |\n| --- | --- |\n| 이유 | 업무 |' } },
    { id: 'flow-2', order: 2, imageSrc: '/work/quit/assets/quit/03-thread-tension.png', interpretation: '[주요 포인트] 실제 둘째 본문', storytelling: { chartPoints: [{ label: '나무', value: 2, note: '서버 계산값' }] } },
  ]
  const accepted = api.acceptAnalyze({
    previewOnly: true,
    serviceKey: 'quit_fortune',
    preview: { headline: '그만두고 싶은 이유부터 읽었습니다.' },
    teaserSections,
    toc: [...teaserSections, ...Array.from({ length: 8 }, (_, index) => ({ id: `locked-${index + 3}`, classification: `실제 목차 ${index + 3}`, category: '퇴사운' }))],
  })

  assert.equal(accepted.payload.teaserSections.length, 2)
  assert.match(accessSource, /function renderQuitFortuneTeaserSections\(/)
  assert.match(accessSource, /renderSectionImage\(section, 'quit_fortune'\)/)
  assert.match(accessSource, /renderMarkdownTable\(story\.tableMd/)
  assert.match(accessSource, /renderStoryChart\(story\.chartPoints/)
  assert.match(inplaceCss, /\.job-teaser-reading\.quit-teaser-reading \.story-image \{ aspect-ratio: 4 \/ 5; \}/)
  assert.match(inplaceCss, /\.job-teaser-reading\.quit-teaser-reading \.story-image img \{[^}]*height: 100%;[^}]*object-fit: cover;[^}]*object-position: center top;/)
  assert.match(accessSource, /normalizeQuitFortuneTeaserCopy/)
  assert.match(accessSource, /data-exact-source-chars/)
  assert.match(accessSource, /renderLockedTeaserToc\(payload\.toc\)/)
  assert.match(accessSource, /slice\(2, 10\)/)
  assert.doesNotMatch(accessSource, /무료 해석의 이야기 순서/)
})

test('저축운 티저는 저장 해석 1·2와 입력 표·계산 차트 뒤에 펼친 실제 3~N 잠금 목차를 한 번만 렌더한다', () => {
  const api = loadAccess('/money/save/04-step-4-report/index.html')
  const teaserSections = [
    { id: 'income-salary-stable', order: 1, imageSrc: '/money/save/assets/save/reading-v2/01-stable-salary.webp', interpretation: '[주요 포인트] 월급과 저축 순서를 읽은 본문', storytelling: { tableMd: '| 확인한 정보 | 입력 내용 |\n| --- | --- |\n| 수입 | 월급 |' } },
    { id: 'income-peer-share', order: 2, imageSrc: '/money/save/assets/save/reading-v2/02-shared-income-spending.webp', interpretation: '[확인할 장면] 공동 지출 장면을 읽은 본문', storytelling: { chartPoints: [{ label: '나무', value: 2, note: '서버 계산값' }] } },
  ]
  const accepted = api.acceptAnalyze({
    previewOnly: true,
    serviceKey: 'money_save',
    preview: { headline: '돈이 남지 않는 장면부터 읽었습니다.' },
    teaserSections,
    toc: [...teaserSections, ...Array.from({ length: 14 }, (_, index) => ({ id: `locked-${index + 3}`, classification: `실제 목차 ${index + 3}`, category: '저축운' }))],
    freeSearch: { used: 1, limit: 5, allowed: true },
  })

  assert.equal(accepted.payload.teaserSections.length, 2)
  assert.match(serverSource, /serviceKey === 'money_save'/)
  assert.match(accessSource, /function renderMoneySaveTeaserSections\(/)
  assert.match(accessSource, /renderSectionImage\(section, 'money_save'\)/)
  assert.match(accessSource, /renderMarkdownTable\(story\.tableMd/)
  assert.match(accessSource, /renderStoryChart\(story\.chartPoints/)
  assert.match(accessSource, /renderMoneyFlow\(story\.flowSteps/)
  assert.match(accessSource, /data-label=/)
  assert.match(accessSource, /renderLockedTeaserToc\(payload\.toc, \{ all: true, collapsible: true, open: true \}\)/)
  assert.match(accessSource, /<details class="job-teaser-toc job-teaser-toc-collapsible"/)
  assert.match(accessSource, /\(opened \? ' open' : ''\)/)
  assert.match(accessSource, /무료 결과 조회 ' \+ used \+ '\/5회 사용/)
  assert.match(accessSource, /class="job-teaser-status-row"/)
  assert.match(inplaceCss, /\.job-teaser-status-row \{ display: flex;/)
  assert.match(accessSource, /function showPreviewLimit\(payload\)/)
  assert.match(accessSource, /무료 결과 5회를 모두 확인했습니다/)
  assert.match(inplaceCss, /\.money-teaser-reading \.story-image \{ aspect-ratio: 3 \/ 2; \}/)
  assert.match(inplaceCss, /\.money-teaser-reading \.story-table,[\s\S]*?\.move-teaser-reading \.story-table \{ width: 100%; table-layout: fixed; \}/)
  assert.match(inplaceCss, /\.money-teaser-reading \.story-table td,[\s\S]*?\.move-teaser-reading \.story-table td \{[\s\S]*?white-space: normal;[\s\S]*?overflow-wrap: anywhere;/)
  assert.match(saveReportHtml, /id="umsh-preview-host"[^>]*data-umsh-slot="preview"/)
  assert.doesNotMatch(saveReportHtml, /class="price-pill">9,900원/)
  assert.doesNotMatch(saveReportHtml, />로그인하고 전체 보기 \(9,900원\)</)
})

test('이직운 티저는 개인화 1·2번과 닫힌 실제 잠금 목차, 단일 CTA를 렌더한다', () => {
  assert.match(serverSource, /workMoveTeaserPreview/)
  assert.match(serverSource, /workMoveTeaserSection/)
  assert.match(serverSource, /serviceKey === WORK_MOVE_SERVICE_KEY/)
  assert.match(accessSource, /function renderWorkMoveTeaserSections\(/)
  assert.match(accessSource, /renderSectionImage\(section, 'work_move'\)/)
  assert.match(accessSource, /renderMarkdownTable\(story\.tableMd/)
  assert.match(accessSource, /renderStoryChart\(story\.chartPoints/)
  assert.match(accessSource, /renderMoneyFlow\(story\.flowSteps/)
  assert.match(accessSource, /renderLockedTeaserToc\(payload\.toc, \{ all: true, collapsible: true, open: false, normalizeText: normalizeWorkMoveTocText \}\)/)
  assert.match(accessSource, /function normalizeWorkMoveTocText\(value\)/)
  assert.match(accessSource, /성과를 보상으로 연결하는 힘을 바탕으로 본 직무 적합성/)
  assert.match(accessSource, /직무 적합성과 일하는 방식/)
  assert.match(accessSource, /현금 버퍼\/g, '비상 생활비'/)
  assert.match(accessSource, /브레이크\/g, '멈춰 볼 신호'/)
  assert.match(accessSource, /class="job-teaser-status-row"/)
  assert.match(accessSource, /previewCta\(payload\)/)
  assert.match(moveReportHtml, /id="umsh-preview-host"[^>]*data-umsh-slot="preview"/)
  assert.match(moveReportHtml, /umsh-verified-inplace\.css\?v=20260928-move-teaser-v1/)
  assert.match(inplaceCss, /\.move-teaser-reading/)
  assert.match(inplaceCss, /\.move-teaser-reading \.story-table/)
  assert.match(inplaceCss, /overflow-wrap: anywhere/)
  assert.doesNotMatch(accessSource, /무료 해석의 이야기 순서/)
})

test('이직운 입력은 03 공통 로딩을 보인 뒤 04 티저로 이동한다', () => {
  assert.match(moveServiceSource, /function showAnalysisLoading\(/)
  assert.match(moveServiceSource, /data-umsh-step', '03-loading'/)
  assert.match(moveServiceSource, /preview: true/)
  assert.match(moveServiceSource, /location\.assign\(teaserUrl\(payload\.reportId\)\)/)
  assert.match(moveInputHtml, /\.work-move-analysis-loading/)
  assert.match(moveInputHtml, /@media \(prefers-reduced-motion: reduce\)/)
})

test('미리보기 목차 toc는 유료 본문 없이도 목록으로 받는다', () => {
  const api = loadAccess('/money/save/05-step-5-chat/chat.html')
  const accepted = api.acceptAnalyze({
    previewOnly: true,
    preview: { headline: '새는 자리' },
    toc: [
      { id: 'leak-1', category: '돈이 새는 패턴', classification: '관계 정산' },
      { id: 'in-1', category: '돈이 들어오는 방식', classification: '수입 입구' },
    ],
  })
  assert.equal(accepted.report.sections.length, 2)
  assert.equal(accepted.report.sections[0].classification, '관계 정산')
  assert.equal(accepted.previewOnly, true)
})

test('권한이 있으면 티저 CTA가 결제 대신 목차로 간다', () => {
  const api = loadAccess('/money/save/04-step-4-report/index.html')
  const accepted = api.acceptAnalyze({
    previewOnly: true,
    entitled: true,
    unlockReason: 'admin',
    reportId: 'save-admin-1',
    preview: { headline: '새는 자리', summary: '관계 정산에서 먼저 막힙니다.' },
    toc: [{ id: 'in-1', category: '돈이 들어오는 방식' }],
  })
  assert.equal(accepted.entitled, true)
  assert.equal(api.isEntitled(accepted), true)
  assert.equal(accepted.report, undefined)
  const cta = api.previewCta({ entitled: true, unlockReason: 'admin', reportId: 'save-admin-1' })
  assert.equal(cta.label, '전체 목차 열기')
  assert.match(cta.href, /05-step-5-chat/)
  assert.doesNotMatch(cta.href, /\/payment/)
})

test('미결제 티저 CTA는 결제 주소로 간다', () => {
  const api = loadAccess('/money/save/04-step-4-report/index.html')
  const accepted = api.acceptAnalyze({
    previewOnly: true,
    entitled: false,
    preview: { headline: '새는 자리' },
    paymentUrl: '/payment?product=money_save',
  })
  assert.equal(api.isEntitled(accepted), false)
  const cta = api.previewCta({ paymentUrl: '/payment?product=money_save' })
  assert.equal(cta.label, '전체 목차 열기')
  assert.equal(cta.href, '/payment?product=money_save')
})

test('무료 공개 1·2번 본문은 결제 권한으로 오인하지 않고 전 서비스 공통 결제 주소를 쓴다', () => {
  const api = loadAccess('/money/save/04-step-4-report/index.html')
  const payload = {
    previewOnly: true,
    entitled: false,
    reportId: 'save-free-1',
    teaserSections: [
      { id: 'free-1', interpretation: '무료 공개 본문 1' },
      { id: 'free-2', interpretation: '무료 공개 본문 2' },
    ],
    paymentUrl: '/payment?product=money_save&reportId=save-free-1',
  }
  assert.equal(api.isEntitled(payload), false)
  const cta = api.previewCta(payload)
  assert.equal(cta.href, '/payment?product=money_save&reportId=save-free-1')
  assert.equal(cta.label, '전체 목차 열기')
})

test('isPaid 플래그만 있어도 유료 열람으로 본다', () => {
  const api = loadAccess('/work/quit/04-step-4-report/index.html')
  assert.equal(api.hasPaidReading({ isPaid: true, sections: [] }), true)
  assert.equal(api.hasPaidReading({ sections: [{ id: 'a' }] }), false)
})

test('04는 toc 골격으로 티저 본문을 대체하지 않는다', () => {
  const api = loadAccess('/money/save/04-step-4-report/index.html')
  const accepted = api.acceptAnalyze({
    previewOnly: true,
    preview: { headline: '새는 자리', summary: '관계 정산에서 먼저 막힙니다.' },
    toc: [
      { id: 'in-1', category: '돈이 들어오는 방식' },
      { id: 'leak-1', category: '돈이 새는 패턴' },
      { id: 'save-1', category: '저축이 안 되는 이유' },
    ],
  })
  assert.equal(accepted.report, undefined)
  assert.equal(accepted.toc.length, 3)
  assert.equal(accepted.preview.summary, '관계 정산에서 먼저 막힙니다.')
  assert.equal(api.hasPaidReading?.({ sections: accepted.toc }), false)
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
      assert.match(source, /isEntitled/, `${name}: 권한 CTA 분기가 없다`)
      continue
    }
    assert.match(source, /hasPaidReading/, `${name}: 빈 목차로 티저를 덮는지 가드가 없다`)
    if (!['lucky-service.js', 'pass-angle-service.js'].includes(name)) {
      assert.match(source, /isEntitled/, `${name}: 권한 CTA 분기가 없다`)
    }
    assert.doesNotMatch(
      source,
      /if \(!report\?\.sections\?\.length\) return \{ reason: 'error' \}/,
      `${name}: 빈 섹션을 곧바로 실패로 본다`,
    )
  }
})

test('공개 티저 서비스는 세션을 기다렸다가 로그인 실패를 캐시하지 않는다', () => {
  for (const name of TEASER_SERVICES) {
    const source = readFileSync(join(jsRoot, name), 'utf8')
    assert.match(source, /bindServiceSession/, `${name}: 세션 대기가 없다`)
    if (name === 'pass-angle-service.js' || name === 'work-move-service.js') continue
    assert.match(source, /reportPromise = null/, `${name}: 로그인 실패를 캐시한다`)
  }
})

test('저축 티저 결론 칸은 로그인 안내문을 해석처럼 쓰지 않는다', () => {
  const source = readFileSync(join(jsRoot, 'save-service.js'), 'utf8')
  assert.match(source, /입력한 사주로 계산하고 있습니다/)
  assert.match(source, /watchSignedIn/)
  assert.match(source, /로그인·결제 상태는 결론 칸에 쓰지 않는다/)
  const miss = source.slice(source.indexOf("if (!outcome.report) {"))
  const loginBranch = miss.slice(
    miss.indexOf("if (reason === 'login') {"),
    miss.indexOf('} else {'),
  )
  assert.match(loginBranch, /watchSignedIn/)
  assert.doesNotMatch(loginBranch, /GATE_COPY/)
})

test('공유 접근기는 04 결론 칸을 미리보기 슬롯으로 본다', () => {
  assert.match(accessSource, /\[data-one-line-answer\]/)
  assert.match(accessSource, /\[data-teaser-headline\]/)
  assert.match(accessSource, /\[data-teaser-summary\]/)
  assert.match(accessSource, /function hasPaidReading\(/)
  assert.match(accessSource, /function isEntitled\(/)
  assert.match(accessSource, /05·06에 preview를 붙이면/)
  assert.match(accessSource, /04 티저는 동결 preview만 쓴다/)
})

test('공개 서비스 05·06은 in-place 이고 세션 스크립트 캐시를 깬다', () => {
  const open = [
    'money/save',
    'match/couple',
    'match/cat',
    'love/this-year',
    'work/job-choice',
    'love/signal',
    'work/quit',
    'match/marry',
    'work/move',
  ]
  for (const rel of open) {
    for (const page of [
      join(root, '사주', rel, '05-step-5-chat', 'chat.html'),
      join(root, '사주', rel, '06-step-6_1-report-detail', 'index.html'),
    ]) {
      const html = readFileSync(page, 'utf8')
      assert.match(html, /data-umsh-verified-inplace/, `${page}: in-place 옵트인이 없다`)
      assert.match(html, /umsh-auth-session\.js\?v=live-20260916t|umsh-report-access\.js\?v=live-20260916t/, `${page}: 세션 스크립트 캐시가 그대로다`)
    }
  }
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
