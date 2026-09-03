// Asserts every integration point of the 나, 올해 연애 가능? (love_this_year) service is wired.
//
// Same guard as check-signal.mjs. 이 서비스는 05/06 페이지가 자기 JSON 블록을 파싱해서
// 렌더하므로, 목차가 잘리거나 store 스크립트가 페이지 스크립트보다 뒤로 밀리면 화면은
// 200으로 뜨면서 샘플 문구만 그대로 남는다. 그래서 개수와 스크립트 순서를 같이 본다.
//
// Usage: node scripts/check-thisyear.mjs

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SERVICE_DIR = '사주/love/this-year'
const ASSET_DIR = `${SERVICE_DIR}/assets/thisyear`

/** The 목차 shape the 05/06 pages are built against. */
const EXPECTED_GROUPS = 8
const EXPECTED_ITEMS = 48

/** [file, needle, human-readable description] */
const CONTRACTS = [
  ['src/server/app.ts', "app.get(['/love/this-year',", '진입 라우트'],
  ['src/server/app.ts', "'/love/this-year/input'", '02 입력 라우트'],
  ['src/server/app.ts', "'/love/this-year/report'", '04 티저 라우트'],
  ['src/server/app.ts', "'/love/this-year/chat'", '05 목차 라우트'],
  ['src/server/app.ts', "'/love/this-year/detail'", '06 상세 라우트'],
  ['src/server/app.ts', "app.post('/api/love/this-year/analyze'", '분석 API'],
  ['src/payment/catalog.ts', 'love_this_year: {', '결제 카탈로그 등록'],
  ['src/love/thisyear-service.ts', "export const LOVE_THISYEAR_SERVICE_KEY = 'love_this_year'", '서비스 키 상수'],
  ['src/love/thisyear-service.ts', 'export const THISYEAR_ASSET_BASE', '아트워크 경로 상수'],
  ['src/love/thisyear-service.ts', 'export const LOVE_THISYEAR_TOC', '목차 export'],
  ['src/love/thisyear-service.ts', 'const GROUP_LENS', '대분류별 해석 렌즈'],
  ['src/love/thisyear-service.ts', 'function ragLineFrom', 'RAG 근거 추출'],
  ['src/love/thisyear-service.ts', 'function dohwaLine', '도화 계산'],
  ['src/love/thisyear-service.ts', 'function partnerStarLine', '배우자성 계산'],
  ['사주/js/thisyear-service.js', "'/api/love/this-year/analyze'", '프론트 리포트 호출'],
  ['사주/js/thisyear-service.js', 'function enhanceSajuInput', '저장된 사주 재사용'],
  ['사주/js/thisyear-service.js', 'function mountChrome', '공통 GNB 마운트'],
  ['사주/js/thisyear-report-store.js', 'REPORT_INDEX_DATA', '05 목차 데이터 주입'],
  ['사주/js/thisyear-report-store.js', 'DETAIL_DATA', '06 상세 데이터 주입'],
  ['사주/portal.html', 'href="/love/this-year"', '포털 카드 연결'],
]

/** [page, 공용 크롬과 서비스 스크립트를 붙여야 하는지, JSON 블록을 store가 갈아끼우는지] */
const PAGES = [
  ['01-step-1-story/index.html', true, false],
  ['02-step-2-saju-input/index.html', true, false],
  ['04-step-4-report/index.html', true, false],
  ['05-step-5-chat/chat.html', true, true],
  ['05-step-5-chat/index.html', false, false], // chat.html로 보내는 리다이렉트 스텁
  ['06-step-6_1-report-detail/index.html', true, true],
]

const failures = []
const read = (rel) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), 'utf-8') : null)

for (const [file, needle, label] of CONTRACTS) {
  const body = read(file)
  if (body === null) failures.push(`${file} 파일 없음 (${label})`)
  else if (!body.includes(needle)) failures.push(`${file} :: ${label} 누락`)
}

// 목차가 잘리면 페이지는 정상으로 뜨고 항목만 사라지므로, 개수와 아트워크를 함께 본다.
const serviceBody = read('src/love/thisyear-service.ts')
if (serviceBody !== null) {
  const start = serviceBody.indexOf('export const LOVE_THISYEAR_TOC')
  const toc = start === -1 ? '' : serviceBody.slice(start, serviceBody.indexOf('] as const', start))
  const groups = (toc.match(/^ {4}id: '/gm) ?? []).length
  const images = [...toc.matchAll(/image: '([^']+)'/g)].map((match) => match[1])
  const items = (toc.match(/^ {6}\{ id: '/gm) ?? []).length

  if (groups !== EXPECTED_GROUPS) failures.push(`목차 대분류 ${groups}개 (기대 ${EXPECTED_GROUPS}개)`)
  if (items !== EXPECTED_ITEMS) failures.push(`목차 중분류 ${items}개 (기대 ${EXPECTED_ITEMS}개)`)

  for (const image of new Set(images)) {
    if (!existsSync(join(ROOT, ASSET_DIR, `05-${image}.webp`))) failures.push(`${ASSET_DIR}/05-${image}.webp 아트워크 없음`)
  }
}

for (const [page, needsChrome, needsStore] of PAGES) {
  const rel = `${SERVICE_DIR}/${page}`
  const body = read(rel)
  if (body === null) {
    failures.push(`${rel} 페이지 없음`)
    continue
  }
  if (needsChrome) {
    if (!body.includes('/js/thisyear-service.js')) failures.push(`${rel} :: 서비스 스크립트 미연결`)
    if (!body.includes('/js/umsh-chrome.js')) failures.push(`${rel} :: 공통 GNB 미연결`)
    if (!body.includes('data-umsh-chrome')) failures.push(`${rel} :: chrome 호스트 속성 누락`)
    if (!body.includes('/css/umsh-chrome.css')) failures.push(`${rel} :: 공통 GNB 스타일 미연결`)
    if (!body.includes('class="appbar topbar"')) failures.push(`${rel} :: 상단바 교체 표시 누락`)
  }
  if (needsStore) {
    const storeAt = body.indexOf('/js/thisyear-report-store.js')
    const pageScriptAt = body.lastIndexOf('<script>')
    if (storeAt === -1) failures.push(`${rel} :: 리포트 주입 스크립트 미연결`)
    // 페이지 스크립트가 JSON을 파싱하기 전에 store가 실행돼야 실제 풀이가 반영된다.
    else if (storeAt > pageScriptAt) failures.push(`${rel} :: 리포트 주입 스크립트가 페이지 스크립트보다 뒤에 있음`)
  }

  // Every image the page asks for must actually exist on disk.
  for (const ref of body.matchAll(/src="\.\.\/(assets\/[^"]+)"/g)) {
    if (!existsSync(join(ROOT, SERVICE_DIR, ref[1]))) failures.push(`${rel} :: 이미지 없음 ${ref[1]}`)
  }
  // 결제 금액은 카탈로그(12,900원)와 한 글자도 어긋나면 안 된다.
  if (body.includes('24,900원')) failures.push(`${rel} :: 디자인 시안 금액(24,900원)이 남아 있음`)
}

if (failures.length === 0) {
  console.log('love_this_year 연동 지점 전부 정상 (%d개 계약, %d개 페이지, %d개 대분류)', CONTRACTS.length, PAGES.length, EXPECTED_GROUPS)
  process.exit(0)
}

console.error(`love_this_year 연동 손상 ${failures.length}건:`)
for (const item of failures) console.error('  -', item)
process.exit(1)
