import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

/**
 * 퇴사운은 공개 서비스와 같이 1→2→4 만 탄다.
 * STEP3 상황 입력은 STEP2에 합치고, 서버가 받는 값은 reason 하나다.
 */
const root = process.cwd()
const step2 = readFileSync(join(root, '사주/work/quit/02-step-2-saju-input/index.html'), 'utf8')
const step3 = readFileSync(join(root, '사주/work/quit/03-step-3-service-input/index.html'), 'utf8')
const script = readFileSync(join(root, '사주/js/quit-service.js'), 'utf8')
const app = readFileSync(join(root, 'src/server/app.ts'), 'utf8')

test('퇴사운 STEP2는 티저로 가고 이유만 추가로 받는다', () => {
  assert.match(step2, /04-step-4-report/)
  assert.match(step2, /name="reason"/)
  assert.match(step2, /나가도 되는지 보기/)
  assert.match(step2, /umsh-ymd\.js/)
  assert.match(step2, /birthTimeUnknown/)
  assert.doesNotMatch(step2, /03-step-3-service-input/)
  assert.doesNotMatch(step2, /id="tenure"|id="candidate"|id="memo"|id="next"/)
  assert.doesNotMatch(step2, /QUIT OR HOLD/)
  assert.equal((step2.match(/type="submit"/g) || []).length, 1)
  assert.doesNotMatch(step2, /class="ghost"/)
  assert.doesNotMatch(step2, /재직 기간·퇴사 후보일/)
  assert.doesNotMatch(step2, /참고 화면입니다/)
  assert.doesNotMatch(step2, /class="note"|class="footer"/)
})

test('퇴사운 STEP4 티저는 후킹 없이 판정·근거를 보여 준다', () => {
  const step4 = readFileSync(join(root, '사주/work/quit/04-step-4-report/index.html'), 'utf8')
  assert.match(step4, /data-teaser-headline/)
  assert.match(step4, /data-teaser-summary/)
  assert.match(step4, /data-signal-list/)
  assert.match(step4, /전체 보기 \(14,900원\)/)
  assert.match(step4, /미리보기/)
  assert.doesNotMatch(step4, /REPORT PREVIEW/)
  assert.doesNotMatch(step4, /진짜 이유/)
  assert.doesNotMatch(step4, /아닐 수도/)
  assert.doesNotMatch(step4, /구성 먼저/)
  assert.doesNotMatch(step4, /열어보기/)
  assert.doesNotMatch(step4, /결제 후 열리는/)
  assert.doesNotMatch(script, /입력한 사주로 계산하고 있습니다/)
  assert.doesNotMatch(script, /열어보기/)
  assert.match(script, /전체 목차 열기/)
  assert.match(script, /paintQuitReading/)
})

test('퇴사운 STEP3와 /situation 은 STEP2로 되돌린다', () => {
  assert.match(step3, /02-step-2-saju-input/)
  assert.match(step3, /location\.replace/)
  assert.doesNotMatch(step3, /<form/)
  assert.match(app, /work\/quit\/situation[\s\S]*?02-step-2-saju-input/)
  assert.match(script, /INPUT_PATH/)
  assert.doesNotMatch(script, /location\.assign\('\.\.\/03-step-3-service-input/)
})
