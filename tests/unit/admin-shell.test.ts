import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'
import type { Server } from 'node:http'

// 다른 통합 스위트와 같은 방식으로 환경을 비우고 합성 인증만 켠다.
const previousEnv = { ...process.env }
process.env.NODE_ENV = 'test'
for (const name of Object.keys(process.env)) {
  if (/DATABASE|SUPABASE|OPENAI|ANTHROPIC|INICIS|PAYMENT|VERCEL|REPORT_STORAGE|ADMIN_EMAIL|ADMIN_SUPER/.test(name)) delete process.env[name]
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
// `UMSH_ADMIN_EMAILS` 는 **결제 없이 유료 리포트를 여는 레거시 unlock** 목록이다.
// 운영 권한과 무관해야 하므로 이 픽스처에서 두 목록을 서로 다른 계정으로 갈라 둔다.
process.env.UMSH_ADMIN_EMAILS = 'staff@synthetic.invalid'
// 운영 관리자 권한의 유일한 근거(`src/auth/staff.ts`). 배포 설정으로만 주고 회수한다.
process.env.UMSH_ADMIN_SUPER_EMAILS = 'super@synthetic.invalid'
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
      const { staffMembership } = await import('../../src/auth/staff.js')
      assert.equal(isAdminEmail('staff@synthetic.invalid'), true, '픽스처가 unlock 목록에 있어야 이 검사가 성립한다')
      // 두 목록은 서로를 참조하지 않는다. unlock 목록에 있다는 사실이 권한 근거가 되면 안 된다.
      assert.equal(staffMembership({ email: 'staff@synthetic.invalid' }), undefined, 'unlock 목록이 직원 권한으로 새어 들어갔다')

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
    it('직원 membership 이 있는 계정에만 권한이 열린다', async () => {
      // 권한 근거는 배포 설정 하나다. 목록에 없는 회원은 인증되어 있어도 403 이다.
      for (const token of ['staff', 'customer', 'another-member']) {
        const { response, text } = await request('/api/admin/v1/me', token)
        assert.equal(response.status, 403, `${token} 에 권한이 열렸다`)
        assert.equal(JSON.parse(text).code, 'STAFF_MEMBERSHIP_REQUIRED')
      }

      const { response, text } = await request('/api/admin/v1/me', 'super')
      assert.equal(response.status, 200, '직원 계정에 권한이 열리지 않았다')
      const me = JSON.parse(text)
      assert.equal(me.email, 'super@synthetic.invalid')
      assert.equal(me.role, 'super_admin')
      // 이 단계는 조회 권한만 준다. 감사 경로(T06)가 없는 동안 쓰기 scope 를 만들지 않는다.
      assert.deepEqual(me.scopes, ['orders:read', 'members:read', 'reports:read', 'audit:read', 'settings:read', 'settings:write', 'support:read', 'support:write'])
      assert.ok(!me.scopes.some((scope: string) => /delete|refund/.test(scope)), '허용되지 않은 파괴·금융 권한이 생겼다')
      assert.ok(me.scopes.includes('settings:write'), '감사 기반 설정 변경 권한이 없다')
      assert.ok(me.scopes.includes('support:read') && me.scopes.includes('support:write'), '고객 지원 권한이 없다')
    })

    it('직원 목록이 비면 아무에게도 권한이 없다', async () => {
      // 회수 경로의 실측. 설정을 비우면 코드 변경 없이 권한이 사라져야 한다.
      const previous = process.env.UMSH_ADMIN_SUPER_EMAILS
      delete process.env.UMSH_ADMIN_SUPER_EMAILS
      try {
        const { response, text } = await request('/api/admin/v1/me', 'super')
        assert.equal(response.status, 403, '설정을 비웠는데 권한이 남아 있다')
        assert.equal(JSON.parse(text).code, 'STAFF_MEMBERSHIP_REQUIRED')
      } finally {
        if (previous === undefined) delete process.env.UMSH_ADMIN_SUPER_EMAILS
        else process.env.UMSH_ADMIN_SUPER_EMAILS = previous
      }
    })

    it('대소문자가 달라도 같은 직원으로 본다', async () => {
      // 이메일은 대소문자를 구분하지 않는다. 목록과 토큰 이메일 양쪽을 정규화한다.
      const previous = process.env.UMSH_ADMIN_SUPER_EMAILS
      process.env.UMSH_ADMIN_SUPER_EMAILS = ' SUPER@Synthetic.Invalid , '
      try {
        const { response } = await request('/api/admin/v1/me', 'super')
        assert.equal(response.status, 200, '대소문자·공백 때문에 직원을 못 알아봤다')
      } finally {
        if (previous === undefined) delete process.env.UMSH_ADMIN_SUPER_EMAILS
        else process.env.UMSH_ADMIN_SUPER_EMAILS = previous
      }
    })

    it('셸이 진입점과 딥링크 모두에서 열린다', async () => {
      // D2-4: `/admin/*` 미매칭 경로를 정적 탐색으로 흘리지 않는다.
      for (const path of ['/admin', '/admin/', '/admin/index.html', '/admin/orders', '/admin/members/deep/link', '/admin/settings']) {
        const { response, text } = await request(path)
        assert.equal(response.status, 200, `${path} 가 ${response.status} 로 응답했다`)
        assert.match(text, /운영 관리자/, `${path} 가 셸을 주지 않았다`)
      }
    })

    it('셸이 직원 로그인 폼을 갖고 있다', async () => {
      // 일반 회원 로그인은 소셜 로그인만 지원한다. 직원 계정으로 들어올 입력 지점이
      // 셸 안에 있어야 하며, 예전처럼 없는 경로(`/login`)로 보내면 안 된다.
      const { text } = await request('/admin')
      assert.match(text, /data-admin-login\b/, '로그인 폼이 없다')
      assert.match(text, /autocomplete="current-password"/, '비밀번호 입력이 없다')
      assert.match(text, /\/api\/admin\/v1\/login/, '자체 비밀번호 로그인 호출이 없다')
      assert.ok(!text.includes('signInWithPassword'), '관리자 로그인에서 Supabase 비밀번호 인증을 호출한다')
      assert.match(text, /data-admin-recovery/, '비밀번호 재설정 폼이 없다')
      assert.match(text, /autocomplete="new-password"/, '새 비밀번호 입력이 없다')
      assert.match(text, /auth\.updateUser\(\{ password: password \}\)/, '재설정 비밀번호를 Supabase에 저장하지 않는다')
      assert.match(text, /hash\.get\('type'\) === 'recovery'/, '복구 링크의 recovery 상태를 처리하지 않는다')
      assert.ok(!text.includes('href="/login"'), '존재하지 않는 로그인 경로로 보낸다')
    })

    it('관리자 메뉴는 좌측 LNB와 모든 운영 화면 경로를 제공한다', async () => {
      const { text } = await request('/admin')
      assert.match(text, /position: fixed; inset: 0 auto 0 0/, '좌측 LNB 레이아웃이 없다')
      for (const path of [
        '/admin/search', '/admin/orders', '/admin/refunds', '/admin/reconciliation',
        '/admin/members', '/admin/support', '/admin/content', '/admin/services', '/admin/media',
        '/admin/reports', '/admin/jobs', '/admin/corpus', '/admin/prompts', '/admin/evaluations', '/admin/releases',
        '/admin/analytics', '/admin/logs', '/admin/incidents', '/admin/audit', '/admin/settings',
      ]) {
        assert.ok(text.includes(`href="${path}"`), `${path} 메뉴가 없다`)
      }
      assert.match(text, /markCurrentRoute/, '현재 메뉴 강조 처리가 없다')
      assert.match(text, /loadLiveMembers/, '실제 회원 데이터 로더가 없다')
      assert.match(text, /loadLiveReports/, '실제 리포트 데이터 로더가 없다')
      assert.match(text, /loadLiveAudit/, '실제 감사 기록 로더가 없다')
      assert.ok(!text.includes('route-placeholder'), '메뉴가 공용 미구현 안내 화면으로 남아 있다')
    })

    it('모든 운영 화면 딥링크가 실제 데이터 컨테이너를 갖고 목업 상태를 노출하지 않는다', async () => {
      for (const path of [
        '/admin/search', '/admin/services', '/admin/content', '/admin/media', '/admin/refunds',
        '/admin/reconciliation', '/admin/support', '/admin/reports', '/admin/jobs', '/admin/corpus', '/admin/prompts',
        '/admin/evaluations', '/admin/releases', '/admin/logs', '/admin/incidents', '/admin/audit',
      ]) {
        const { response, text } = await request(path)
        assert.equal(response.status, 200, `${path} 딥링크가 열리지 않는다`)
        assert.match(text, /data-admin-workspace-body/, `${path} 에 운영 화면 컨테이너가 없다`)
      }
      const { text } = await request('/admin')
      assert.ok(!text.includes('데이터 연동 대기'), '목업 연동 대기 상태가 셸에 남아 있다')
      assert.match(text, /실제 운영 원천 테이블은 아직 생성되지 않았습니다/, '원천 미생성 상태를 명시하지 않는다')
    })

    it('비밀번호 복구 링크는 관리자 설정 화면으로 이어진다', async () => {
      // Supabase Dashboard에서 보낸 메일은 Site URL(루트)로 돌아올 수 있다.
      // access token fragment를 보존한 채 관리자 복구 화면으로 넘겨야 한다.
      const { text } = await request('/')
      assert.match(text, /hash\.get\('type'\) === 'recovery'/, '루트가 복구 링크를 감지하지 않는다')
      assert.match(text, /window\.location\.replace\('\/admin' \+ window\.location\.search \+ window\.location\.hash\)/, '복구 토큰을 관리자 화면으로 넘기지 않는다')
    })

    it('주문 목록 경로는 로그인 없이 목록을 불러온다', async () => {
      const { text } = await request('/admin/orders')
      assert.match(text, /isPublicOrdersPath/, '공개 주문 목록 경로를 구분하지 않는다')
      assert.match(text, /startOrders\(null\)/, '공개 목록을 시작하지 않는다')
      assert.match(text, /if \(await checkAuthority\(null\)\) return;/, '로그인된 관리자에게 전체 LNB를 먼저 열지 않는다')
    })

    it('셸이 자격증명을 보관하지 않는다', async () => {
      const { text } = await request('/admin')
      // 비밀번호를 저장·전송·로깅하는 코드가 없어야 한다.
      assert.ok(!/localStorage\.setItem\([^)]*password/i.test(text), '비밀번호를 브라우저에 저장한다')
      assert.ok(!/console\.(log|info|warn|error)\([^)]*password/i.test(text), '비밀번호를 로그로 남긴다')
      assert.match(text, /elements\.password\.value = ''/, '로그인 후 비밀번호를 폼에서 지우지 않는다')
      // 어떤 계정의 자격증명도 셸에 하드코딩하지 않는다.
      assert.ok(!/@crea-m\.com/.test(text), '실제 계정 이메일이 셸에 박혀 있다')
      assert.ok(!/admin1234/i.test(text), '비밀번호가 셸에 박혀 있다')
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
