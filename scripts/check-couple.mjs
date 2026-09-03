// Asserts every integration point of the 나 지금 그만둬도 될까? (match_couple) service is wired.
//
// Same guard as check-marry.mjs and check-save.mjs. The 목차 is the fragile part here too:
// 05 목차의 열 줄과 06 상세의 카드가 모두 COUPLE_MATCH_TOC의 대분류 수와 section id에 묶여 있어서,
// 하나가 조용히 잘려도 페이지는 200으로 뜨고 목록만 짧아진다.
//
// Usage: node scripts/check-quit.mjs

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SERVICE_DIR = '사주/match/couple'
const ASSET_DIR = `${SERVICE_DIR}/assets/couple`

/** The 목차 shape the 05/06 pages are built against. */
const EXPECTED_GROUPS = 14
const EXPECTED_ITEMS = 70

/** [file, needle, human-readable description] */
const CONTRACTS = [
  ['src/server/app.ts', "app.get(['/match/couple',", '진입 라우트'],
  ['src/server/app.ts', "'/match/couple/input'", '02 입력 라우트'],
  ['src/server/app.ts', "'/match/couple/report'", '04 티저 라우트'],
  ['src/server/app.ts', "'/match/couple/chat'", '05 목차 라우트'],
  ['src/server/app.ts', "'/match/couple/detail'", '06 상세 라우트'],
  ['src/server/app.ts', "app.post('/api/match/couple/analyze'", '분석 API'],
  ['src/server/app.ts', "match_couple: 'match_couple'", '결제 상품 매핑'],
  ['src/payment/catalog.ts', 'match_couple: {', '결제 카탈로그 등록'],
  ['src/payment/catalog.ts', "returnPath: '/match/couple/04-step-4-report/index.html'", '결제 복귀 경로'],
  ['src/match/couple-service.ts', "export const COUPLE_MATCH_SERVICE_KEY = 'match_couple'", '서비스 키 상수'],
  ['src/match/couple-service.ts', 'export const COUPLE_ASSET_BASE', '아트워크 경로 상수'],
  ['src/match/couple-service.ts', 'export const COUPLE_MATCH_TOC', '목차 export'],
  ['src/match/couple-service.ts', 'const GROUP_LENS', '대분류별 해석 렌즈'],
  ['src/match/couple-service.ts', 'function ragLineFrom', 'RAG 근거 추출'],
  ['사주/js/couple-service.js', "'/api/match/couple/analyze'", '프론트 리포트 호출'],
  ['사주/js/couple-service.js', 'function enhanceSajuInput', '저장된 사주 재사용'],
  ['사주/js/couple-service.js', 'function mountChrome', '공통 GNB 마운트'],
  ['사주/portal.html', 'href="/match/couple"', '포털 카드 연결'],
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

// 목차가 잘리면 페이지는 정상으로 뜨고 항목만 사라지므로, 개수와 아트워크를 함께 본다.
const serviceBody = read('src/match/couple-service.ts')
if (serviceBody !== null) {
  const start = serviceBody.indexOf('export const COUPLE_MATCH_TOC')
  const toc = start === -1 ? '' : serviceBody.slice(start, serviceBody.indexOf('] as const', start))
  const groups = (toc.match(/^ {4}id: '/gm) ?? []).length
  const images = [...toc.matchAll(/image: '([^']+)'/g)].map((match) => match[1]).filter(Boolean)
  const items = (toc.match(/^ {6}\{ id: '/gm) ?? []).length

  if (groups !== EXPECTED_GROUPS) failures.push(`목차 대분류 ${groups}개 (기대 ${EXPECTED_GROUPS}개)`)
  if (items !== EXPECTED_ITEMS) failures.push(`목차 중분류 ${items}개 (기대 ${EXPECTED_ITEMS}개)`)

  for (const image of new Set(images)) {
    if (!existsSync(join(ROOT, ASSET_DIR, `05-${image}.webp`))) failures.push(`${ASSET_DIR}/05-${image}.webp 아트워크 없음`)
  }
}

for (const [page, needsChrome] of PAGES) {
  const rel = `${SERVICE_DIR}/${page}`
  const body = read(rel)
  if (body === null) {
    failures.push(`${rel} 페이지 없음`)
    continue
  }
  if (needsChrome) {
    if (!body.includes('/js/couple-service.js')) failures.push(`${rel} :: 서비스 스크립트 미연결`)
    if (!body.includes('/js/umsh-chrome.js')) failures.push(`${rel} :: 공통 GNB 미연결`)
    if (!body.includes('data-umsh-chrome')) failures.push(`${rel} :: chrome 호스트 속성 누락`)
    if (!body.includes('/css/umsh-chrome.css')) failures.push(`${rel} :: 공통 GNB 스타일 미연결`)
    if (!body.includes('class="appbar topbar"')) failures.push(`${rel} :: 상단바 교체 표시 누락`)
  }

  // Every image the page asks for must actually exist on disk.
  for (const ref of body.matchAll(/src="\.\.\/(assets\/[^"]+)"/g)) {
    if (!existsSync(join(ROOT, SERVICE_DIR, ref[1]))) failures.push(`${rel} :: 이미지 없음 ${ref[1]}`)
  }
}

if (failures.length === 0) {
  console.log('match_couple 연동 지점 전부 정상 (%d개 계약, %d개 페이지, %d개 대분류)', CONTRACTS.length, PAGES.length, EXPECTED_GROUPS)
  process.exit(0)
}

console.error(`match_couple 연동 손상 ${failures.length}건:`)
for (const item of failures) console.error('  -', item)
process.exit(1)
