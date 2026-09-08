import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
const window: any = {}
test('shared layout dashboard is removed from all eleven topic pages and the index', () => {
  const source = readFileSync('사주/js/home-dashboard.js', 'utf8')
  for (const section of ['terrain-support','external-flow','light-air-noise','building-unit','entrance-flow','sleep-recovery','remote-focus','money-living','relationship-cohabitation','saju-house-ohaeng','reality-action','index']) {
    let removed = false
    const localWindow: any = {}
    runInNewContext(source, {window:localWindow,URLSearchParams,location:{search:'?section='+section},document:{getElementById:(id: string) => id === 'home-dashboard' ? {remove:() => {removed = true}} : section === 'index' ? null : {}}})
    localWindow.UMSHHomeDashboard.render({report:{}})
    assert.equal(removed, true, section)
  }
})
runInNewContext(readFileSync('사주/js/home-dashboard.js', 'utf8'), {window})
test('dashboard distinguishes input coverage from compatibility and omits unknown charts', () => {
  const model = window.UMSHHomeDashboard.model({context:{home:{mainPurpose:'rest',buildingType:'apartment',bedroomFeel:'quiet'}}})
  assert.equal(model.score, 50)
  const html = window.UMSHHomeDashboard.html({})
  assert.match(html, /궁합 점수가 아닙니다/)
  assert.match(html, /한눈에 보는 8축 점수판/)
  assert.match(html, /분석 대기/)
  assert.match(html, /터 유사도/)
  assert.doesNotMatch(html, /DEM|자료 없음|측정 전/)
  assert.match(html, /오행 분포를 표시할 계산값이 충분하지/)
  const unknown = window.UMSHHomeDashboard.model({context:{birthTimeKnown:false},analysis:{elements:{wood:2,fire:2,earth:2,metal:1,water:1}}})
  assert.equal(unknown.total, 0)
  assert.equal(unknown.axisScores.length, 8)
  assert.equal(unknown.axisScores[0].section, 'terrain-support')
  assert.equal(unknown.axisScores[1].section, 'external-flow')
  assert.equal(unknown.axisScores[2].section, 'light-air-noise')
})
test('dashboard renders site similarity, escaped text and report-specific links', () => {
  const html = window.UMSHHomeDashboard.html({reportId:'saved-id',context:{home:{terrainEvidence:{siteSimilarityScore:82,siteSimilarityLabel:'완만한 생활권형 <script>bad</script>',summary:'<script>bad</script>'}}},analysis:{elements:{wood:4,fire:1,earth:1,metal:1,water:1},fortune:{currentYear:2026,yearPillar:'丙午'}}})
  assert.match(html, /82점/)
  assert.match(html, /width:50%/)
  assert.match(html, /reportId=saved-id&amp;section=sleep-recovery/)
  assert.doesNotMatch(html, /<script>bad/)
  assert.match(html, /2026년 · 丙午/)
})
