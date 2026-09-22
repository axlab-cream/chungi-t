import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const page = readFileSync(new URL('../../사주/profile.html', import.meta.url), 'utf8')
const script = readFileSync(new URL('../../사주/js/profile.js', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../../사주/css/myhub.css', import.meta.url), 'utf8')
const reportScript = readFileSync(new URL('../../사주/js/umsh-report-access.js', import.meta.url), 'utf8')

describe('프로필 입력 간소화', () => {
  it('사주 기본정보만 요구하고 현실 기준 다섯 칸을 프로필에 표시하지 않는다', () => {
    assert.match(page, /name="birth"/)
    assert.match(page, /name="time"/)
    assert.doesNotMatch(page, /profile-life-context|name="life(?:Work|Money|Relationship|Planning)/)
  })

  it('프로필 저장은 기존 회원 현실 기준을 지우는 lifeContext 값을 보내지 않는다', () => {
    assert.doesNotMatch(script, /lifeContextParts|lifeContext:\s*lifeContextParts/)
    assert.doesNotMatch(script, /form\.life(?:Work|Money|Relationship|Planning)/)
  })

  it('시간 선택 상태를 접근성 속성으로 알리고 숨긴 시간 입력을 레이아웃에서 제외한다', () => {
    assert.match(script, /setAttribute\('aria-pressed'/)
    assert.match(styles, /\[data-time-fields\]\[hidden\]\s*\{\s*display:\s*none/)
    assert.match(styles, /\.profile-time-choice\s*\{/)
  })

  it('현실 정보가 없으면 프로필 등록을 요구하지 않고 사실 확인 질문만 제공한다', () => {
    assert.doesNotMatch(reportScript, /MY에서 한 번 등록|MY에서 실제 조건 확인하기|추가 정보 입력 전/)
    assert.match(reportScript, /받을 보상과 지급 시점은 무엇인가요/)
    assert.match(reportScript, /개인의 실제 조건은 이 그래프에 포함되지 않습니다/)
  })
})
