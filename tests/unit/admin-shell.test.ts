import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'
import type { Server } from 'node:http'

// 다른 통합 스위트와 같은 방식으로 환경을 비우고 합성 인증만 켠다.
const previousEnv = { ...process.env }
process.env.NODE_ENV = 'test'
for (const name of Object.keys(process.env)) {
  if (/DATABASE|SUPABASE|OPENAI|ANTHROPIC|INICIS|PAYMENT|VERCEL|REPORT_STORAGE|ADMIN_EMAIL/.test(name)) delete process.env[name]
}
const nativeFetch = globalThis.fetch
let origin = ''
const unexpected: string[] = []
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (url.href === 'https://synthetic-auth.invalid/auth/v1/user') {
    const token = new Headers(init?.headers).get('authorization')?.replace(/^Bearer /, '')
    // `revoked` 토큰은 Supabase 가 거부하는 상황을 재현한다.
    if (!token || token === 'revoked') {
      return new Response(JSON.stringify({ error: 'invalid' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ id: token, email: `${token}@synthetic.invalid` }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  if (origin && url.origin === origin) return nativeFetch(input, init)
  unexpected.push(url.origin)
  throw new Error('External requests are forbidden in this suite')
}) as typeof fetch

process.env.SUPABASE_URL = 'https://synthetic-auth.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'synthetic-public-fixture-only'
// 관리자 판정 근거는 이메일 허용 목록 하나다(T05 의 RBAC 이전 단계).
process.env.UMSH_ADMIN_EMAILS = 'staff@synthetic.invalid'
const { default: app } = await import('../../src/server/app.js')

let server: Server

async function request(path: string, token?: string) {
  const response = await fetch(origin + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    redirect: 'manual',
  })
  return { response, text: await response.text() }
}

before(async () => {
  server = await new Promise<Server>((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
    instance.once('error', reject)
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  origin = `http://127.0.0.1:${address.port}`
})

after(async () => {
  if (server) {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
  globalThis.fetch = nativeFetch
  for (const name of Object.keys(process.env)) if (!(name in previousEnv)) delete process.env[name]
  Object.assign(process.env, previousEnv)
  assert.deepEqual(unexpected, [])
})

describe('관리자 셸 (T07)', { concurrency: false }, () => {
  describe('보안', () => {
    it('셸 소스가 정적 경로로 열리지 않는다', async () => {
      // ADR-0002 D1: 소스를 정적 루트 밖에 둔다. `사주/` 아래 두면
      // `express.static(SAJU_ROOT)` 가 인증 검사 없이 파일을 내보낸다.
      for (const path of ['/admin-ui/index.html', '/admin-ui/', '/%61dmin-ui/index.html']) {
        const { response } = await request(path)
        assert.equal(response.status, 404, `${path} 가 ${response.status} 로 열렸다`)
      }
    })

    it('셸에 설정값·키·목록이 들어 있지 않다', async () => {
      // D2-5: 관리자 자산에는 어떤 설정값·키·엔드포인트 비밀도 인라인하지 않는다.
      const { text } = await request('/admin')
      for (const secret of ['SUPABASE', 'INICIS', 'apikey', 'service_role', 'synthetic-public-fixture-only', 'staff@synthetic.invalid']) {
        assert.ok(!text.includes(secret), `셸에 ${secret} 가 인라인됐다`)
      }
    })

    it('관리자 응답은 색인되지 않는다', async () => {
      for (const path of ['/admin', '/admin/orders']) {
        const { response } = await request(path)
        assert.match(response.headers.get('x-robots-tag') ?? '', /noindex/, `${path} 에 noindex 가 없다`)
        assert.match(response.headers.get('cache-control') ?? '', /no-store/, `${path} 가 캐시될 수 있다`)
      }
    })

    it('robots.txt 가 관리자 경로를 막는다', () => {
      const robots = readFileSync(new URL('../../사주/robots.txt', import.meta.url), 'utf8')
      assert.match(robots, /^Disallow: \/admin$/m)
    })

    it('미로그인은 데이터를 받지 못한다', async () => {
      // A01: `/admin` 직접 접근(미로그인)은 데이터 없이 응답한다.
      const { response, text } = await request('/api/admin/v1/me')
      assert.equal(response.status, 401)
      assert.equal(JSON.parse(text).code, 'AUTH_REQUIRED')
      assert.equal(JSON.parse(text).email, undefined)
    })

    it('권한 없는 회원과 미로그인을 구분한다', async () => {
      // A35: 권한 없음과 미로그인은 서로 다른 UI 상태여야 한다.
      const { response, text } = await request('/api/admin/v1/me', 'customer')
      assert.equal(response.status, 403)
      assert.equal(JSON.parse(text).code, 'STAFF_MEMBERSHIP_REQUIRED')
      assert.equal(JSON.parse(text).scopes, undefined, '권한 없는 회원에게 scope 를 내려보냈다')
    })

    it('레거시 unlock 이메일로는 관리자 권한이 열리지 않는다', async () => {
      // A02. `isAdminEmail`·`isAdminOwner` 는 **결제 없이 유료 리포트를 여는 레거시
      // unlock** 목록이다. 그것을 운영 권한으로 재사용하면 직원 membership 없이 관리자
      // API 가 열리고 회수·감사 경로가 없는 "코드에 박힌 권한"이 된다.
      // 초판 구현이 실제로 그렇게 열려 있었다(2026-09-10 Codex 리뷰 Critical).
      const { isAdminEmail } = await import('../../src/auth/admin.js')
      assert.equal(isAdminEmail('staff@synthetic.invalid'), true, '픽스처가 unlock 목록에 있어야 이 검사가 성립한다')

      const { response, text } = await request('/api/admin/v1/me', 'staff')
      assert.equal(response.status, 403, 'unlock 이메일에 관리자 권한이 열렸다')
      const denied = JSON.parse(text)
      assert.equal(denied.code, 'STAFF_MEMBERSHIP_REQUIRED')
      assert.equal(denied.scopes, undefined)
      assert.equal(denied.email, undefined, '판정 근거가 없는데 회원 정보를 내려보냈다')
    })

    it('토큰이 거부되면 재로그인으로 안내한다', async () => {
      const { response, text } = await request('/api/admin/v1/me', 'revoked')
      assert.equal(response.status, 401)
      assert.equal(JSON.parse(text).code, 'AUTH_REQUIRED')
    })

    it('관리자 응답에 Vary: Authorization 이 붙는다', async () => {
      // D2-1: `/api` 접두어 안에 두어 no-store + Vary 가 자동 적용된다.
      const { response } = await request('/api/admin/v1/me', 'customer')
      assert.match(response.headers.get('vary') ?? '', /Authorization/i)
      assert.match(response.headers.get('cache-control') ?? '', /no-store/)
    })
  })

  describe('정상 동작', () => {
    it('직원 권한 원본이 없는 동안 아무에게도 권한을 주지 않는다', async () => {
      // T05 가 회수 가능한 membership 원본을 만들 때까지 이 상태가 정답이다.
      // 그때 이 테스트는 membership fixture 기반 200 검사로 교체한다.
      for (const token of ['staff', 'customer', 'another-member']) {
        const { response, text } = await request('/api/admin/v1/me', token)
        assert.equal(response.status, 403, `${token} 에 권한이 열렸다`)
        assert.equal(JSON.parse(text).code, 'STAFF_MEMBERSHIP_REQUIRED')
      }
    })

    it('셸이 진입점과 딥링크 모두에서 열린다', async () => {
      // D2-4: `/admin/*` 미매칭 경로를 정적 탐색으로 흘리지 않는다.
      for (const path of ['/admin', '/admin/', '/admin/index.html', '/admin/orders', '/admin/members/deep/link']) {
        const { response, text } = await request(path)
        assert.equal(response.status, 200, `${path} 가 ${response.status} 로 응답했다`)
        assert.match(text, /운영 관리자/, `${path} 가 셸을 주지 않았다`)
      }
    })

    it('셸이 네 가지 상태를 구분해 갖고 있다', async () => {
      // A35: 빈 목록 / 필터 결과 없음 / 조회 실패 / 권한 없음을 서로 다른 상태로 둔다.
      const { text } = await request('/admin')
      for (const state of ['anonymous', 'forbidden', 'error', 'ready']) {
        assert.ok(text.includes(`data-admin-state="${state}"`), `셸에 ${state} 상태가 없다`)
      }
    })

    it('셸이 레퍼런스의 색상값·토큰 이름을 쓰지 않는다', async () => {
      // ADR-0002 D3: 원칙만 차용하고 토큰은 독립 정의한다.
      const { text } = await request('/admin')
      assert.ok(!/--sk-/.test(text), '레퍼런스 토큰 이름이 남았다')
      assert.ok(!/#ea1738/i.test(text), '레퍼런스 색상값이 남았다')
      assert.ok(!/skmagic/i.test(text), '레퍼런스 CDN 경로가 남았다')
      assert.match(text, /--admin-state-ok/, '의미 기반 토큰이 없다')
      assert.match(text, /tabular-nums/, '금액 정렬 규범이 없다')
    })
  })
})
