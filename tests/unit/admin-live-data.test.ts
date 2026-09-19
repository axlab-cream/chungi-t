import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

const previousEnv = { ...process.env }
const nativeFetch = globalThis.fetch
process.env.SUPABASE_URL = 'https://live-data.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

type RequestLog = { url: URL; headers: Headers }
const requests: RequestLog[] = []

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const headers = new Headers(init?.headers)
  requests.push({ url, headers })
  if (url.pathname.endsWith('/cheongi_user_profiles')) {
    return new Response(JSON.stringify([{ user_id: '12345678-1234-1234-1234-123456789012', name: '홍길동', created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-02T00:00:00.000Z' }]), { headers: { 'content-range': '0-0/6' } })
  }
  if (url.pathname.endsWith('/cheongi_reports') && url.searchParams.get('select') === 'report_id') {
    // countLiveReports() 의 count-only 조회. 실제 행은 안 보고 content-range 헤더만 쓴다.
    return new Response(JSON.stringify([]), { headers: { 'content-range': '0-0/68' } })
  }
  if (url.pathname.endsWith('/cheongi_reports') && url.searchParams.get('select')?.includes('admin_status')) {
    if (url.searchParams.get('limit') === '2') {
      return new Response(JSON.stringify([
        { report_id: 'report-no-email-000', user_id: 'a1b2c3d4-owner', user_email: null, admin_status: 'new', payload: { context: { serviceKey: 'today' } }, created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-02T00:00:00.000Z' },
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

  it('회원 원본에서 생년월일·성별·프로필 원문을 요청하거나 반환하지 않는다', async () => {
    const members = await liveData.listLiveMembers(1)
    assert.deepEqual(members, [{ memberId: '123456••••', name: '홍•', createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-02T00:00:00.000Z' }])
    assert.equal(requests[0]?.url.searchParams.get('select'), 'user_id,name,created_at,updated_at')
    assert.equal(requests[0]?.headers.get('apikey'), 'test-service-role-key')
  })

  it('리포트 원문·생년월일을 DTO로 흘리지 않고 상태와 서비스 키만 반환한다', async () => {
    const reports = await liveData.listLiveReports(1)
    assert.deepEqual(reports, [{ reportId: 'report••••', member: 'c•••@example.com', serviceKey: 'cmdg', status: 'new', createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-02T00:00:00.000Z' }])
    assert.equal(requests[1]?.url.searchParams.get('select'), 'report_id,user_id,user_email,admin_status,payload,created_at,updated_at')
    assert.ok(!JSON.stringify(reports).includes('1990'))
  })

  it('운영 요약용 카운트는 원본 테이블의 exact count 헤더를 사용한다', async () => {
    assert.equal(await liveData.countLiveMembers(), 6)
    assert.equal(await liveData.countLiveReports(), 68)
    assert.equal(requests[2]?.headers.get('prefer'), 'count=exact')
    assert.equal(requests[3]?.headers.get('prefer'), 'count=exact')
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
})
