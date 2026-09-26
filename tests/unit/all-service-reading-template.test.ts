import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

const htmlFiles = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name)
  return entry.isDirectory() ? htmlFiles(path) : entry.name.endsWith('.html') ? [path] : []
})

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
  const inplaceCss = read('사주/css/umsh-verified-inplace.css')

  assert.match(source, /function sectionImageSource\(section, serviceKey\)/)
  assert.doesNotMatch(source, /marry_match: true/, '결혼궁합은 목차마다 한 컷을 보여준다')
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
  assert.match(inplaceCss, /\[data-umsh-slot="sections"\] \.umsh-reading-guide\s*\{/)
  assert.match(inplaceCss, /\.umsh-reading-guide-scroll\s*\{/)
  assert.match(inplaceCss, /\.umsh-reading-guide thead th/)
  assert.match(source, /aria-label="풀이 읽는 순서 표" tabindex="0"/)
})

test('저축운은 요약에 21:9 실사 전용 이미지를 쓰고 16개 해석에 고유 이미지를 연결한다', () => {
  const blocks = JSON.parse(read('사주/data/longform-blocks.json'))
  const service = blocks.services.money_save as { thumbnail: string; summaryImage: string; summaryImageFit?: string; cutA: string; cutB: string; sectionImageMode?: string; sectionImages: string[] }
  const detail = read('사주/money/save/06-step-6_1-report-detail/index.html')
  const reader = read('사주/js/umsh-report-access.js')

  assert.equal(service.sectionImageMode, undefined)
  assert.equal(service.thumbnail, '/assets/umsh-money-card-bg.png')
  assert.equal(service.summaryImage, '/money/save/assets/save/reading-v2/00-money-save-summary-v2.webp')
  assert.equal(service.summaryImageFit, 'wide')
  assert.ok(existsSync(join(root, '사주', service.summaryImage)), `저축운 요약 이미지가 없다: ${service.summaryImage}`)
  assert.equal(service.sectionImages.length, 16)
  assert.equal(new Set(service.sectionImages).size, 16)
  for (const image of service.sectionImages) {
    assert.match(image, /^\/money\/save\/assets\/save\/reading-v2\/.+\.webp$/)
    assert.ok(existsSync(join(root, '사주', image)), `저축운 이미지가 없다: ${image}`)
  }
  assert.doesNotMatch(reader, /money_save: true/)
  assert.match(reader, /config\.summaryImage \|\| config\.thumbnail \|\| config\.cutA/)
  assert.match(detail, /#step-6_1-report\s*\{[^}]*max-height: none;[^}]*overflow: visible;/)
  assert.match(detail, /\.reading-card > summary::after\s*\{[^}]*content: "펼치기 \+";/)
  assert.match(detail, /\.reading-card\[open\] > summary::after\s*\{[^}]*content: "접기 −";/)
  assert.match(detail, /font-size: 15px;[^}]*line-height: 1\.9;/)
  assert.match(detail, /--muted: #45584e;/)
  assert.match(detail, /id="detailContent" data-umsh-legacy-reading-ui/)
  assert.match(detail, /class="bottom-nav"[^>]*data-umsh-legacy-reading-ui/)
})

test('공용 리더의 캐시 쿼리를 쓰는 모든 HTML은 최신 버전으로 동기화한다', () => {
  const versions = htmlFiles(join(root, '사주')).flatMap((path) => {
    const source = readFileSync(path, 'utf8')
    return [...source.matchAll(/\/js\/umsh-report-access\.js\?v=([^"']+)/g)].map((match) => match[1])
  })

  assert.ok(versions.length > 0, '캐시 쿼리를 사용하는 공용 리더 참조가 없다')
  assert.deepEqual([...new Set(versions)], ['20260926-reading-toggle-v3'])
})

test('공용 해석 토글은 서비스별 구형 클릭 핸들러로 전파되지 않고 현재 위치에서 열린다', () => {
  const reader = read('사주/js/umsh-report-access.js')
  const moneySave = read('사주/money/save/06-step-6_1-report-detail/index.html')

  assert.match(reader, /function protectReadingCardInteractions\(root\)/)
  assert.match(reader, /closest\('details\.reading-card > summary'\)/)
  assert.match(reader, /event\.preventDefault\(\)/)
  assert.match(reader, /event\.stopPropagation\(\)/)
  assert.match(reader, /var shouldOpen = !card\.open/)
  assert.match(reader, /setTimeout\(function \(\) \{ card\.open = shouldOpen; \}, 0\)/)
  assert.equal((reader.match(/protectReadingCardInteractions\(/g) || []).length, 3, '함수 정의와 두 공용 렌더 경로에서 적용해야 한다')
  assert.match(moneySave, /closest\("\.related-btn\[data-section\]"\)/)
  assert.doesNotMatch(moneySave, /closest\("\[data-section\]"\)/)
})

test('커플 시그널은 운영 21개 해석마다 고유한 실사 이미지를 쓰고 저장 리포트만 남긴다', () => {
  const blocks = JSON.parse(read('사주/data/longform-blocks.json'))
  const service = blocks.services.couple_signal as { thumbnail: string; cutB: string; sectionImageMode?: string; sectionImages: string[]; summaryImageFit?: string }
  const detail = read('사주/love/signal/06-step-6_1-report-detail/index.html')
  const reader = read('사주/js/umsh-report-access.js')

  assert.equal(service.sectionImageMode, undefined)
  assert.equal(service.summaryImageFit, 'wide')
  assert.equal(service.sectionImages.length, 21)
  assert.equal(new Set(service.sectionImages).size, 21)
  for (const image of service.sectionImages) {
    assert.match(image, /^\/love\/signal\/assets\/signal\/reading-v2\/.+\.webp$/)
    assert.ok(existsSync(join(root, '사주', image)), `커플 시그널 이미지가 없다: ${image}`)
  }
  assert.doesNotMatch(reader, /couple_signal: true/)
  assert.match(detail, /#step-6_1-report\s*\{[^}]*max-height: none;[^}]*overflow: visible;/)
  assert.match(detail, /\.reading-card > summary::after\s*\{[^}]*content: "펼치기 \+";/)
  assert.match(detail, /\.reading-card\[open\] > summary::after\s*\{[^}]*content: "접기 −";/)
  assert.match(detail, /font-size: 15px;[^}]*line-height: 1\.9;/)
  assert.match(detail, /class="contextbar" data-umsh-legacy-reading-ui/)
  assert.match(detail, /class="nav-bar"[^>]*data-umsh-legacy-reading-ui/)
})

test('퇴사운은 운영 20개 해석마다 고유한 실사 이미지를 쓰고 저장 리포트만 남긴다', () => {
  const blocks = JSON.parse(read('사주/data/longform-blocks.json'))
  const service = blocks.services.quit_fortune as { thumbnail: string; cutB: string; sectionImageMode?: string; sectionImages: string[]; summaryImageFit?: string }
  const detail = read('사주/work/quit/06-step-6_1-report-detail/index.html')
  const reader = read('사주/js/umsh-report-access.js')

  assert.equal(service.sectionImageMode, undefined)
  assert.equal(service.summaryImageFit, 'wide')
  assert.equal(service.sectionImages.length, 20)
  assert.equal(new Set(service.sectionImages).size, 20)
  for (const image of service.sectionImages) {
    assert.match(image, /^\/work\/quit\/assets\/quit\/reading-v2\/.+\.webp$/)
    assert.ok(existsSync(join(root, '사주', image)), `퇴사운 이미지가 없다: ${image}`)
  }
  assert.doesNotMatch(reader, /quit_fortune: true/)
  assert.match(reader, /canonical\(serviceKey\) === 'quit_fortune'/)
  assert.match(detail, /#step-6_1-report\s*\{[^}]*max-height: none;[^}]*overflow: visible;/)
  assert.match(detail, /\.reading-card > summary::after\s*\{[^}]*content: "펼치기 \+";/)
  assert.match(detail, /\.reading-card\[open\] > summary::after\s*\{[^}]*content: "접기 −";/)
  assert.match(detail, /#detail-stack\[data-umsh-filled\] ~ \.hero/)
  assert.match(detail, /#detail-stack\[data-umsh-filled\] ~ \.umsh-pdf-dock/)
})

test('커플궁합은 실제 28개 목차마다 고유한 실사 이미지를 쓰고 공용 읽기 화면만 남긴다', () => {
  const blocks = JSON.parse(read('사주/data/longform-blocks.json'))
  const service = blocks.services.match_couple as { thumbnail: string; cutB: string; sectionImageMode?: string; sectionImages: string[] }
  const detail = read('사주/match/couple/06-step-6_1-report-detail/index.html')
  const reader = read('사주/js/umsh-report-access.js')

  assert.equal(service.sectionImageMode, undefined)
  assert.equal(service.sectionImages.length, 28)
  assert.equal(new Set(service.sectionImages).size, 28)
  for (const image of service.sectionImages) {
    assert.match(image, /^\/match\/couple\/assets\/couple\/reading-v2\/.+\.webp$/)
    assert.ok(existsSync(join(root, '사주', image)), `커플궁합 이미지가 없다: ${image}`)
  }
  assert.doesNotMatch(reader, /match_couple: true/)
  assert.match(reader, /couple_match:'match_couple'/)
  assert.match(reader, /canonical\(serviceKey\) === 'match_couple'/)
  assert.match(detail, /#step-6_1-report\s*\{[^}]*max-height: none;[^}]*overflow: visible;/)
  assert.match(detail, /\.reading-card > summary::after\s*\{[^}]*content: "펼치기 \+";/)
  assert.match(detail, /\.reading-card\[open\] > summary::after\s*\{[^}]*content: "접기 −";/)
  assert.match(detail, /#detail-stack\[data-umsh-filled\] ~ #legacy-detail-content/)
})

test('이직운은 요약·하이라이트·10개 목차에 서로 다른 실사 이미지를 표시한다', () => {
  const blocks = JSON.parse(read('사주/data/longform-blocks.json'))
  const service = blocks.services.work_move as { thumbnail: string; cutA: string; cutB: string; sectionImageMode?: string; sectionImages: string[]; summaryImageFit?: string }
  const detail = read('사주/work/move/06-step-6_1-report-detail/index.html')
  const reader = read('사주/js/umsh-report-access.js')

  assert.equal(service.sectionImageMode, undefined)
  assert.equal(service.summaryImageFit, 'wide')
  assert.equal(service.cutA, service.thumbnail)
  assert.equal(service.sectionImages.length, 10)
  assert.equal(new Set([service.thumbnail, service.cutB, ...service.sectionImages]).size, 12)
  for (const image of [service.thumbnail, service.cutB, ...service.sectionImages]) {
    assert.match(image, /^\/work\/move\/assets\/work-move\/reading-v2\/.+\.webp$/)
    assert.ok(existsSync(join(root, '사주', image)), `이직운 이미지가 없다: ${image}`)
  }

  assert.doesNotMatch(reader, /work_move: true/)
  assert.match(reader, /canonical\(serviceKey\) === 'work_move'/)
  assert.match(detail, /#step-6_1-report\s*\{[^}]*max-height: none;[^}]*overflow: visible;/)
  assert.match(detail, /\.reading-card > summary::after\s*\{[^}]*content: "펼치기 \+";/)
  assert.match(detail, /\.reading-card\[open\] > summary::after\s*\{[^}]*content: "접기 −";/)
  assert.match(detail, /#detail-stack\[data-umsh-filled\] ~ #content/)
  assert.match(detail, /#detail-stack\[data-umsh-filled\] ~ \.bottom-input/)
  assert.match(detail, /id="stateNotice"[^>]*data-umsh-legacy-reading-ui/)
  assert.match(detail, /id="evidenceGrid"[^>]*data-umsh-legacy-reading-ui/)
  assert.match(detail, /id="interpretationBlocks"[^>]*data-umsh-legacy-reading-ui/)
  assert.match(detail, /id="actionsList"[^>]*data-umsh-legacy-reading-ui/)
  assert.match(detail, /id="cautionsList"[^>]*data-umsh-legacy-reading-ui/)
  assert.match(detail, /id="relatedNav"[^>]*data-umsh-legacy-reading-ui/)
  assert.doesNotMatch(detail, /전체 목록으로 돌아가기/, '현재 화면이 전체 목록이므로 중복 복귀 버튼을 두지 않는다')
  assert.match(detail, /<!--\s*이직운 저장 리포트에서는 후속 채팅 입력 기능을 노출하지 않는다\./)
  assert.match(detail, /\/\*\s*이직운 저장 리포트의 후속 채팅 입력 기능은 현재 비노출 상태다\./)
})

test('고양이 궁합은 요약·하이라이트·20개 해석에 서로 다른 실사 이미지를 표시한다', () => {
  const blocks = JSON.parse(read('사주/data/longform-blocks.json'))
  const service = blocks.services.cat_compatibility as { thumbnail: string; cutA: string; cutB: string; sectionImageMode?: string; sectionImages: string[]; summaryImageFit?: string }
  const detail = read('사주/match/cat/06-step-6_1-report-detail/index.html')
  const reader = read('사주/js/umsh-report-access.js')
  assert.equal(service.sectionImageMode, undefined)
  assert.equal(service.summaryImageFit, 'wide')
  assert.equal(service.cutA, service.thumbnail)
  assert.equal(service.sectionImages.length, 20)
  assert.equal(new Set([service.thumbnail, service.cutB, ...service.sectionImages]).size, 22)
  for (const image of [service.thumbnail, service.cutB, ...service.sectionImages]) {
    assert.match(image, /^\/match\/cat\/assets\/cat-compatibility\/reading-v2\/.+\.webp$/)
    assert.ok(existsSync(join(root, '사주', image)), `고양이 궁합 이미지가 없다: ${image}`)
  }
  assert.doesNotMatch(reader, /cat_compatibility: true/)
  assert.match(reader, /serverKey === 'cat_compatibility'\) && !longform\.config && !longform\.failed/)
  assert.match(reader, /canonical\(serviceKey\) === 'cat_compatibility' \|\| original/)
  assert.match(detail, /#step-6_1-report\s*\{[^}]*max-height: none;[^}]*overflow: visible;/)
  assert.match(detail, /\.reading-card > summary::after\s*\{\s*content: "펼치기 \+";/)
  assert.match(detail, /\.reading-card\[open\] > summary::after\s*\{\s*content: "접기 −";/)
  assert.match(detail, /#detail-stack\[data-umsh-filled\] ~ #content \{ display: none; \}/)
})

test('결혼궁합은 요약과 24개 해석에 중복 없는 실사 이미지를 쓰고 끝 항목까지 읽을 수 있다', () => {
  const blocks = JSON.parse(read('사주/data/longform-blocks.json'))
  const service = blocks.services.marry_match as { thumbnail: string; cutA: string; cutB: string; sectionImageMode?: string; sectionImages: string[]; summaryImageFit?: string }
  const detail = read('사주/match/marry/06-step-6_1-report-detail/index.html')
  const reader = read('사주/js/umsh-report-access.js')
  const css = read('사주/css/umsh-verified-inplace.css')
  assert.equal(service.sectionImageMode, undefined)
  assert.equal(service.summaryImageFit, 'wide')
  assert.equal(service.sectionImages.length, 24)
  assert.equal(new Set(service.sectionImages).size, 24)
  assert.equal(service.cutA, service.thumbnail)
  assert.ok(!service.sectionImages.includes(service.cutB), '하이라이트 컷을 목차에서 반복하지 않는다')
  for (const image of [service.thumbnail, service.cutB, ...service.sectionImages]) {
    assert.match(image, /^\/match\/marry\/assets\/marry\/reading-v2\/.+\.webp$/)
    assert.ok(existsSync(join(root, '사주', image)), `결혼궁합 이미지가 없다: ${image}`)
  }
  assert.match(reader, /canonical\(serviceKey\) === 'marry_match' \|\| canonical\(serviceKey\) === 'cat_compatibility' \|\| original/)
  assert.match(reader, /\(serverKey === 'marry_match' \|\| serverKey === 'cat_compatibility'\) && !longform\.config && !longform\.failed/)
  assert.match(reader, /renderOwnerEpoch === ownerEpoch/, '설정 로딩 중 계정이 바뀌면 이전 회원의 해석을 표시하지 않는다')
  assert.match(detail, /#step-6_1-report\s*\{[^}]*max-height: none;[^}]*overflow: visible;/)
  assert.match(detail, /\.reading-card > summary::after\s*\{\s*content: "펼치기 \+";/)
  assert.match(detail, /\.reading-card\[open\] > summary::after\s*\{\s*content: "접기 −";/)
  assert.match(detail, /#detail-root\[data-umsh-filled\] \+ #detail-form \{ display: none; \}/)
  assert.match(css, /\.umsh-life-flow h2\s*\{[^}]*color: var\(--text, #fff7f2\)/)
})

test('직장 선택은 요약·21개 목차에 각각 고유한 실사형 이미지를 연결한다', () => {
  const blocks = JSON.parse(read('사주/data/longform-blocks.json'))
  const reader = read('사주/js/umsh-report-access.js')
  const css = read('사주/css/umsh-verified-inplace.css')
  const service = blocks.services.job_choice as { thumbnail?: string; cutA?: string; cutB?: string; summaryImageFit?: string; sectionImages?: string[]; sectionImageMode?: string }
  const images = service.sectionImages ?? []

  assert.equal(service.sectionImageMode, undefined, '직장 선택은 대표 한 장 모드가 아니다')
  assert.equal(service.summaryImageFit, 'wide')
  assert.equal(service.thumbnail, '/work/job-choice/assets/job-choice/reading-v2/00-job-choice-summary-v2.webp')
  assert.equal(service.cutA, service.thumbnail, '설정 폴백에도 이전 일러스트를 남기지 않는다')
  assert.equal(service.cutB, images[0], '하이라이트에도 제작된 실사 이미지를 사용한다')
  assert.equal(images.length, 21)
  assert.equal(new Set(images).size, 21, '21개 목차는 이미지를 반복하지 않는다')
  assert.ok(existsSync(join(root, '사주', service.thumbnail!)))
  for (const image of images) {
    assert.match(image, /^\/work\/job-choice\/assets\/job-choice\/reading-v2\/.+\.webp$/)
    assert.ok(existsSync(join(root, '사주', image)), `직장 선택 목차 이미지가 없다: ${image}`)
  }
  assert.doesNotMatch(reader, /job_choice: true/)
  assert.match(reader, /canonical\(serviceKey\) === 'job_choice' \|\| canonical\(serviceKey\) === 'work_move' \|\| canonical\(serviceKey\) === 'quit_fortune' \|\| canonical\(serviceKey\) === 'match_couple' \|\| canonical\(serviceKey\) === 'marry_match' \|\| canonical\(serviceKey\) === 'cat_compatibility' \|\| original === '\/assets\/hero-mystic\.webp'/, '저장된 이전 이미지도 설정 도착 후 새 목차 이미지로 교체해야 한다')
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
  assert.match(css, /\.umsh-reader-actions \[data-umsh-report-share\]\s*\{[^}]*grid-column: 1;[^}]*grid-row: 1;/)
  assert.match(css, /\.umsh-reader-actions \[data-umsh-pdf\]\s*\{[^}]*grid-column: 2;[^}]*grid-row: 1;/)
  assert.match(css, /\.umsh-reader-actions \[role="status"\]\s*\{[^}]*grid-column: 1 \/ -1;[^}]*grid-row: 2;/)
  assert.doesNotMatch(css, /\.umsh-reader-actions\s*\{\s*grid-template-columns: 1fr;/)
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
  assert.match(source, /class="umsh-service-elements-table"/)
  assert.match(source, /<th scope="col">/)
  assert.doesNotMatch(source, /'<ul>' \+ entries\.map/)
  assert.match(source, /serviceElementsChartHtml\(payload, index\)/)
  assert.match(css, /\.umsh-service-elements/)
  assert.match(css, /\.umsh-service-elements-table/)
})

test('삽입형 상세 19개는 대운 흐름 스타일을 정적으로 먼저 읽어 기본 브라우저 글꼴로 떨어지지 않는다', () => {
  const sajuRoot = join(root, '사주')
  const detailPages = readdirSync(sajuRoot, { recursive: true })
    .filter((entry): entry is string => typeof entry === 'string' && entry.replaceAll('\\', '/').endsWith('06-step-6_1-report-detail/index.html'))
    .map((entry) => join(sajuRoot, entry))
    .filter((path) => readFileSync(path, 'utf8').includes('data-umsh-verified-inplace'))
  const css = read('사주/css/umsh-verified-inplace.css')

  assert.equal(detailPages.length, 19)
  for (const page of detailPages) {
    assert.match(readFileSync(page, 'utf8'), /<link id="umsh-inplace-css" rel="stylesheet" href="\/css\/umsh-verified-inplace\.css\?v=\d{8}-[\w-]+"/)
  }
  assert.match(css, /\[data-umsh-slot="sections"\] > \.umsh-life-flow/)
  assert.match(css, /font: 15px\/1\.85 Pretendard/)
  assert.match(css, /\.umsh-flow-point\.is-current/)
  assert.match(css, /\.umsh-life-flow-timeline/)
})
