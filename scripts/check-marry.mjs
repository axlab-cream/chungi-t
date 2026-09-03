// Asserts every integration point of the 연애 말고 결혼까지 가능? (marry_match) service is still wired.
//
// Same guard as check-pass-angle.mjs, for the same reason: this repo is edited from more than
// one session at a time and whole hunks have been silently overwritten mid-work. The 목차 here
// is the fragile part - the 05 필터 칩과 06 상세 히어로가 모두 MARRY_MATCH_TOC의 대분류 수와
// image 키에 묶여 있어서, 대분류 하나가 조용히 잘려도 페이지는 200으로 뜨고 항목만 사라진다.
//
// Usage: node scripts/check-marry.mjs

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SERVICE_DIR = '사주/match/marry'
const ASSET_DIR = `${SERVICE_DIR}/assets/marry`

/** The 목차 shape the 05/06 pages are built against. */
const EXPECTED_GROUPS = 10
const EXPECTED_ITEMS = 70

/** [file, needle, human-readable description] */
const CONTRACTS = [
  ['src/server/app.ts', "app.get(['/match/marry',", '진입 라우트'],
  ['src/server/app.ts', "'/match/marry/input'", '02 입력 라우트'],
  ['src/server/app.ts', "'/match/marry/report'", '04 티저 라우트'],
  ['src/server/app.ts', "'/match/marry/chat'", '05 목차 라우트'],
  ['src/server/app.ts', "'/match/marry/detail'", '06 상세 라우트'],
  ['src/server/app.ts', "app.post('/api/match/marry/analyze'", '분석 API'],
  ['src/server/app.ts', "marry_match: 'marry_match'", '결제 상품 매핑'],
  ['src/payment/catalog.ts', 'marry_match: {', '결제 카탈로그 등록'],
  ['src/payment/catalog.ts', "returnPath: '/match/marry'", '결제 복귀 경로'],
  ['src/match/marry-service.ts', "export const MARRY_MATCH_SERVICE_KEY = 'marry_match'", '서비스 키 상수'],
  ['src/match/marry-service.ts', 'export const MARRY_ASSET_BASE', '아트워크 경로 상수'],
  ['src/match/marry-service.ts', 'export const MARRY_MATCH_TOC', '목차 export'],
  ['src/match/marry-service.ts', 'const GROUP_LENS', '대분류별 해석 렌즈'],
  ['src/match/marry-service.ts', 'id: `marry-${pad2(groupIndex + 1)}-${pad2(itemIndex + 1)}`', '섹션 id 규칙'],
  ['사주/js/marry-service.js', '06-${section.imageKey}-hero.webp', '06 상세 히어로 매핑'],
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
const serviceBody = read('src/match/marry-service.ts')
if (serviceBody !== null) {
  const start = serviceBody.indexOf('export const MARRY_MATCH_TOC')
  const toc = start === -1 ? '' : serviceBody.slice(start, serviceBody.indexOf('] as const', start))
  const images = [...toc.matchAll(/image: '([^']+)'/g)].map((match) => match[1])
  const items = (toc.match(/^ {6}'/gm) ?? []).length

  if (images.length !== EXPECTED_GROUPS) failures.push(`목차 대분류 ${images.length}개 (기대 ${EXPECTED_GROUPS}개)`)
  if (items !== EXPECTED_ITEMS) failures.push(`목차 중분류 ${items}개 (기대 ${EXPECTED_ITEMS}개)`)

  for (const image of images) {
    // 05 목록 카드와 06 상세 히어로가 대분류 하나당 한 쌍씩 필요하다.
    for (const file of [`05-${image}.webp`, `06-${image}-hero.webp`]) {
      if (!existsSync(join(ROOT, ASSET_DIR, file))) failures.push(`${ASSET_DIR}/${file} 아트워크 없음`)
    }
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
    if (!body.includes('/js/marry-service.js')) failures.push(`${rel} :: 서비스 스크립트 미연결`)
    if (!body.includes('/js/umsh-chrome.js')) failures.push(`${rel} :: 공통 GNB 미연결`)
    if (!body.includes('data-umsh-chrome')) failures.push(`${rel} :: chrome 호스트 속성 누락`)
  }

  // Every image the page asks for must actually exist on disk.
  for (const ref of body.matchAll(/src="\.\.\/(assets\/[^"]+)"/g)) {
    if (!existsSync(join(ROOT, SERVICE_DIR, ref[1]))) failures.push(`${rel} :: 이미지 없음 ${ref[1]}`)
  }
}

if (failures.length === 0) {
  console.log('marry_match 연동 지점 전부 정상 (%d개 계약, %d개 페이지, %d개 대분류)', CONTRACTS.length, PAGES.length, EXPECTED_GROUPS)
  process.exit(0)
}

console.error(`marry_match 연동 손상 ${failures.length}건:`)
for (const item of failures) console.error('  -', item)
process.exit(1)
