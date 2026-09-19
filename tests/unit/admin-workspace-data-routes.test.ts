import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('../../admin-ui/index.html', import.meta.url), 'utf8')

/**
 * 2026-09-19: 사이드바의 통계·릴리스 메뉴는 백엔드(`/api/admin/v1/funnel`·`/api/admin/v1/release`)
 * 가 이미 있는데도 renderWorkspace 의 route.key 분기에 없어서 "이 메뉴의 실제 운영 원천
 * 테이블은 아직 생성되지 않았습니다" 안내로 떨어졌다 — 데이터는 있는데 화면이 연결을
 * 안 한 것이다(사용자가 "데이터 안 보이는 곳 전부 확인" 요청으로 발견).
 */

test('renderWorkspace 가 통계·릴리스·평가·미디어를 각각의 실제 로더로 연결한다', () => {
  const body = source.slice(source.indexOf('function renderWorkspace'), source.indexOf('function renderWorkspace') + 1800)
  assert.match(body, /if \(route\.key === 'analytics'\) \{ loadFunnelAnalytics\(body\); return; \}/)
  assert.match(body, /if \(route\.key === 'releases'\) \{ loadReleaseInfo\(body\); return; \}/)
  assert.match(body, /if \(route\.key === 'evaluations'\) \{ loadQualityEvaluations\(body\); return; \}/)
  assert.match(body, /if \(route\.key === 'media'\) \{ loadMediaCatalog\(body\); return; \}/)
  // 네 분기 모두 "아직 생성되지 않았습니다" 안내보다 앞에 있어야 실제로 도달한다.
  const fallbackAt = body.indexOf('아직 생성되지 않았습니다')
  for (const key of ['analytics', 'releases', 'evaluations', 'media']) {
    const at = body.indexOf(`route.key === '${key}'`)
    assert.ok(at >= 0 && at < fallbackAt, `${key} 분기가 없거나 안내 뒤에 있다`)
  }
})

test('loadQualityEvaluations 는 실제 평가 엔드포인트를 부르고 reviewMode 를 표에 싣는다', () => {
  const body = source.slice(source.indexOf('async function loadQualityEvaluations'), source.indexOf('async function loadMediaCatalog'))
  assert.match(body, /fetch\('\/api\/admin\/v1\/evaluations'/)
  assert.match(body, /payload\.reviews/)
  assert.match(body, /item\.reviewMode === 'repaired' \? '2차 편집' : '3차 안전검수'/)
})

test('loadMediaCatalog 는 실제 미디어 엔드포인트를 부르고 미사용 자산 수를 알린다', () => {
  const body = source.slice(source.indexOf('async function loadMediaCatalog'), source.indexOf('async function loadMediaCatalog') + 900)
  assert.match(body, /fetch\('\/api\/admin\/v1\/media'/)
  assert.match(body, /payload\.assets/)
  assert.match(body, /item\.status === 'unused'/)
})

test('loadFunnelAnalytics 는 실제 퍼널 엔드포인트를 기간과 함께 부르고, steps·ctas 를 표로 그린다', () => {
  const body = source.slice(source.indexOf('async function loadFunnelAnalytics'), source.indexOf('async function loadReleaseInfo'))
  assert.match(body, /fetch\('\/api\/admin\/v1\/funnel\?period=' \+ encodeURIComponent\(period\)/)
  assert.match(body, /payload\.steps/)
  assert.match(body, /payload\.ctas/)
  assert.match(body, /item\.serviceKey \|\| '전체'/)
  // 기간을 바꾸면 이전 결과만 지우고 필터 폼 자체는 남아야 한다.
  assert.match(body, /resultNodes\.forEach\(function \(node\) \{ node\.remove\(\); \}\)/)
})

test('loadReleaseInfo 는 실제 릴리스 엔드포인트를 부르고, 규격 불일치를 알린다', () => {
  const body = source.slice(source.indexOf('async function loadReleaseInfo'), source.indexOf('async function loadReleaseInfo') + 900)
  assert.match(body, /fetch\('\/api\/admin\/v1\/release'/)
  assert.match(body, /release\.pinned/)
  assert.match(body, /release\.pins\.promptSpec/)
})
