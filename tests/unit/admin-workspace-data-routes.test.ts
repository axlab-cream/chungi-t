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

test('renderWorkspace 가 통계·릴리스·평가·미디어·장애·로그를 각각의 실제 로더로 연결한다', () => {
  const body = source.slice(source.indexOf('function renderWorkspace'), source.indexOf('function renderWorkspace') + 2000)
  assert.match(body, /if \(route\.key === 'analytics'\) \{ loadFunnelAnalytics\(body\); return; \}/)
  assert.match(body, /if \(route\.key === 'releases'\) \{ loadReleaseInfo\(body\); return; \}/)
  assert.match(body, /if \(route\.key === 'evaluations'\) \{ loadQualityEvaluations\(body\); return; \}/)
  assert.match(body, /if \(route\.key === 'media'\) \{ loadMediaCatalog\(body\); return; \}/)
  assert.match(body, /if \(route\.key === 'incidents'\) \{ loadIncidents\(body\); return; \}/)
  assert.match(body, /if \(route\.key === 'logs'\) \{ loadGenerationLog\(body\); return; \}/)
  // 여섯 분기 모두 "아직 생성되지 않았습니다" 안내보다 앞에 있어야 실제로 도달한다.
  const fallbackAt = body.indexOf('아직 생성되지 않았습니다')
  for (const key of ['analytics', 'releases', 'evaluations', 'media', 'incidents', 'logs']) {
    const at = body.indexOf(`route.key === '${key}'`)
    assert.ok(at >= 0 && at < fallbackAt, `${key} 분기가 없거나 안내 뒤에 있다`)
  }
})

