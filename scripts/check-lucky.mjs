// Asserts every integration point of the 나한테 운 붙는 색과 물건 (lucky_color) service
// is wired.
//
// Same guard as check-cat.mjs. 06 상세는 인라인 스크립트가 파싱 시점에 목차를 만들므로,
// store 스크립트가 그 뒤로 밀리면 화면은 200으로 뜨면서 시안 문구만 남는다. 그래서
// 스크립트 순서를 같이 본다.
//
// Usage: node scripts/check-lucky.mjs

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SERVICE_DIR = '사주/me/lucky'
const ASSET_DIR = `${SERVICE_DIR}/assets/lucky`

/** The 목차 shape the 05/06 pages are built against. */
const EXPECTED_GROUPS = 6
const EXPECTED_ITEMS = 24

/** [file, needle, human-readable description] */
const CONTRACTS = [
  ['src/server/app.ts', "app.get(['/me/lucky',", '진입 라우트'],
  ['src/server/app.ts', "'/me/lucky/input'", '02 입력 라우트'],
  ['src/server/app.ts', "'/me/lucky/report'", '04 티저 라우트'],
  ['src/server/app.ts', "'/me/lucky/chat'", '05 목차 라우트'],
  ['src/server/app.ts', "'/me/lucky/detail'", '06 상세 라우트'],
  ['src/server/app.ts', "app.post('/api/me/lucky/analyze'", '분석 API'],
  ['src/server/app.ts', "lucky_color: 'lucky_color'", '결제 상품 매핑'],
  ['src/payment/catalog.ts', 'lucky_color: {', '결제 카탈로그 등록'],
  ['src/payment/catalog.ts', "returnPath: '/me/lucky/04-step-4-report/index.html'", '결제 복귀 경로'],
  ['src/body/lucky-service.ts', "export const LUCKY_COLOR_SERVICE_KEY = 'lucky_color'", '서비스 키 상수'],
  ['src/body/lucky-service.ts', 'export const LUCKY_COLOR_TOC', '목차 export'],
  ['src/body/lucky-service.ts', 'const ELEMENT_PROFILE', '오행별 생활 언어 매핑'],
  ['src/body/lucky-service.ts', 'const ON_DOMAIN', '코퍼스 도메인 게이트'],
  ['src/body/lucky-service.ts', 'function ragLineFrom', 'RAG 근거 추출'],
  ['src/body/lucky-service.ts', 'retrieveCategoryOwnChunks', '전용 팩 우선 검색'],
  ['data/corpus/lucky-color-service.json', '"domain": "lucky_color_service"', '전용 코퍼스 팩'],
  ['data/corpus/registry.json', '"id": "lucky-color-service"', '코퍼스 레지스트리 등록'],
  ['사주/js/lucky-service.js', "'/api/me/lucky/analyze'", '프론트 리포트 호출'],
  ['사주/js/lucky-service.js', 'function enhanceSajuInput', '저장된 사주 재사용'],
  ['사주/js/lucky-service.js', 'function mountChrome', '공통 GNB 마운트'],
  ['사주/js/lucky-report-store.js', 'window.LuckyReport', '06 상세 데이터 주입'],
  ['사주/portal.html', 'href="/me/lucky"', '포털 카드 연결'],
  ['src/server/service-directory.ts', "key: 'lucky_color'", '검색 목록 등록'],
  ['사주/assets/umsh-luckycolor-card-bg.webp', '', '포털 카드 아트워크'],
]

/** [page, 공용 크롬과 서비스 스크립트를 붙여야 하는지, store가 데이터를 주입하는지] */
const PAGES = [
  ['01-step-1-story/index.html', true, false],
  ['02-step-2-saju-input/index.html', true, false],
  ['04-step-4-report/index.html', true, false],
  ['05-step-5-chat/chat.html', true, true],
  ['05-step-5-chat/index.html', true, true],
  ['06-step-6_1-report-detail/index.html', true, true],
]

const failures = []
const read = (rel) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), 'utf-8') : null)

for (const [file, needle, label] of CONTRACTS) {
  if (!existsSync(join(ROOT, file))) {
    failures.push(`${file} 파일 없음 (${label})`)
    continue
  }
  // 바이너리 자산은 존재 확인만 한다.
  if (!needle) continue
  if (!readFileSync(join(ROOT, file), 'utf-8').includes(needle)) failures.push(`${file} :: ${label} 누락`)
}

