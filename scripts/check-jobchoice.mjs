// Asserts every integration point of the 자미두수 · 내가 선택한 직장 괜찮을까 (job_choice)
// service is wired.
//
// Same guard as check-thisyear.mjs. 이 서비스는 02/04/05/06 페이지가 JobChoice.buildReport /
// buildTeaser / buildDetail를 그대로 불러 렌더하므로, store 스크립트가 페이지 스크립트보다
// 뒤로 밀리면 화면은 200으로 뜨면서 샘플 문구만 남는다. 그래서 스크립트 순서를 같이 본다.
//
// Usage: node scripts/check-jobchoice.mjs

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SERVICE_DIR = '사주/work/job-choice'
const ASSET_DIR = `${SERVICE_DIR}/assets/job-choice`

/** The 목차 shape the 05/06 pages are built against. */
const EXPECTED_GROUPS = 10
const EXPECTED_ITEMS = 57

/** [file, needle, human-readable description] */
const CONTRACTS = [
  ['src/server/app.ts', "app.get(['/work/job-choice',", '진입 라우트'],
  ['src/server/app.ts', "'/work/job-choice/input'", '02 입력 라우트'],
  ['src/server/app.ts', "'/work/job-choice/report'", '04 티저 라우트'],
  ['src/server/app.ts', "'/work/job-choice/chat'", '05 목차 라우트'],
  ['src/server/app.ts', "'/work/job-choice/detail'", '06 상세 라우트'],
  ['src/server/app.ts', "app.post('/api/work/job-choice/analyze'", '분석 API'],
  ['src/server/app.ts', "job_choice: 'job_choice'", '결제 상품 매핑'],
  ['src/payment/catalog.ts', 'job_choice: {', '결제 카탈로그 등록'],
  ['src/payment/catalog.ts', "returnPath: '/work/job-choice/04-step-4-report/index.html'", '결제 복귀 경로'],
  ['src/work/jobchoice-service.ts', "export const JOB_CHOICE_SERVICE_KEY = 'job_choice'", '서비스 키 상수'],
  ['src/work/jobchoice-service.ts', 'export const JOB_CHOICE_TOC', '목차 export'],
  ['src/work/jobchoice-service.ts', 'const GROUP_PALACE', '대분류별 궁 매핑'],
  ['src/work/jobchoice-service.ts', 'function palaceLine', '궁 해석 계산'],
  ['src/work/jobchoice-service.ts', 'function ragLineFrom', 'RAG 근거 추출'],
  ['사주/js/jobchoice-service.js', "'/api/work/job-choice/analyze'", '프론트 리포트 호출'],
  ['사주/js/jobchoice-service.js', 'function enhanceSajuInput', '저장된 사주 재사용'],
  ['사주/js/jobchoice-service.js', 'function mountChrome', '공통 GNB 마운트'],
  ['사주/js/jobchoice-report-store.js', 'buildReport', '05 목차 데이터 주입'],
  ['사주/js/jobchoice-report-store.js', 'buildDetail', '06 상세 데이터 주입'],
  ['사주/portal.html', 'href="/work/job-choice"', '포털 카드 연결'],
  ['사주/css/portal.css', '.poster.is-work img', '포털 카드 스타일'],
  ['사주/assets/umsh-jobchoice-card-bg.webp', '', '포털 카드 아트워크'],
]

/** [page, 공용 크롬과 서비스 스크립트를 붙여야 하는지, store가 렌더 데이터를 갈아끼우는지] */
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

// 목차가 잘리면 페이지는 정상으로 뜨고 항목만 사라지므로 개수를 함께 본다.
const serviceBody = read('src/work/jobchoice-service.ts')
if (serviceBody !== null) {
  const start = serviceBody.indexOf('export const JOB_CHOICE_TOC')
  const toc = start === -1 ? '' : serviceBody.slice(start, serviceBody.indexOf('] as const', start))
  const groups = (toc.match(/^ {4}id: '/gm) ?? []).length
  const items = (toc.match(/^ {6}\{ id: '/gm) ?? []).length
  if (groups !== EXPECTED_GROUPS) failures.push(`목차 대분류 ${groups}개 (기대 ${EXPECTED_GROUPS}개)`)
  if (items !== EXPECTED_ITEMS) failures.push(`목차 중분류 ${items}개 (기대 ${EXPECTED_ITEMS}개)`)
}

// 02/04/05/06은 공통 CSS/데이터 모듈을 함께 써야 렌더된다.
for (const shared of ['shared/job-choice.css', 'shared/job-choice-data.js']) {
  if (!existsSync(join(ROOT, SERVICE_DIR, shared))) failures.push(`${SERVICE_DIR}/${shared} 없음`)
}

for (const [page, needsChrome, needsStore] of PAGES) {
  const rel = `${SERVICE_DIR}/${page}`
  const body = read(rel)
  if (body === null) {
    failures.push(`${rel} 페이지 없음`)
    continue
  }
  if (needsChrome) {
    if (!body.includes('/js/jobchoice-service.js')) failures.push(`${rel} :: 서비스 스크립트 미연결`)
    if (!body.includes('/js/umsh-chrome.js')) failures.push(`${rel} :: 공통 GNB 미연결`)
    if (!body.includes('data-umsh-chrome')) failures.push(`${rel} :: chrome 호스트 속성 누락`)
    if (!body.includes('/css/umsh-chrome.css')) failures.push(`${rel} :: 공통 GNB 스타일 미연결`)
    if (!body.includes('class="appbar topbar"')) failures.push(`${rel} :: 상단바 교체 표시 누락`)
  }
  if (needsStore) {
    const storeAt = body.indexOf('/js/jobchoice-report-store.js')
    const pageScriptAt = body.lastIndexOf('<script>')
    if (storeAt === -1) failures.push(`${rel} :: 리포트 주입 스크립트 미연결`)
    // 페이지 스크립트가 JobChoice를 호출하기 전에 store가 실행돼야 실제 풀이가 반영된다.
    else if (storeAt > pageScriptAt) failures.push(`${rel} :: 리포트 주입 스크립트가 페이지 스크립트보다 뒤에 있음`)
  }

  // Every image the page asks for must actually exist on disk.
  for (const ref of body.matchAll(/src="\.\.\/(assets\/[^"]+)"/g)) {
    if (!existsSync(join(ROOT, SERVICE_DIR, ref[1]))) failures.push(`${rel} :: 이미지 없음 ${ref[1]}`)
  }
  if (body.includes('data:image')) failures.push(`${rel} :: 인라인 base64 이미지가 남아 있음`)
}

if (!existsSync(join(ROOT, ASSET_DIR))) failures.push(`${ASSET_DIR} 아트워크 폴더 없음`)

if (failures.length === 0) {
  console.log('job_choice 연동 지점 전부 정상 (%d개 계약, %d개 페이지, %d개 대분류)', CONTRACTS.length, PAGES.length, EXPECTED_GROUPS)
  process.exit(0)
}

console.error(`job_choice 연동 손상 ${failures.length}건:`)
for (const item of failures) console.error('  -', item)
process.exit(1)
