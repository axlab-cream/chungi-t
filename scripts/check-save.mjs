// Asserts every integration point of the 나는 왜 돈이 안 모일까? (money_save) service is still wired.
//
// Same guard as check-marry.mjs, for the same reason: this repo is edited from more than one
// session at a time. The 목차 is the fragile part here too - the 05 필터와 06 상세가 모두
// MONEY_SAVE_TOC의 대분류 수와 section id에 묶여 있어서, 한 항목이 조용히 잘려도 페이지는
// 200으로 뜨고 목록만 짧아진다. The artwork check matters as much: the design shipped every
// image as a base64 data URI, and a page that slips back to one would be megabytes of HTML.
//
// Usage: node scripts/check-save.mjs

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SERVICE_DIR = '사주/money/save'
const ASSET_DIR = `${SERVICE_DIR}/assets/save`

/** The 목차 shape the 05/06 pages are built against. */
const EXPECTED_GROUPS = 8
const EXPECTED_ITEMS = 41

/** [file, needle, human-readable description] */
const CONTRACTS = [
  ['src/server/app.ts', "app.get(['/money/save',", '진입 라우트'],
  ['src/server/app.ts', "'/money/save/input'", '02 입력 라우트'],
  ['src/server/app.ts', "'/money/save/report'", '04 티저 라우트'],
  ['src/server/app.ts', "'/money/save/chat'", '05 목차 라우트'],
  ['src/server/app.ts', "'/money/save/detail'", '06 상세 라우트'],
  ['src/server/app.ts', "app.post('/api/money/save/analyze'", '분석 API'],
  ['src/payment/catalog.ts', 'money_save: {', '결제 카탈로그 등록'],
  ['src/payment/catalog.ts', "returnPath: '/money/save/04-step-4-report/index.html'", '결제 복귀 경로'],
  ['src/money/save-service.ts', "export const MONEY_SAVE_SERVICE_KEY = 'money_save'", '서비스 키 상수'],
  ['src/money/save-service.ts', 'export const MONEY_ASSET_BASE', '아트워크 경로 상수'],
  ['src/money/save-service.ts', 'export const MONEY_SAVE_TOC', '목차 export'],
  ['src/money/save-service.ts', 'const GROUP_LENS', '대분류별 해석 렌즈'],
  ['src/money/save-service.ts', 'function ragLineFrom', 'RAG 근거 추출'],
  ['src/money/save-service.ts', 'id: item.id,', '섹션 id 규칙'],
  ['사주/js/save-service.js', "'/api/money/save/analyze'", '프론트 리포트 호출'],
  ['사주/js/save-service.js', 'function enhanceSajuInput', '저장된 사주 재사용'],
  ['사주/js/save-service.js', 'function renderTeaser', '04 맛보기 렌더'],
  ['사주/js/save-service.js', 'function mountChrome', '공통 GNB 마운트'],
  ['사주/portal.html', 'href="/money/save"', '포털 카드 연결'],
]

/** [page, 공용 크롬과 서비스 스크립트를 붙여야 하는지] */
const PAGES = [
  ['01-step-1-story/index.html', true],
  ['02-step-2-saju-input/index.html', true],
  ['04-step-4-report/index.html', true],
  ['05-step-5-chat/chat.html', true],
  ['05-step-5-chat/index.html', false], // chat.html로 보내는 리다이렉트 스텁
  ['06-step-6_1-report-detail/index.html', true],
]

const failures = []
const read = (rel) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), 'utf-8') : null)

for (const [file, needle, label] of CONTRACTS) {
  const body = read(file)
  if (body === null) failures.push(`${file} 파일 없음 (${label})`)
  else if (!body.includes(needle)) failures.push(`${file} :: ${label} 누락`)
}

// 목차가 잘리면 페이지는 정상으로 뜨고 항목만 사라지므로 개수를 직접 센다.
const serviceBody = read('src/money/save-service.ts')
if (serviceBody !== null) {
  const start = serviceBody.indexOf('export const MONEY_SAVE_TOC')
  const toc = start === -1 ? '' : serviceBody.slice(start, serviceBody.indexOf('] as const', start))
  const groups = (toc.match(/^ {4}id: '/gm) ?? []).length
  const items = (toc.match(/^ {6}\{ id: '/gm) ?? []).length

  if (groups !== EXPECTED_GROUPS) failures.push(`목차 대분류 ${groups}개 (기대 ${EXPECTED_GROUPS}개)`)
  if (items !== EXPECTED_ITEMS) failures.push(`목차 중분류 ${items}개 (기대 ${EXPECTED_ITEMS}개)`)
}

for (const [page, needsChrome] of PAGES) {
  const rel = `${SERVICE_DIR}/${page}`
  const body = read(rel)
  if (body === null) {
    failures.push(`${rel} 페이지 없음`)
    continue
  }
  if (needsChrome) {
    if (!body.includes('/js/save-service.js')) failures.push(`${rel} :: 서비스 스크립트 미연결`)
    if (!body.includes('/js/umsh-chrome.js')) failures.push(`${rel} :: 공통 GNB 미연결`)
    if (!body.includes('data-umsh-chrome')) failures.push(`${rel} :: chrome 호스트 속성 누락`)
    if (!body.includes('/css/umsh-chrome.css')) failures.push(`${rel} :: 공통 GNB 스타일 미연결`)
    if (!body.includes('class="appbar topbar"')) failures.push(`${rel} :: 상단바 교체 표시 누락`)
  }

  // A base64 image slipping back in would put megabytes of artwork inside the HTML.
  if (body.includes('data:image')) failures.push(`${rel} :: base64 이미지가 남아 있음`)

  // Every image the page asks for must actually exist on disk.
  for (const ref of body.matchAll(/src="\.\.\/(assets\/[^"]+)"/g)) {
    if (!existsSync(join(ROOT, SERVICE_DIR, ref[1]))) failures.push(`${rel} :: 이미지 없음 ${ref[1]}`)
  }
}

for (const file of ['04-free-hero.webp', '05-report-hub.webp', '06-detail-reading.webp']) {
  if (!existsSync(join(ROOT, ASSET_DIR, file))) failures.push(`${ASSET_DIR}/${file} 아트워크 없음`)
}

if (failures.length === 0) {
  console.log('money_save 연동 지점 전부 정상 (%d개 계약, %d개 페이지, %d개 대분류)', CONTRACTS.length, PAGES.length, EXPECTED_GROUPS)
  process.exit(0)
}

console.error(`money_save 연동 손상 ${failures.length}건:`)
for (const item of failures) console.error('  -', item)
process.exit(1)