test('loadGenerationLog 는 실제 로그 엔드포인트를 부르고, 실패 사유를 시간순으로 싣는다', () => {
  const body = source.slice(source.indexOf('async function loadGenerationLog'), source.indexOf('async function loadGenerationLog') + 900)
  assert.match(body, /fetch\('\/api\/admin\/v1\/logs'/)
  assert.match(body, /payload\.failures/)
  assert.match(body, /item\.errorSummary/)
})

test('loadIncidents 는 실제 장애 엔드포인트를 부르고, 등록 폼을 함께 그린다', () => {
  const body = source.slice(source.indexOf('async function loadIncidents'), source.indexOf('async function renderIncidentDetail'))
  assert.match(body, /fetch\('\/api\/admin\/v1\/incidents', \{ method: 'POST'/)
  assert.match(body, /fetch\('\/api\/admin\/v1\/incidents', \{ credentials: 'same-origin' \}\)/)
  assert.match(body, /listPayload\.incidents/)
})

test('renderIncidentDetail 은 상태 변경에 expectedRevision 을 싣고, 제목·요약을 이스케이프한다', () => {
  const body = source.slice(source.indexOf('async function renderIncidentDetail'), source.indexOf('function renderWorkspace'))
  assert.match(body, /expectedRevision: item\.revision/)
  assert.match(body, /escapeHtml\(item\.title\)/)
  assert.match(body, /escapeHtml\(item\.summary\)/)
  assert.match(body, /fetch\('\/api\/admin\/v1\/incidents\/' \+ encodeURIComponent\(item\.id\) \+ '\/updates'/)
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

/**
 * 2026-09-19: 서비스 카탈로그는 코드로 관리되어 실제로 지울 수 없다 — 판매 중단
 * (saleAvailable=false, 결제 생성 자체를 막는다) + 검색 노출 해제가 이 시스템의 "삭제"다.
 * 행을 눌러 수정하고, 발행 기록이 없는 서비스는 일괄 초기화로 채운다.
 */
test('loadLiveServices 는 행마다 수정 버튼을 달고, 발행 기록 없는 서비스만 일괄 초기화 대상으로 삼는다', () => {
  const body = source.slice(source.indexOf('async function loadLiveServices'), source.indexOf('function renderServiceDetail'))
  assert.match(body, /fetch\('\/api\/admin\/v1\/services', \{ credentials: 'same-origin' \}\)/)
  assert.match(body, /edit\.addEventListener\('click', function \(\) \{ renderServiceDetail\(body, item\); \}\)/)
  assert.match(body, /return !item\.publishedVersion && !item\.draftVersion;/)
  assert.match(body, /expectedRevision: -1/)
  assert.match(body, /saleAvailable: true/)
})

test('renderServiceDetail 은 초안 저장 후에만 발행 버튼을 열고, 판매 가능·검색 노출 체크박스를 함께 보낸다', () => {
  const body = source.slice(source.indexOf('function renderServiceDetail'), source.indexOf('async function loadLiveCorpus'))
  assert.match(body, /publishArea\.hidden = true;/)
  assert.match(body, /discoveryVisible: form\.elements\.discoveryVisible\.checked, saleAvailable: form\.elements\.saleAvailable\.checked/)
  assert.match(body, /fetch\('\/api\/admin\/v1\/services\/' \+ encodeURIComponent\(item\.canonicalKey\) \+ '\/draft'/)
  assert.match(body, /publishArea\.hidden = false;/)
  assert.match(body, /fetch\('\/api\/admin\/v1\/services\/' \+ encodeURIComponent\(item\.canonicalKey\) \+ '\/publish'/)
  assert.match(body, /완전히 삭제할 수 없습니다/)
})

/**
 * 2026-09-19 (T30): 발행하면 다음 생성 요청부터 실제 유료 고객 리포트에 반영되므로,
 * 두 단계(초안 저장 → 명시적 발행 확인)와 강한 경고 문구가 반드시 있어야 한다.
 */
test('loadPromptContentEditor 는 21개 항목에 수정 버튼을 달아 렌더한다', () => {
  const body = source.slice(source.indexOf('async function loadPromptContentEditor'), source.indexOf('function renderPromptContentDetail'))
  assert.match(body, /fetch\('\/api\/admin\/v1\/prompts\/content', \{ credentials: 'same-origin' \}\)/)
  assert.match(body, /edit\.addEventListener\('click', function \(\) \{ renderPromptContentDetail\(body, item\); \}\)/)
})

test('renderPromptContentDetail 은 발행 전 명시적 확인을 요구하고, 초안 저장 후에만 발행 버튼을 연다', () => {
  const body = source.slice(source.indexOf('function renderPromptContentDetail'), source.indexOf('async function loadLiveAudit'))
  assert.match(body, /publishArea\.hidden = true;/)
  assert.match(body, /fetch\('\/api\/admin\/v1\/prompts\/content\/' \+ encodeURIComponent\(item\.contentType\) \+ '\/' \+ encodeURIComponent\(item\.contentKey\) \+ '\/draft'/)
  assert.match(body, /publishArea\.hidden = false;/)
  assert.match(body, /window\.confirm\('이 초안을 발행하면 다음 생성 요청부터 실제 유료 고객 리포트에 바로 반영됩니다/)
  assert.match(body, /fetch\('\/api\/admin\/v1\/prompts\/content\/' \+ encodeURIComponent\(item\.contentType\) \+ '\/' \+ encodeURIComponent\(item\.contentKey\) \+ '\/publish'/)
})

/**
 * 2026-09-19 (T24): "콘텐츠" 메뉴가 renderWorkspace 분기에 없어 항상 "아직 생성되지
 * 않았습니다" 안내로 떨어졌다 — 화면이 비어 보인다는 사용자 보고로 발견.
 */
test('renderWorkspace 는 콘텐츠 메뉴를 loadLiveContent 로 연결한다', () => {
  const body = source.slice(source.indexOf('function renderWorkspace'), source.indexOf('function renderWorkspace') + 2200)
  assert.match(body, /if \(route\.key === 'content'\) \{ loadLiveContent\(body\); return; \}/)
})

test('loadLiveContent 는 T29 어댑터 부재를 화면에 정직하게 알리고, 초안은 등록 후 목록에서 수정·발행·보관할 수 있다', () => {
  const body = source.slice(source.indexOf('async function loadLiveContent'), source.indexOf('function renderContentDetail'))
  assert.match(body, /T29\)는 아직 없어/)
  assert.match(body, /fetch\('\/api\/admin\/v1\/content', \{ method: 'POST'/)
  assert.match(body, /fetch\('\/api\/admin\/v1\/content', \{ credentials: 'same-origin' \}\)/)
  assert.match(body, /edit\.addEventListener\('click', function \(\) \{ renderContentDetail\(body, item\); \}\)/)
  assert.match(body, /fetch\('\/api\/admin\/v1\/content\/' \+ encodeURIComponent\(item\.id\) \+ '\/archive'/)
})

test('renderContentDetail 은 저장 후에만 게시 버튼을 열고, 게시 전 확인을 요구한다', () => {
  const body = source.slice(source.indexOf('function renderContentDetail'), source.indexOf('async function loadLiveAudit'))
  assert.match(body, /publishArea\.hidden = true;/)
  assert.match(body, /fetch\('\/api\/admin\/v1\/content\/' \+ encodeURIComponent\(item\.id\), \{ method: 'PATCH'/)
  assert.match(body, /publishArea\.hidden = false;/)
  assert.match(body, /window\.confirm\('이 초안을 게시합니다/)
  assert.match(body, /fetch\('\/api\/admin\/v1\/content\/' \+ encodeURIComponent\(item\.id\) \+ '\/publish'/)
})

test('loadLiveReports 는 미완성 리포트 재시도 버튼을 기존 백엔드 라우트에 연결한다', () => {
  const body = source.slice(source.indexOf('async function loadLiveReports'), source.indexOf('async function loadLiveOverview'))
  assert.match(body, /fetch\('\/api\/admin\/v1\/reports\/requeue-incomplete', \{ method: 'POST'/)
  assert.match(body, /fetch\('\/api\/admin\/v1\/reports', \{ credentials: 'same-origin' \}\)/)
})

/**
 * 2026-09-19: 회원 목록(loadLiveMembers)의 마스킹은 그대로 둔다 — 상세·수정은
 * "정확 식별자 검색" 결과에서만 연다(정확한 ID를 이미 입력한 뒤라야 한다).
 */
test('loadAdminSearch 는 회원 검색 결과에서만 프로필 상세 버튼을 달고, 목록 마스킹은 건드리지 않는다', () => {
  const body = source.slice(source.indexOf('function loadAdminSearch'), source.indexOf('async function renderMemberDetail'))
  assert.match(body, /if \(kind === 'member'\) \{/)
  assert.match(body, /renderMemberDetail\(result, exactId\)/)
})

test('renderMemberDetail 은 회원 상세를 불러와 채우고, 저장·계정 정지를 감사 라우트로 보낸다', () => {
  const body = source.slice(source.indexOf('async function renderMemberDetail'), source.length)
  assert.match(body, /fetch\('\/api\/admin\/v1\/members\/' \+ encodeURIComponent\(userId\), \{ credentials: 'same-origin' \}\)/)
  assert.match(body, /method: 'PATCH'/)
  assert.match(body, /fetch\('\/api\/admin\/v1\/members\/' \+ encodeURIComponent\(userId\) \+ '\/status'/)
  assert.match(body, /banned: next/)
})

test('loadOpsJobs 는 dead 작업에만 진단 버튼을 달고, 진단 화면은 확인 뒤에만 재시작한다', () => {
  const jobs = source.slice(source.indexOf('async function loadOpsJobs'), source.indexOf('async function renderReportDiagnostics'))
  assert.match(jobs, /item\.kind === 'report\.sections\.complete' && item\.state === 'dead'/)
  assert.match(jobs, /renderReportDiagnostics\(body, item\.target_id\)/)
  const diagnostics = source.slice(source.indexOf('async function renderReportDiagnostics'), source.indexOf('function refundStatus'))
  assert.match(diagnostics, /fetch\('\/api\/admin\/v1\/reports\/' \+ encodeURIComponent\(reportId\) \+ '\/diagnostics'/)
  assert.match(diagnostics, /window\.confirm\('미완성 항목의 포기 상한을 다시 열고/)
  assert.match(diagnostics, /fetch\('\/api\/admin\/v1\/reports\/' \+ encodeURIComponent\(reportId\) \+ '\/restart', \{ method: 'POST'/)
  assert.match(diagnostics, /if \(d\.status !== 'complete'\)/, '완성된 리포트에는 재시작 버튼을 내지 않는다')
})

test('loadOpsJobs 는 일시정지·정리를 기존 백엔드 라우트에 연결한다', () => {
  const body = source.slice(source.indexOf('async function loadOpsJobs'), source.indexOf('async function renderReportDiagnostics'))
  assert.match(body, /fetch\('\/api\/admin\/v1\/jobs\/pause', \{ credentials: 'same-origin' \}\)/)
  assert.match(body, /fetch\('\/api\/admin\/v1\/jobs\/pause', \{ method: 'POST'/)
  assert.match(body, /body: JSON\.stringify\(\{ paused: next \}\)/)
  assert.match(body, /fetch\('\/api\/admin\/v1\/jobs\/purge', \{ method: 'POST'/)
  assert.match(body, /\^\[a-zA-Z0-9_-\]\{8,160\}\$/)
})
