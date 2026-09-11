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
  if (url.pathname.endsWith('/cheongi_reports')) {
    return new Response(JSON.stringify([{ report_id: 'report-123456789', user_email: 'customer@example.com', admin_status: 'new', payload: { context: { serviceKey: 'cmdg' }, birth: { year: 1990 } }, created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-02T00:00:00.000Z' }]), { headers: { 'content-range': '0-0/68' } })
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
    assert.equal(requests[1]?.url.searchParams.get('select'), 'report_id,user_email,admin_status,payload,created_at,updated_at')
    assert.ok(!JSON.stringify(reports).includes('1990'))
  })

  it('운영 요약용 카운트는 원본 테이블의 exact count 헤더를 사용한다', async () => {
    assert.equal(await liveData.countLiveMembers(), 6)
    assert.equal(await liveData.countLiveReports(), 68)
    assert.equal(requests[2]?.headers.get('prefer'), 'count=exact')
    assert.equal(requests[3]?.headers.get('prefer'), 'count=exact')
  })
})
