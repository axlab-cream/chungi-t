import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

const ROOT = process.cwd()
const SAJU = join(ROOT, '사주')

function read(rel: string) {
  return readFileSync(join(ROOT, rel), 'utf8')
}

test('https 실서비스는 file: 시안 해석만 허용한다', () => {
  const access = read('사주/js/umsh-report-access.js')
  assert.match(access, /function allowDesignMockReading/)
  assert.match(access, /location\.protocol\) === 'file:'/)
  assert.match(access, /LIVE_READING_HOST_IDS/)
  assert.match(access, /'interpretationBlocks'/)
  assert.match(access, /'detail-stack'/)
  assert.match(access, /markFilled:markFilled/)
})

test('해석 칸 가드는 선택자 하나로 합쳐진 유효한 규칙이고, 가릴 때 자리를 남기지 않는다', () => {
  // `A{display:none},B,C{display:none}` 처럼 이어 붙이면 뒤쪽 규칙이 통째로
  // 무시돼서 가드가 있으나 마나였다. 선택자를 먼저 합친 뒤 선언을 한 번만 붙인다.
  const access = read('사주/js/umsh-report-access.js')
  const start = access.indexOf('guard.textContent = inPlaceEnabled()')
  assert.notEqual(start, -1, '가드 생성부를 찾지 못했다')
  const build = access.slice(start, access.indexOf('document.head.appendChild(guard)', start))
  assert.match(build, /\.filter\(Boolean\)\.join\(','\) \+ '\{display:none\}'/)
  assert.doesNotMatch(build, /\{display:none\}'\s*\+\s*'?,/, '선언 뒤에 선택자를 이어 붙였다')
  /*
   * visibility 로 가리면 글자만 사라지고 상자는 남는다. 올해 연애운 06-1 의 상태 패널이
   * min-height 260px 라, 리포트가 정상으로 열렸는데도 상단바와 첫 이미지 사이에 245px 짜리
   * 빈 구멍이 남았다(2026-09-18). 가릴 자리는 접어야 한다.
   */
  assert.doesNotMatch(build, /visibility:hidden/, '가린 슬롯이 빈 자리를 그대로 차지한다')
})

test('공용 크롬은 캐시 버스터가 붙어도 셸 스크립트를 다시 올리지 않는다', () => {
  const chrome = read('사주/js/umsh-chrome.js')
  const start = chrome.indexOf('function loadShellScript')
  assert.notEqual(start, -1, 'loadShellScript 를 찾지 못했다')
  const body = chrome.slice(start, chrome.indexOf('\n  }', start))
  assert.match(body, /var wanted = new URL\(src, global\.location\.href\)\.pathname/)
  assert.match(body, /\.pathname === wanted/)
  assert.doesNotMatch(body, /\.pathname === src/, '쿼리가 붙은 주소를 경로와 직접 비교한다')
})

test('이직·저축 06은 라이브 리포트 없이 히어로 소개문까지 비운다', () => {
  const move = read('사주/work/move/06-step-6_1-report-detail/index.html')
  assert.match(move, /\$\("#detailIntro"\)\.textContent = "";/)
  assert.match(move, /\$\("#conclusionText"\)\.setAttribute\("data-umsh-filled", ""\);/)
  const save = read('사주/money/save/06-step-6_1-report-detail/index.html')
  assert.match(save, /els\.sectionPreview\.textContent = "";/)
  assert.match(save, /els\.conclusionBody\.setAttribute\("data-umsh-filled", ""\);/)
})

test('올해연애 스토어는 라이브 리포트 없이 시안 해석을 비운다', () => {
  const store = read('사주/js/thisyear-report-store.js')
  assert.match(store, /function stripMockDetail/)
  assert.match(store, /detail\.interpretation_blocks = \[\]/)
  assert.match(store, /allowDesignMockReading/)
  const service = read('사주/js/thisyear-service.js')
  assert.match(service, /async function enhanceDetail/)
  assert.doesNotMatch(service, /ensureReportCached/)
})

test('직장선택 스토어는 라이브 리포트 없이 시안 해석을 비운다', () => {
  const store = read('사주/js/jobchoice-report-store.js')
  assert.match(store, /allowDesignMockReading/)
  assert.match(store, /built\.detail\.interpretation_blocks = \[\]/)
  const service = read('사주/js/jobchoice-service.js')
  assert.match(service, /async function enhanceDetail/)
  assert.doesNotMatch(service, /ensureReportCached/)
})

test('저축·이직 06은 http에서 시안 interpretation_blocks 를 바로 그리지 않는다', () => {
  const save = read('사주/money/save/06-step-6_1-report-detail/index.html')
  assert.match(save, /protocol === "file:"/)
  assert.match(save, /verifiedReport/)
  assert.match(save, /풀이를 준비하고 있어요/)
  const move = read('사주/work/move/06-step-6_1-report-detail/index.html')
  assert.match(move, /allowMock/)
  assert.match(move, /interpretationBlocks"\)\.innerHTML = ""/)
})

test('고양이·커플 상세는 서버 리포트 enhanceDetail 경로가 있다', () => {
  const cat = read('사주/js/cat-service.js')
  assert.match(cat, /async function enhanceDetail/)
  assert.doesNotMatch(cat, /ensureReportCached/)
  const couple = read('사주/js/couple-service.js')
  assert.match(couple, /async function enhanceDetail/)
  assert.match(couple, /markFilled/)
})

test('공개 06 상세는 접근기를 먼저 싣고 시안 JSON만으로 해석을 확정하지 않는다', () => {
  const dirs = [
    'love/this-year',
    'work/job-choice',
    'work/quit',
    'money/save',
    'match/cat',
    'match/couple',
    'match/marry',
    'love/signal',
    'work/move',
  ]
  const missing: string[] = []
  for (const dir of dirs) {
    const html = readFileSync(join(SAJU, dir, '06-step-6_1-report-detail', 'index.html'), 'utf8')
    if (!html.includes('umsh-report-access.js')) missing.push(`${dir}: 접근기 없음`)
    if (!html.includes('data-umsh-verified-inplace')) missing.push(`${dir}: inplace 없음`)
  }
  assert.deepEqual(missing, [])
})
