import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const html = readFileSync(join(root, '사주', 'vault.html'), 'utf8')

test('오늘운 탭 상단은 실제 저장 날짜를 쓰는 월간 출석 달력을 가진다', () => {
  assert.match(html, /id="todayCalendar"/)
  assert.match(html, /id="todayCalendarGrid"/)
  assert.match(html, /report\.initialConcern/)
  assert.match(html, /\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$/)
  assert.match(html, /const report = byDate\.get\(key\)/)
  assert.match(html, /class="today-calendar-stamp"/)
})

test('출석 도장이 찍힌 날짜는 저장 리포트의 실제 열기 주소로 연결된다', () => {
  assert.match(html, /const href = reportHref\(report\)/)
  assert.match(html, /<a href="\$\{escapeHtml\(href\)\}" aria-label=/)
  assert.match(html, /월 \$\{day\}일 오늘운 열기/)
})

test('오늘운은 최근 5건만 보이고 구매한 운은 자르지 않는다', () => {
  assert.match(html, /tab === 'today' \? todayRows\.slice\(0, 5\) : reports\.filter/)
  assert.match(html, /최근 5일 오늘운/)
})

test('달력 한 달치가 다른 구매 기록에 밀리지 않도록 경량 목록 최대치를 요청한다', () => {
  assert.match(html, /\/api\/user\/reports\?limit=100&view=list/)
})

test('달력은 오늘운 탭에서만 보이고 이전달과 다음달을 이동할 수 있다', () => {
  assert.match(html, /todayCalendar\.hidden = tab !== 'today'/)
  assert.match(html, /data-calendar-move="-1"/)
  assert.match(html, /data-calendar-move="1"/)
  assert.match(html, /calendarMonth \+ Number\(button\.dataset\.calendarMove\)/)
})
