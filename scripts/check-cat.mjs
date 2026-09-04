// Asserts every integration point of the 고양이랑 나 진짜 궁합 맞아 (cat_compatibility)
// service is wired.
//
// Same guard as check-jobchoice.mjs. 06 상세는 자기 detail-data.json을 fetch해서 그리므로,
// store 스크립트가 페이지 스크립트보다 뒤로 밀리면 화면은 200으로 뜨면서 "리포트를 찾지
// 못했어요" 상태만 남는다. 그래서 스크립트 순서를 같이 본다.
//
// Usage: node scripts/check-cat.mjs

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SERVICE_DIR = '사주/match/cat'
const ASSET_DIR = `${SERVICE_DIR}/assets/cat-compatibility`

/** The 목차 shape the 05/06 pages are built against. */
const EXPECTED_GROUPS = 10
const EXPECTED_ITEMS = 50

/** [file, needle, human-readable description] */
const CONTRACTS = [
  ['src/server/app.ts', "app.get(['/match/cat',", '진입 라우트'],
  ['src/server/app.ts', "'/match/cat/input'", '02 입력 라우트'],
  ['src/server/app.ts', "'/match/cat/report'", '04 티저 라우트'],
  ['src/server/app.ts', "'/match/cat/chat'", '05 목차 라우트'],
  ['src/server/app.ts', "'/match/cat/detail'", '06 상세 라우트'],
  ['src/server/app.ts', "app.post('/api/match/cat/analyze'", '분석 API'],
  ['src/server/app.ts', "cat_compatibility: 'cat_compatibility'", '결제 상품 매핑'],
  ['src/payment/catalog.ts', 'cat_compatibility: {', '결제 카탈로그 등록'],
  ['src/payment/catalog.ts', "returnPath: '/match/cat/04-step-4-report/index.html'", '결제 복귀 경로'],
  ['src/pet/cat-service.ts', "export const CAT_COMPAT_SERVICE_KEY = 'cat_compatibility'", '서비스 키 상수'],
  ['src/pet/cat-service.ts', 'export const CAT_COMPAT_TOC', '목차 export'],
  ['src/pet/cat-service.ts', 'const GROUP_SEAT', '대분류별 원국 자리 매핑'],
  ['src/pet/cat-service.ts', 'const ON_DOMAIN', '코퍼스 도메인 게이트'],
  ['src/pet/cat-service.ts', 'function ragLineFrom', 'RAG 근거 추출'],
  ['사주/js/cat-service.js', "'/api/match/cat/analyze'", '프론트 리포트 호출'],
  ['사주/js/cat-service.js', 'function enhanceSajuInput', '저장된 사주 재사용'],
  ['사주/js/cat-service.js', 'function mountChrome', '공통 GNB 마운트'],
  ['사주/js/cat-report-store.js', 'detail-data.json', '06 상세 데이터 주입'],
  ['사주/portal.html', 'href="/match/cat"', '포털 카드 연결'],
  ['사주/assets/umsh-petmatch-card-bg.webp', '', '포털 카드 아트워크'],
]

/** [page, 공용 크롬과 서비스 스크립트를 붙여야 하는지, store가 데이터를 주입하는지] */
const PAGES = [
  ['01-step-1-story/index.html', true, false],
  ['02-step-2-saju-input/index.html', true, true],
  ['04-step-4-report/index.html', true, true],
  ['05-step-5-chat/chat.html', true, true],
  ['05-step-5-chat/index.html', false, false], // chat.html로 보내는 리다이렉트 스텁
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
const serviceBody = read('src/pet/cat-service.ts')
if (serviceBody !== null) {
  const start = serviceBody.indexOf('export const CAT_COMPAT_TOC')
  const toc = start === -1 ? '' : serviceBody.slice(start, serviceBody.indexOf('] as const', start))
  const groups = (toc.match(/^ {4}id: '/gm) ?? []).length
  const items = (toc.match(/^ {6}\{ id: '/gm) ?? []).length
  const images = [...toc.matchAll(/image: '([^']+)'/g)].map((match) => match[1])

  if (groups !== EXPECTED_GROUPS) failures.push(`목차 대분류 ${groups}개 (기대 ${EXPECTED_GROUPS}개)`)
  if (items !== EXPECTED_ITEMS) failures.push(`목차 중분류 ${items}개 (기대 ${EXPECTED_ITEMS}개)`)
  for (const image of new Set(images)) {
    if (!existsSync(join(ROOT, ASSET_DIR, `${image}.webp`))) failures.push(`${ASSET_DIR}/${image}.webp 아트워크 없음`)
  }
}

// 06 상세는 대분류 커버 아트를 쓰므로 그 파일들도 함께 본다.
const groupIds = ['guardian-defaults', 'chemistry-temperature', 'distance-compat', 'routine-sync', 'space-compat',
  'trouble-pattern', 'five-elements-care', 'adoption-intro-timing', 'burnout-prevention', 'today-cat-action']
for (const id of groupIds) {
  if (!existsSync(join(ROOT, ASSET_DIR, `06-${id}-cover.webp`))) failures.push(`${ASSET_DIR}/06-${id}-cover.webp 없음`)
}

for (const [page, needsChrome, needsStore] of PAGES) {
  const rel = `${SERVICE_DIR}/${page}`
  const body = read(rel)
  if (body === null) {
    failures.push(`${rel} 페이지 없음`)
    continue
  }
  if (needsChrome) {
    if (!body.includes('/js/cat-service.js')) failures.push(`${rel} :: 서비스 스크립트 미연결`)
    if (!body.includes('/js/umsh-chrome.js')) failures.push(`${rel} :: 공통 GNB 미연결`)
    if (!body.includes('data-umsh-chrome')) failures.push(`${rel} :: chrome 호스트 속성 누락`)
    if (!body.includes('/css/umsh-chrome.css')) failures.push(`${rel} :: 공통 GNB 스타일 미연결`)
    if (!body.includes('class="appbar topbar"')) failures.push(`${rel} :: 상단바 교체 표시 누락`)
  }
  if (needsStore) {
    const storeAt = body.indexOf('/js/cat-report-store.js')
    const pageScriptAt = body.lastIndexOf('<script>')
    if (storeAt === -1) failures.push(`${rel} :: 리포트 주입 스크립트 미연결`)
    else if (storeAt > pageScriptAt) failures.push(`${rel} :: 리포트 주입 스크립트가 페이지 스크립트보다 뒤에 있음`)
  }

  // 디자인 시안의 생성 폴더 경로가 남으면 이미지가 통째로 404가 된다.
  if (body.includes('assets/generated/cat-compatibility')) failures.push(`${rel} :: 시안 생성 폴더 경로가 남아 있음`)
  for (const ref of body.matchAll(/\.\.\/(assets\/cat-compatibility\/[^"']+)/g)) {
    if (!existsSync(join(ROOT, SERVICE_DIR, ref[1]))) failures.push(`${rel} :: 이미지 없음 ${ref[1]}`)
  }
  if (body.includes('data:image')) failures.push(`${rel} :: 인라인 base64 이미지가 남아 있음`)
}

if (failures.length === 0) {
  console.log('cat_compatibility 연동 지점 전부 정상 (%d개 계약, %d개 페이지, %d개 대분류)', CONTRACTS.length, PAGES.length, EXPECTED_GROUPS)
  process.exit(0)
}

console.error(`cat_compatibility 연동 손상 ${failures.length}건:`)
for (const item of failures) console.error('  -', item)
process.exit(1)
