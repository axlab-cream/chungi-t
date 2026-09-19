import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

const previousEnv = { ...process.env }
const nativeFetch = globalThis.fetch
process.env.SUPABASE_URL = 'https://live-data.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

type RequestLog = { url: URL; headers: Headers }
const requests: RequestLog[] = []

const MEMBER_A = '12345678-1234-1234-1234-123456789012'
const MEMBER_B = 'b2b2b2b2-2222-2222-2222-222222222222'

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const headers = new Headers(init?.headers)
  requests.push({ url, headers })
  if (url.pathname.includes('/auth/v1/admin/users/')) {
    const id = decodeURIComponent(url.pathname.split('/').pop() || '')
    if (id === MEMBER_A) {
      return new Response(JSON.stringify({ id, email: 'member-a@example.com', last_sign_in_at: '2026-09-15T03:00:00.000Z', app_metadata: { provider: 'kakao' } }), { status: 200 })
    }
    if (id === MEMBER_B) return new Response(JSON.stringify({ id, email: 'member-b@example.com' }), { status: 200 })
    return new Response(null, { status: 404 })
  }
  if (url.pathname.endsWith('/cheongi_payment_orders')) {
    const ownerId = url.searchParams.get('owner_id')
    if (ownerId === `eq.${MEMBER_A}`) {
      return new Response(JSON.stringify([
        { order_id: 'order-paid-1', owner_id: MEMBER_A, buyer_email: 'member-a@example.com', buyer_tel: '', product_key: 'cmdg', product_title: '종합사주', amount: 9900, status: 'paid', report_id: 'report-purchase-complete', created_at: '2026-09-10T00:00:00.000Z', updated_at: '2026-09-10T00:10:00.000Z' },
        { order_id: 'order-viewed-1', owner_id: MEMBER_A, buyer_email: 'member-a@example.com', buyer_tel: '', product_key: 'money_save', product_title: '돈 관리', amount: 5900, status: 'viewed', report_id: 'report-purchase-pending', created_at: '2026-09-11T00:00:00.000Z', updated_at: '2026-09-11T00:10:00.000Z' },
        { order_id: 'order-failed-1', owner_id: MEMBER_A, buyer_email: 'member-a@example.com', buyer_tel: '', product_key: 'cmdg', product_title: '종합사주', amount: 9900, status: 'failed', report_id: null, created_at: '2026-09-12T00:00:00.000Z', updated_at: '2026-09-12T00:10:00.000Z' },
      ]), { headers: { 'content-range': '0-2/3' } })
    }
    return new Response(JSON.stringify([]), { headers: { 'content-range': '*/0' } })
  }
  if (url.pathname.endsWith('/cheongi_reports') && url.searchParams.get('select') === 'report_id,payload') {
    return new Response(JSON.stringify([
      { report_id: 'report-purchase-complete', payload: { status: 'complete' } },
      { report_id: 'report-purchase-pending', payload: { status: 'generating' } },
    ]))
  }
  if (url.pathname.endsWith('/cheongi_user_profiles')) {
    const exact = url.searchParams.get('user_id')
    if (exact && exact !== `eq.${MEMBER_A}`) return new Response(JSON.stringify([]), { headers: { 'content-range': '*/0' } })
    return new Response(JSON.stringify([{ user_id: MEMBER_A, name: '홍길동', created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-02T00:00:00.000Z' }]), { headers: { 'content-range': '0-0/6' } })
  }
  if (url.pathname.endsWith('/cheongi_reports') && url.searchParams.get('select') === 'report_id') {
    // countLiveReports() 의 count-only 조회. 실제 행은 안 보고 content-range 헤더만 쓴다.
    return new Response(JSON.stringify([]), { headers: { 'content-range': '0-0/68' } })
  }
  if (url.pathname.endsWith('/cheongi_reports') && url.searchParams.get('select')?.includes('admin_status')) {
    if (url.searchParams.get('limit') === '2') {
      return new Response(JSON.stringify([
        { report_id: 'report-no-email-000', user_id: 'a1b2c3d4-owner', user_email: null, admin_status: 'new', payload: { status: 'complete', context: { serviceKey: 'today' } }, created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-02T00:00:00.000Z' },
        { report_id: 'report-no-owner-000', user_id: null, user_email: null, admin_status: 'new', payload: {}, created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-02T00:00:00.000Z' },
      ]), { headers: { 'content-range': '0-1/2' } })
    }
    return new Response(JSON.stringify([{ report_id: 'report-123456789', user_id: 'owner-123456789', user_email: 'customer@example.com', admin_status: 'new', payload: { context: { serviceKey: 'cmdg' }, birth: { year: 1990 } }, created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-02T00:00:00.000Z' }]), { headers: { 'content-range': '0-0/68' } })
  }
  if (url.pathname.endsWith('/cheongi_reports') && url.searchParams.get('select') === 'report_id,user_email,payload,updated_at' && url.searchParams.get('limit') === '400') {
    return new Response(JSON.stringify([
      {
        report_id: 'report-log-0001', user_email: 'buyer@example.com', updated_at: '2026-09-19T10:00:00.000Z',
        payload: {
          context: { serviceKey: 'marry_match' },
          report: {
            sections: [
              {
                id: 's1', classification: '결혼까지 가는 조건', status: 'complete',
                attempts: [
                  { id: 'a1', startedAt: '2026-09-19T09:00:00.000Z', model: 'gpt-5.6-luna', status: 'failed', error: 'OpenAI 잔액이 소진되어 생성할 수 없습니다. 크레딧을 충전하면 큐가 이어서 완성합니다.' },
                  { id: 'a2', startedAt: '2026-09-19T09:05:00.000Z', model: 'gpt-5.6-luna', status: 'complete' },
                ],
              },
              {
                id: 's2', classification: '돈 관리 방식', status: 'failed',
                attempts: [{ id: 'a3', startedAt: '2026-09-19T09:10:00.000Z', model: 'gpt-5.6-luna', status: 'failed', error: '요청이 일시적으로 거절되었습니다(status=429)' }],
              },
            ],
          },
        },
      },
      {
        // 실패 시도가 하나도 없는 리포트는 어떤 행도 만들지 않아야 한다.
        report_id: 'report-log-0002', user_email: 'other@example.com', updated_at: '2026-09-19T08:00:00.000Z',
        payload: { context: { serviceKey: 'money_save' }, report: { sections: [{ id: 's1', classification: '월급 안정러', status: 'complete', attempts: [{ id: 'a4', startedAt: '2026-09-19T07:00:00.000Z', model: 'gpt-5.6-luna', status: 'complete' }] }] } },
      },
    ]), { headers: { 'content-range': '0-1/2' } })
  }
  if (url.pathname.endsWith('/cheongi_reports')) {
    return new Response(JSON.stringify([
      {
        report_id: 'report-quality-0001', user_email: 'buyer@example.com', updated_at: '2026-09-18T12:00:00.000Z',
        payload: {
          context: { serviceKey: 'marry_match' },
          report: {
            sections: [
              { id: 's1', classification: '결혼까지 가는 조건', status: 'complete', reviewMode: 'strict' },
              { id: 's2', classification: '돈 관리 방식', status: 'complete', reviewMode: 'repaired' },
              { id: 's3', classification: '가족 문제', status: 'complete', reviewMode: 'lenient', reviewNotes: ['서비스 말투가 지정된 해요체를 벗어남'] },
            ],
          },
        },
      },
      {
        // 1차를 그대로 통과한 리포트는 어떤 항목도 이 목록에 실리지 않아야 한다.
        report_id: 'report-quality-0002', user_email: 'other@example.com', updated_at: '2026-09-18T11:00:00.000Z',
        payload: { context: { serviceKey: 'money_save' }, report: { sections: [{ id: 's1', classification: '월급 안정러', status: 'complete', reviewMode: 'strict' }] } },
      },
    ]), { headers: { 'content-range': '0-1/2' } })
  }
  throw new Error(`Unexpected request: ${url}`)
}) as typeof fetch

const liveData = await import('../../src/admin/live-data.js')

after(() => {
  globalThis.fetch = nativeFetch
  for (const name of Object.keys(process.env)) if (!(name in previousEnv)) delete process.env[name]
  Object.assign(process.env, previousEnv)
})

describe('관리자 실데이터 DTO', { concurrency: false }, () => {
  before(() => { requests.length = 0 })

  it('회원 목록은 생년월일·성별 같은 프로필 원문은 요청하지 않고, 가입·인증·구매 요약을 합쳐 돌려준다', async () => {
    const members = await liveData.listLiveMembers(1)
    assert.deepEqual(members, [{
      no: 1, id: MEMBER_A, name: '홍길동', email: 'member-a@example.com',
      createdAt: '2026-09-01T00:00:00.000Z', lastSignInAt: '2026-09-15T03:00:00.000Z', signupProvider: 'kakao',
      personalInfoRegistered: true, purchaseCount: 2, totalPurchaseAmount: 15800,
      updatedAt: '2026-09-02T00:00:00.000Z',
    }])
    const profileRequest = requests.find((r) => r.url.pathname.endsWith('/cheongi_user_profiles'))
    assert.equal(profileRequest?.url.searchParams.get('select'), 'user_id,name,created_at,updated_at')
    assert.equal(profileRequest?.headers.get('apikey'), 'test-service-role-key')
  })

  it('리포트 원문·생년월일을 DTO로 흘리지 않고 상태와 서비스 키만 반환한다', async () => {
    const reports = await liveData.listLiveReports(1)
    assert.deepEqual(reports, [{ reportId: 'report••••', id: 'report-123456789', member: 'c•••@example.com', serviceKey: 'cmdg', status: 'new', pdfReady: false, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-02T00:00:00.000Z' }])
    const reportRequest = requests.find((r) => r.url.pathname.endsWith('/cheongi_reports') && r.url.searchParams.get('select')?.includes('admin_status'))
    assert.equal(reportRequest?.url.searchParams.get('select'), 'report_id,user_id,user_email,admin_status,payload,created_at,updated_at')
    assert.ok(!JSON.stringify(reports).includes('1990'))
  })

  it('운영 요약용 카운트는 원본 테이블의 exact count 헤더를 사용한다', async () => {
    const before = requests.length
    assert.equal(await liveData.countLiveMembers(), 6)
    assert.equal(await liveData.countLiveReports(), 68)
    const countRequests = requests.slice(before)
    assert.equal(countRequests[0]?.headers.get('prefer'), 'count=exact')
    assert.equal(countRequests[1]?.headers.get('prefer'), 'count=exact')
  })

  /**
   * 2026-09-19: "평가" 메뉴는 별도 저장소가 없다 — 생성 파이프라인이 이미 남기는
   * reviewMode(repaired·lenient)를 그대로 뽑아 보여준다. 1차를 그대로 통과한(strict)
   * 항목은 검토 이력이 아니므로 목록에 나오면 안 된다.
   */
  it('1차 엄격 검수를 못 넘고 2·3차로 완성된 항목만 뽑고, strict 는 걸러낸다', async () => {
    const reviews = await liveData.listQualityReviews(10)
    assert.deepEqual(reviews, [
      { reportId: 'report••••', member: 'b•••@example.com', serviceKey: 'marry_match', sectionId: 's2', classification: '돈 관리 방식', reviewMode: 'repaired', reviewNotes: '기록 없음', updatedAt: '2026-09-18T12:00:00.000Z' },
      { reportId: 'report••••', member: 'b•••@example.com', serviceKey: 'marry_match', sectionId: 's3', classification: '가족 문제', reviewMode: 'lenient', reviewNotes: '서비스 말투가 지정된 해요체를 벗어남', updatedAt: '2026-09-18T12:00:00.000Z' },
    ])
    // report-quality-0002 는 strict 뿐이라 어떤 행도 만들지 않았다.
    assert.ok(!reviews.some((review) => review.serviceKey === 'money_save'))
  })

  /**
   * 2026-09-19: "로그" 메뉴는 별도 저장소가 없다 — 생성 파이프라인이 이미 남기는 실패
   * 시도(attempts[].status==='failed')를 시간순으로 뽑는다. 성공한 시도, 실패가 없는
   * 리포트는 걸러낸다.
   */
  it('실패한 시도만 뽑아 최신순으로 정렬하고, 성공한 시도는 걸러낸다', async () => {
    const failures = await liveData.listGenerationFailureLog()
    assert.deepEqual(failures, [
      { reportId: 'report••••', member: 'b•••@example.com', serviceKey: 'marry_match', sectionId: 's2', errorSummary: '요청이 일시적으로 거절되었습니다(status=429)', model: 'gpt-5.6-luna', occurredAt: '2026-09-19T09:10:00.000Z' },
      { reportId: 'report••••', member: 'b•••@example.com', serviceKey: 'marry_match', sectionId: 's1', errorSummary: 'OpenAI 잔액이 소진되어 생성할 수 없습니다. 크레딧을 충전하면 큐가 이어서 완성합니다.', model: 'gpt-5.6-luna', occurredAt: '2026-09-19T09:00:00.000Z' },
    ])
    assert.ok(!failures.some((failure) => failure.serviceKey === 'money_save'), '실패 시도가 없는 리포트가 로그에 섞였다')
  })

  /**
   * 2026-09-19: "연결되지 않음"이 회원 자체가 없다는 뜻으로 읽혔지만, 실제로는 이메일만
   * 없고 회원 계정(user_id)은 있는 경우가 섞여 있었다(가입 경로에 따라 이메일이 없을 수
   * 있다). user_id 가 있으면 마스킹해 보여줘 "진짜 연결 없음"과 구분한다.
   */
  it('이메일이 없어도 회원 ID 가 있으면 마스킹된 ID 로 구분하고, 둘 다 없을 때만 연결되지 않음이다', async () => {
    const reports = await liveData.listLiveReports(2)
    assert.equal(reports.length, 2)
    assert.equal(reports[0].member, '이메일 없음(회원 a1b2c3••••)')
    assert.equal(reports[1].member, '연결되지 않음')
  })

  /**
   * 2026-09-19: 리포트 화면의 "PDF 받기" 버튼은 report.status 가 아니라 record 최상위
   * payload.status 가 'complete' 일 때만 보인다(admin_status·report.status 와는 다른 필드).
   */
  it('PDF 버튼은 payload.status 가 complete 일 때만 보인다', async () => {
    const reports = await liveData.listLiveReports(2)
    assert.equal(reports[0].pdfReady, true)
    assert.equal(reports[1].pdfReady, false)
  })

  /**
   * 2026-09-19: 회원 상세의 구매 목록 — 실패(failed) 주문은 목록에는 실리지만 구매
   * 건수·총액에는 안 들어간다(paid·viewed 만 "구매"로 센다). 완료 여부는 리포트 화면의
   * pdfReady 와 같은 판정(payload.status==='complete')을 주문에 묶인 reportId 로 조회한다.
   */
  it('구매 목록은 실패 주문도 보여주되, 건수·총액은 결제 완료(paid·viewed)만 센다', async () => {
    const overview = await liveData.listMemberPurchases(MEMBER_A)
    assert.equal(overview.purchaseCount, 2)
    assert.equal(overview.totalPurchaseAmount, 15800)
    assert.equal(overview.purchases.length, 3)
    const byId = new Map(overview.purchases.map((p) => [p.orderId, p]))
    assert.equal(byId.get('order-paid-1')?.reportComplete, true)
    assert.equal(byId.get('order-viewed-1')?.reportComplete, false)
    assert.equal(byId.get('order-failed-1')?.reportComplete, null, '리포트가 안 묶인 주문은 완료 여부가 해당 없음(null)이다')
  })

  it('없는 회원 ID 는 임의 값을 지어내지 않고 null 을 돌려준다', async () => {
    const summary = await liveData.findLiveMember('unknown-member-id')
    assert.equal(summary, null)
  })
})