// 목차가 잘리면 페이지는 정상으로 뜨고 항목만 사라지므로 개수와 아트워크를 함께 본다.
const serviceBody = read('src/body/lucky-service.ts')
if (serviceBody !== null) {
  const start = serviceBody.indexOf('export const LUCKY_COLOR_TOC')
  const toc = start === -1 ? '' : serviceBody.slice(start, serviceBody.indexOf('] as const', start))
  const groups = (toc.match(/^ {4}id: '/gm) ?? []).length
  const items = (toc.match(/^ {6}\{ id: '/gm) ?? []).length
  const images = [...toc.matchAll(/image: '([^']+)'/g)].map((match) => match[1])

  if (groups !== EXPECTED_GROUPS) failures.push(`목차 대분류 ${groups}개 (기대 ${EXPECTED_GROUPS}개)`)
  if (items !== EXPECTED_ITEMS) failures.push(`목차 중분류 ${items}개 (기대 ${EXPECTED_ITEMS}개)`)
  for (const image of new Set(images)) {
    if (!existsSync(join(ROOT, ASSET_DIR, `${image}.webp`))) failures.push(`${ASSET_DIR}/${image}.webp 아트워크 없음`)
  }

  // 05 목차와 06 상세는 디자인의 `${대분류}-${항목}` 아이디로 라우팅한다.
  const ids = [...toc.matchAll(/\{ id: '(\d-\d)'/g)].map((match) => match[1])
  if (ids.length !== EXPECTED_ITEMS) failures.push(`섹션 아이디가 g-i 형식이 아닌 항목이 있음 (${ids.length}/${EXPECTED_ITEMS})`)
}

// 전용 코퍼스가 비어 있으면 모든 항목이 폴백 문장으로 떨어진다.
const pack = read('data/corpus/lucky-color-service.json')
if (pack !== null) {
  const blocks = JSON.parse(pack).knowledgeBlocks ?? []
  if (blocks.length < EXPECTED_ITEMS) failures.push(`코퍼스 블록 ${blocks.length}개 (항목 ${EXPECTED_ITEMS}개보다 적음)`)
}

for (const [page, needsChrome, needsStore] of PAGES) {
  const rel = `${SERVICE_DIR}/${page}`
  const body = read(rel)
  if (body === null) {
    failures.push(`${rel} 페이지 없음`)
    continue
  }
  if (needsChrome) {
    if (!body.includes('/js/lucky-service.js')) failures.push(`${rel} :: 서비스 스크립트 미연결`)
    if (!body.includes('/js/umsh-chrome.js')) failures.push(`${rel} :: 공통 GNB 미연결`)
    if (!body.includes('data-umsh-chrome')) failures.push(`${rel} :: chrome 호스트 속성 누락`)
    if (!body.includes('/css/umsh-chrome.css')) failures.push(`${rel} :: 공통 GNB 스타일 미연결`)
    // overflow:hidden 이 남으면 sticky CTA가 화면 밖에 그대로 붙는다.
    if (!body.includes('.phone{overflow:clip}')) failures.push(`${rel} :: sticky 해제(overflow:clip) 누락`)
    // 공용 하단 메뉴는 <footer> 안의 <button>이라, 시안의 요소 선택자가 그대로 먹으면
    // 탭 높이가 0이 되어 메뉴가 빈 띠로만 남는다.
    if (!body.includes('.umsh-service-bottom button')) failures.push(`${rel} :: 공용 크롬 보호 규칙 누락`)
    if (!body.includes('.brand{display:none}')) failures.push(`${rel} :: 중복 브랜드 바 숨김 누락`)
  }
  if (needsStore) {
    const storeAt = body.indexOf('/js/lucky-report-store.js')
    const pageScriptAt = body.lastIndexOf('<script>')
    if (storeAt === -1) failures.push(`${rel} :: 리포트 주입 스크립트 미연결`)
    else if (pageScriptAt !== -1 && storeAt > pageScriptAt) {
      failures.push(`${rel} :: 리포트 주입 스크립트가 페이지 스크립트보다 뒤에 있음`)
    }
  }

  // 디자인 시안의 생성 폴더 경로가 남으면 이미지가 통째로 404가 된다.
  if (body.includes('assets/generated/lucky')) failures.push(`${rel} :: 시안 생성 폴더 경로가 남아 있음`)
  for (const ref of body.matchAll(/\.\.\/(assets\/lucky\/[^"']+)/g)) {
    if (!existsSync(join(ROOT, SERVICE_DIR, ref[1]))) failures.push(`${rel} :: 이미지 없음 ${ref[1]}`)
  }
  if (body.includes('data:image')) failures.push(`${rel} :: 인라인 base64 이미지가 남아 있음`)
}

// 06 상세는 store가 있으면 실제 리포트를, 없으면 시안을 그린다. 둘 다 있어야 한다.
const detail = read(`${SERVICE_DIR}/06-step-6_1-report-detail/index.html`)
if (detail !== null && !detail.includes('window.LuckyReport&&window.LuckyReport.sections()')) {
  failures.push('06 상세 :: 실제 리포트를 우선 사용하는 분기 누락')
}

if (failures.length) {
  console.error('나한테 운 붙는 색과 물건 연결 점검 실패')
  for (const line of failures) console.error(` - ${line}`)
  process.exit(1)
}
console.log(`나한테 운 붙는 색과 물건 연결 정상 (${EXPECTED_GROUPS}개 대분류 · ${EXPECTED_ITEMS}개 항목)`)
