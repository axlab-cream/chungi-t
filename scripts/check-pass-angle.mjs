// Asserts every integration point of the 나, 붙을 각이야? (pass_angle) service is still wired.
//
// This repo is edited from more than one session at a time, and whole hunks have been
// silently overwritten mid-work. Run this after any broad edit: it fails loudly the moment
// a route, dispatch or page hook goes missing, instead of surfacing as a 404 much later.
//
// Usage: node scripts/check-pass-angle.mjs

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SERVICE_DIR = '사주/me/pass-angle'

/** [file, needle, human-readable description] */
const CONTRACTS = [
  ['src/server/app.ts', "const PASS_ANGLE_SERVICE_KEY = 'pass_angle'", '서비스 키 상수'],
  ['src/server/app.ts', "app.get(['/me/pass-angle',", '진입 라우트'],
  ['src/server/app.ts', "'/me/pass-angle/input'", '02 입력 라우트'],
  ['src/server/app.ts', "'/me/pass-angle/exam'", '03 시험정보 라우트'],
  ['src/server/app.ts', "'/me/pass-angle/report'", '04 티저 라우트'],
  ['src/server/app.ts', "'/me/pass-angle/chat'", '05 목록 라우트'],
  ['src/server/app.ts', "'/me/pass-angle/detail'", '06 상세 라우트'],
  ['src/server/app.ts', 'function parseExamContext', '시험 입력 파서'],
  ['src/server/app.ts', '...(exam ? { exam } : {})', '시험 컨텍스트 전달'],
  ['src/server/app.ts', "[PASS_ANGLE_SERVICE_KEY]: 'pass_angle'", '결제 상품 매핑'],
  ['src/payment/catalog.ts', "pass_angle: {", '결제 카탈로그 등록'],
  ['src/types/index.ts', 'exam?: {', '시험 컨텍스트 타입'],
  ['src/report/report-generator.ts', 'PASS_ANGLE_BLUEPRINTS', '섹션 블루프린트'],
  ['src/report/report-generator.ts', 'function buildPassAngleInterpretation', '해석 생성기'],
  ['src/report/report-generator.ts', 'if (isPassAngleContext(context)) return PASS_ANGLE_BLUEPRINTS', '블루프린트 디스패치'],
  ['src/report/report-generator.ts', 'return buildPassAngleInterpretation(', '해석 디스패치'],
  ['사주/js/pass-angle-service.js', "serviceKey: SERVICE.service_key", '프론트 리포트 호출'],
  ['사주/portal.html', '기대해! 신규 운명', '포털 신규 섹션'],
]

const PAGES = [
  '01-step-1-story/index.html',
  '02-step-2-saju-input/index.html',
  '03-step-3-service-input/index.html',
  '04-step-4-report/index.html',
  '05-step-5-chat/chat.html',
  '06-step-6_1-report-detail/index.html',
]

const failures = []
const read = (rel) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), 'utf-8') : null)

for (const [file, needle, label] of CONTRACTS) {
  const body = read(file)
  if (body === null) failures.push(`${file} 파일 없음 (${label})`)
  else if (!body.includes(needle)) failures.push(`${file} :: ${label} 누락`)
}

for (const page of PAGES) {
  const rel = `${SERVICE_DIR}/${page}`
  const body = read(rel)
  if (body === null) {
    failures.push(`${rel} 페이지 없음`)
    continue
  }
  if (!body.includes('/js/pass-angle-service.js')) failures.push(`${rel} :: 서비스 스크립트 미연결`)
  if (!body.includes('/js/umsh-chrome.js')) failures.push(`${rel} :: 공통 GNB 미연결`)
  if (!body.includes('data-umsh-chrome')) failures.push(`${rel} :: chrome 호스트 속성 누락`)

  // Every image the page asks for must actually exist on disk.
  for (const ref of body.matchAll(/src="\.\.\/(assets\/[^"]+)"/g)) {
    if (!existsSync(join(ROOT, SERVICE_DIR, ref[1]))) failures.push(`${rel} :: 이미지 없음 ${ref[1]}`)
  }
}

if (failures.length === 0) {
  console.log('pass_angle 연동 지점 전부 정상 (%d개 계약, %d개 페이지)', CONTRACTS.length, PAGES.length)
  process.exit(0)
}

console.error(`pass_angle 연동 손상 ${failures.length}건:`)
for (const item of failures) console.error('  -', item)
console.error('\n스냅샷에서 복구하세요: scratchpad/snapshot/latest-newfiles + latest.patch')
process.exit(1)
