import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

test('all configured reading services carry an identity-specific first-toggle guide', () => {
  const blocks = JSON.parse(read('사주/data/longform-blocks.json'))
  const services = Object.values(blocks.services) as Array<{ title?: string; guide?: unknown[]; thumbnail?: string; cutA?: string; cutB?: string }>
  assert.equal(services.length, 19, '유료 해석 서비스 19개의 공통 계약이 필요하다')
  for (const service of services) {
    assert.ok(service.title)
    assert.ok(service.thumbnail?.startsWith('/'), `${service.title} 메인 썸네일 연결이 없다`)
    assert.ok(service.cutA?.startsWith('/'), `${service.title} 요약 이미지가 없다`)
    assert.ok(service.cutB?.startsWith('/'), `${service.title} 첫 토글 이미지가 없다`)
    assert.equal(service.guide?.length, 3, `${service.title} 읽기 표가 3줄이 아니다`)
    for (const image of [service.thumbnail, service.cutA, service.cutB]) {
      assert.ok(['사주/사주', '사주'].some((root) => existsSync(join(root, image!))), `${service.title} 공개 이미지 파일이 없다: ${image}`)
    }
  }
})

test('shared reader applies the configured image, guide, and actual fortune graph without fake scores', () => {
  const source = read('사주/js/umsh-report-access.js')
  const css = read('사주/css/umsh-verified-reader.css')

  assert.match(source, /function sectionImageSource\(section, serviceKey\)/)
  assert.match(source, /var SUMMARY_ONLY_SERVICE_KEYS = \{ marry_match: true/)
  assert.match(source, /function usesSummaryOnlyImages\(serviceKey, config\)/)
  assert.match(source, /config\.sectionImageMode === 'summary-only'/)
  assert.match(source, /function configuredSectionImage\(config, order\)/)
  assert.match(source, /order % 2 === 1/)
  assert.match(source, /String\(config\.cutB/)
  assert.match(source, /String\(config\.cutA/)
  assert.match(source, /config\.thumbnail \|\| config\.cutB/)
  assert.match(source, /function serviceReadingGuideHtml\(section, payload, index\)/)
  assert.match(source, /config\.guide/)
  assert.match(source, /function serviceCardBody\(section, payload, body, index\)/)
  assert.match(source, /function refreshServiceSectionImages\(serviceKey\)/)
  assert.match(source, /var canShowCurve = Boolean\(currentSegment && payload && payload\.analysis\)/)
  assert.match(source, /인생의 성공·수입을 예측한 점수는 아닙니다/)

  assert.match(css, /\.umsh-reading-guide\s*\{/)
  assert.match(css, /\.umsh-reading-guide-scroll\s*\{ overflow-x: auto/)
  assert.match(css, /\.umsh-reading-guide:focus-within/)
})

test('seven completed services render one representative thumbnail without repeating section or highlight images', () => {
  const blocks = JSON.parse(read('사주/data/longform-blocks.json'))
  const names = ['marry_match', 'match_couple', 'couple_signal', 'work_move', 'quit_fortune', 'cat_compatibility', 'money_save']
  assert.equal(names.length, 7)
  for (const name of names) {
    const service = blocks.services[name] as { sectionImageMode?: string; thumbnail?: string }
    assert.equal(service.sectionImageMode, 'summary-only', `${name}은 대표 이미지 한 장만 사용한다`)
    assert.ok(service.thumbnail?.startsWith('/'), `${name} 대표 이미지가 없다`)
  }
  assert.match(read('사주/js/umsh-report-access.js'), /visual\.setAttribute\('hidden', ''\)/)
})

test('직장 선택은 요약·21개 목차에 각각 고유한 실사형 이미지를 연결한다', () => {
  const blocks = JSON.parse(read('사주/data/longform-blocks.json'))
  const reader = read('사주/js/umsh-report-access.js')
  const css = read('사주/css/umsh-verified-inplace.css')
  const service = blocks.services.job_choice as { thumbnail?: string; summaryImageFit?: string; sectionImages?: string[]; sectionImageMode?: string }
  const images = service.sectionImages ?? []

  assert.equal(service.sectionImageMode, undefined, '직장 선택은 대표 한 장 모드가 아니다')
  assert.equal(service.summaryImageFit, 'wide')
  assert.equal(service.thumbnail, '/work/job-choice/assets/job-choice/reading-v2/00-job-choice-summary-v2.webp')
  assert.equal(images.length, 21)
  assert.equal(new Set(images).size, 21, '21개 목차는 이미지를 반복하지 않는다')
  assert.ok(existsSync(join(root, '사주', service.thumbnail!)))
  for (const image of images) {
    assert.match(image, /^\/work\/job-choice\/assets\/job-choice\/reading-v2\/.+\.webp$/)
    assert.ok(existsSync(join(root, '사주', image)), `직장 선택 목차 이미지가 없다: ${image}`)
  }
  assert.doesNotMatch(reader, /job_choice: true/)
  assert.match(css, /aspect-ratio: 3 \/ 2/)
  assert.match(css, /\.reading-card\.is-ready\[open\] > summary::after/)
  assert.match(css, /content: "접기 −"/)
})

test('올해 연애운은 모든 목차에 고유한 실사형 장면을 연결한다', () => {
  const blocks = JSON.parse(read('사주/data/longform-blocks.json'))
  const images = blocks.services.love_this_year.sectionImages as string[]
  assert.equal(images.length, 10)
  assert.equal(new Set(images).size, 10, '목차별 이미지를 반복하지 않는다')
  for (const image of images) {
    assert.match(image, /^\/love\/this-year\/assets\/thisyear\/report-sections\/.+\.png$/)
    assert.ok(existsSync(join('사주', image)), `올해 연애운 목차 이미지가 없다: ${image}`)
  }
})

test('올해 연애운 상세의 대표 썸네일은 실사형 표지 자산을 사용한다', () => {
  const detail = read('사주/love/this-year/06-step-6_1-report-detail/index.html')
  const image = '사주/love/this-year/assets/thisyear/report-sections/00-year-love-report-hero-v1.png'

  assert.ok(existsSync(join(root, image)))
  assert.match(detail, /src="\.\.\/assets\/thisyear\/report-sections\/00-year-love-report-hero-v1\.png"/)
  assert.match(detail, /els\.hero\.src = "\.\.\/assets\/thisyear\/report-sections\/00-year-love-report-hero-v1\.png"/)
})

test('올해 연애운 상세은 공통 GNB·하단 내비게이션을 유지하고, 실제 리포트에서는 공통 공유·PDF 도구만 쓴다', () => {
  const detail = read('사주/love/this-year/06-step-6_1-report-detail/index.html')
  const reader = read('사주/js/umsh-report-access.js')
  const css = read('사주/css/umsh-verified-inplace.css')

  assert.match(detail, /data-umsh-chrome/)
  assert.match(detail, /class="contextbar" data-umsh-legacy-reading-ui/)
  assert.match(detail, /#step-6_1-report \[data-umsh-legacy-reading-ui\] \{ display: none !important; \}/)
  assert.match(reader, /function ensureInPlaceReaderActions\(host, payload\)/)
  assert.match(reader, /링크 공유하기/)
  assert.match(reader, /data-umsh-pdf>PDF 저장/)
  assert.match(reader, /if \(!ensureInPlaceReaderActions\(host, payload\)\) ensurePdfDock\(host\)/)
  assert.match(css, /\.umsh-reader-actions\s*\{/)
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/)
})

test('올해 연애운 상세은 공통 리더 액션 외의 이전·다음, 말 가이드, 연관 항목을 중복 노출하지 않는다', () => {
  const detail = read('사주/love/this-year/06-step-6_1-report-detail/index.html')

  assert.doesNotMatch(detail, /aria-label="상세 항목 이동"/)
  assert.doesNotMatch(detail, /id="talk-card"/)
  assert.doesNotMatch(detail, /id="related-list"/)
  assert.doesNotMatch(detail, /id="prev-link"/)
  assert.doesNotMatch(detail, /id="next-link"/)
  assert.doesNotMatch(detail, /id="chat-form"/)
  assert.doesNotMatch(detail, /id="chat-message"/)
})

test('올해 연애운 한눈에 보기에는 잘림 없는 가로형 전용 실사 이미지를 사용한다', () => {
  const blocks = JSON.parse(read('사주/data/longform-blocks.json'))
  const reader = read('사주/js/umsh-report-access.js')
  const css = read('사주/css/umsh-longform.css')
  const service = blocks.services.love_this_year

  assert.equal(service.thumbnail, '/love/this-year/assets/thisyear/report-sections/00-year-love-summary-wide-v1.png')
  assert.equal(service.summaryImageFit, 'wide')
  assert.ok(existsSync(join(root, '사주', service.thumbnail)))
  assert.match(reader, /summaryImageFit === 'wide'/)
  assert.match(css, /\.umsh-summary-figure\.is-wide-summary/)
  assert.match(css, /object-fit: contain/)
})

test('올해 연애운 첫 하이라이트는 도화 주제의 독립 실사 배너를 사용한다', () => {
  const blocks = JSON.parse(read('사주/data/longform-blocks.json'))
  const banner = blocks.services.love_this_year.cutB as string
  assert.equal(banner, '/love/this-year/assets/thisyear/report-sections/11-dohwa-highlight-cafe-v1.png')
  assert.ok(existsSync(join(root, '사주', banner)))
  assert.ok(!blocks.services.love_this_year.sectionImages.includes(banner), '토글 이미지와 하이라이트 배너를 반복하지 않는다')
})

test('reader keeps source prose and shows a textual accordion state', () => {
  const source = read('사주/js/umsh-report-access.js')
  const css = read('사주/css/umsh-verified-reader.css')
  assert.match(source, /paragraphs\.slice\(0, -1\)/)
  assert.match(source, /readingBlock\('evidence'/)
  assert.match(css, /content: '펼치기 \+'/)
  assert.match(css, /content: '접기 −'/)
})

test('every standard service can show only verified five-element counts in its first accordion', () => {
  const source = read('사주/js/umsh-report-access.js')
  const css = read('사주/css/umsh-verified-reader.css')
  assert.match(source, /function serviceElementsChartHtml\(payload, index\)/)
  assert.match(source, /if \(index !== 0\) return ''/)
  assert.match(source, /Number\.isFinite\(value\)/)
  assert.match(source, /analysis\.elements/)
  assert.match(source, /사주 오행 계산값/)
  assert.match(source, /성공률이나 사건 예측 점수가 아닙니다/)
  assert.match(source, /serviceElementsChartHtml\(payload, index\)/)
  assert.match(css, /\.umsh-service-elements/)
})
