import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const ROOT = process.cwd()
const popupScript = readFileSync(join(ROOT, '사주/js/umsh-signup-benefit-popup.js'), 'utf8')
const popupStyles = readFileSync(join(ROOT, '사주/css/umsh-signup-benefit-popup.css'), 'utf8')
const chrome = readFileSync(join(ROOT, '사주/js/umsh-chrome.js'), 'utf8')
const todayFree = readFileSync(join(ROOT, '사주/today/free/index.html'), 'utf8')
const portal = readFileSync(join(ROOT, '사주/portal.html'), 'utf8')

test('회원가입 오늘운 팝업은 관리 API의 기간을 확인하고 일주일 숨김 상태를 가진다', () => {
  assert.match(popupScript, /2026-09-22T00:00:00\+09:00/)
  assert.match(popupScript, /2026-10-01T23:59:59\.999\+09:00/)
  assert.match(popupScript, /7 \* 24 \* 60 \* 60 \* 1000/)
  assert.match(popupScript, /umsh:signup-benefit-popup:hidden-until/)
  assert.match(popupScript, /\/api\/public\/signup-benefit-popup/)
  assert.match(popupScript, /campaignIsActive\(popup/)
  assert.match(popupScript, /path === '\/' \|\| path === '\/index\.html'/)
  assert.match(popupScript, /!isLandingPage\(\)/)
})

test('팝업 CTA는 회원가입 후 천명보살의 오늘운 무료 해석으로 돌아간다', () => {
  assert.match(popupScript, /commonLoginUrl\('today', returnTo\)/)
  assert.match(popupScript, /\/today\/free\?start=1/)
  assert.match(popupScript, /내 사주로 오늘운 무료 보기/)
  assert.match(todayFree, /PROFILE_REQUIRED/)
  assert.match(todayFree, /\/profile\?returnTo=/)
  assert.match(todayFree, /params\.get\('start'\) === '1'/)
})

test('팝업 CTA는 GA4와 내부 퍼널에서 안정적인 이름으로 측정된다', () => {
  assert.match(popupScript, /gtag\('event', 'cta_click'/)
  assert.match(popupScript, /cta_name: 'signup_today_fortune_popup'/)
  assert.match(popupScript, /cta_location: 'home_signup_popup'/)
  assert.match(popupScript, /data-action="signup_today_fortune_popup"/)
  assert.match(popupScript, /function popupTrackingTarget\(popup\)/)
  assert.match(popupScript, /data-track-target=/)
  assert.match(popupScript, /signup_popup:/)
  assert.match(chrome, /loadTracker\(\)/)
})

test('공용 크롬이 팝업과 기본 시안 이미지를 모든 연결 화면에 로드한다', () => {
  assert.match(chrome, /loadSignupBenefitPopup\(\)/)
  assert.match(chrome, /umsh-signup-benefit-popup\.js/)
  assert.match(chrome, /umsh-signup-benefit-popup\.css/)
  assert.ok(existsSync(join(ROOT, '사주/사주/assets/signup-benefit-popup-default-2026-09-22.png')))
  assert.match(popupScript, /signup-benefit-popup-default-2026-09-22\.png/)
  assert.match(popupScript, /천명보살의 오늘운/)
  assert.match(popupStyles, /z-index:\s*1000/)
  assert.match(popupStyles, /:focus-visible/)
})

test('운명상회 첫 페이지 포털은 팝업 자산을 직접 불러온다', () => {
  assert.match(portal, /umsh-signup-benefit-popup\.css\?v=20260922-default/)
  assert.match(portal, /umsh-track\.js\?v=20260922-popup-metrics/)
  assert.match(portal, /umsh-signup-benefit-popup\.js\?v=20260922-popup-metrics/)
})
