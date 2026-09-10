import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'
import type { Server } from 'node:http'

// 정적 노출 검사에는 인증도 저장소도 필요 없다. 다만 app 을 로드하는 순간 저장 모듈이
// 외부로 나가지 않도록 다른 통합 스위트와 같은 방식으로 환경을 비운다.
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
  if (origin && url.origin === origin) return nativeFetch(input, init)
  unexpected.push(url.origin)
  throw new Error('External requests are forbidden in this suite')
}) as typeof fetch

process.env.SUPABASE_URL = 'https://synthetic-auth.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'synthetic-public-fixture-only'
const { default: app } = await import('../../src/server/app.js')
let server: Server

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

describe('정적 루트가 내부 산출물을 내보내지 않는다', { concurrency: false }, () => {
  // 2026-09-10 운영에서 이 경로들이 200 이었다. 서비스 생성 프롬프트 원문과
  // 스크래핑 스크립트가 공개돼 있었다.
  const blocked = [
    '/me/pass-angle/01-step-1-story/PROMPT.md',
    '/place/home/05-step-5-chat/PROMPT.md',
    '/work/move/04-step-4-report/PROMPT.md',
    '/me/pass-angle/01-step-1-story/01-SERVICE-STORY-RESULT.json',
    '/%EC%82%AC%EC%A3%BC/extract_mhtml.py',
    '/%EC%82%AC%EC%A3%BC/extracted_content.md',
    '/%EC%82%AC%EC%A3%BC/teaser_korean_content.md',
    // 확장자 목록으로는 막히지 않는다 — 외부 사이트 스크래핑 결과가 .html 로 저장돼 있다.
    '/%EC%82%AC%EC%A3%BC/extracted_decoded.html',
    // 중첩 폴더가 만드는 두 번째 URL 공간 자체를 닫았다. 앱 페이지 중복 URL 도 여기 포함된다.
    '/%EC%82%AC%EC%A3%BC/index.html',
    '/%EC%82%AC%EC%A3%BC/check_ganji.py',
  ]

  describe('보안', () => {
    for (const path of blocked) {
      it(`${path} 는 404`, async () => {
        const response = await fetch(origin + path)
        assert.equal(response.status, 404, `${path} 가 ${response.status} 로 응답했다`)
        const body = await response.text()
        // 원문이 조금이라도 새어 나가면 안 된다.
        assert.ok(!/당신은|PROMPT|import |def /.test(body), `${path} 응답에 내용이 실렸다`)
      })
    }

    // 변형마다 독립 케이스로 둔다. 하나로 묶으면 첫 실패에서 멈춰 어느 변형이 다시
    // 열렸는지 알 수 없다 (Codex 리뷰 Minor).
    const bypassAttempts = [
      '/me/pass-angle/01-step-1-story/PROMPT%2Emd',
      '/me/pass-angle/01-step-1-story/PROMPT%2emd',
      '/me/pass-angle/01-step-1-story/PROMPT.MD',
      '/%EC%82%AC%EC%A3%BC/extract_mhtml%2Epy',
      '/%EC%82%AC%EC%A3%BC/extracted_decoded%2Ehtml',
      '/me/pass-angle/01-step-1-story/PROMPT.md/',
      '/me/pass-angle/01-step-1-story/PROMPT.md.',
      '/me/pass-angle/01-step-1-story/PROMPT%2520md',
      '/me/pass-angle/../me/pass-angle/01-step-1-story/PROMPT.md',
    ]
    for (const path of bypassAttempts) {
      it(`${path} 로 우회되지 않는다`, async () => {
        const response = await fetch(origin + path)
        assert.notEqual(response.status, 200, `${path} 로 우회됐다`)
      })
    }
  })

  describe('정상 동작', () => {
    // 확장자만 보고 막으면 이 세 개까지 막힌다. 예외는 경로로 명시한다.
    const allowed: Array<[string, RegExp]> = [
      ['/robots.txt', /User-agent/],
      ['/sitemap.xml', /<urlset/],
      ['/.well-known/assetlinks.json', /delegate_permission/],
    ]
    for (const [path, marker] of allowed) {
      it(`${path} 는 그대로 200`, async () => {
        const response = await fetch(origin + path)
        assert.equal(response.status, 200, `${path} 가 ${response.status} 로 막혔다`)
        assert.match(await response.text(), marker)
      })
    }

    it('웹 자산은 영향을 받지 않는다', async () => {
      for (const path of ['/css/policy.css', '/privacy', '/faq']) {
        const response = await fetch(origin + path)
        assert.equal(response.status, 200, `${path} 가 ${response.status} 로 응답했다`)
      }
    })
  })
})

describe('브랜드 표기가 하나다', () => {
  const read = (p: string) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8')
  // 고객이 실제로 읽는 부분만 남긴다. script 와 style 안에는 코드 식별자(UMSHChrome)와
  // 주석이 있고, 구조화 데이터에는 의도한 alternateName 이 있다. 브랜드 표기 문제가 아니다.
  const visibleText = (html: string) => html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
  const collectHtml = (dir: string): string[] => readdirSync(new URL('../../' + dir + '/', import.meta.url), { withFileTypes: true })
    .flatMap((entry) => entry.isDirectory()
      ? collectHtml(`${dir}/${entry.name}`)
      : entry.name.endsWith('.html') ? [`${dir}/${entry.name}`] : [])

  describe('정상 동작', () => {
    it('고객 노출 페이지에 UMSH 를 브랜드 이름으로 쓰지 않는다', () => {
      // 정본은 구조화 데이터와 og:site_name 이 선언한 `운명상회` 다.
      // 최상위만 보면 서비스 화면 대부분을 놓친다 (Codex 리뷰 Minor). 재귀로 모은다.
      const pages = collectHtml('사주')
      assert.ok(pages.length > 40, `검사 대상 페이지가 ${pages.length}개뿐이다`)
      for (const name of pages) {
        const html = read(name)
        assert.ok(!html.includes('UMSH 운명상회'), `${name} 에 UMSH 운명상회 가 남았다`)
        const prose = visibleText(html)
        const at = prose.search(/UMSH(?![A-Za-z])/)
        assert.equal(at, -1, `${name} 에 문장용 UMSH 표기가 남았다: ${JSON.stringify(prose.slice(Math.max(0, at - 80), at + 30))}`)
      }
    })

    it('구조화 데이터가 UMSH 를 대체 이름으로 남긴다', () => {
      // 도메인이 umsh.kr 이므로 검색에서 그 토큰이 사라지지 않게 alternateName 으로 둔다.
      for (const page of ['사주/about.html', '사주/portal.html']) {
        const html = read(page)
        assert.match(html, /"alternateName":\s*"UMSH"/, `${page} 에 alternateName 이 없다`)
        assert.match(html, /"name":\s*"운명상회"/, `${page} 의 Organization 이름이 바뀌었다`)
      }
    })
  })
})

describe('배포 라우팅이 정적 레이어를 거치지 않는다', () => {
  // Express 가드만으로는 부족했다. Vercel 은 `rewrites` 를 쓰면 **파일시스템을 먼저**
  // 확인하므로 저장소 경로와 겹치는 URL 이 함수를 거치지 않고 그대로 나갔다.
  // 2026-09-10 운영 실측: `/사주/me/pass-angle/01-step-1-story/PROMPT.md` → 200,
  // `/data/runtime-config.json` → 200, `/prompts/README.md` → 200.
  // 레거시 `routes` 는 파일시스템 단계보다 먼저 적용되므로 모든 요청이 함수로 간다.
  const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))

  describe('보안', () => {
    it('모든 요청을 함수로 보낸다', () => {
      assert.deepEqual(config.routes, [{ src: '/(.*)', dest: '/api/index?__umsh_path=$1' }])
    })

    it('`rewrites` 로 되돌리지 않는다', () => {
      // `rewrites` 는 파일시스템 우선이라 정적 노출이 다시 열린다.
      assert.equal('rewrites' in config, false, 'rewrites 가 다시 들어왔다')
      // `routes` 와 함께 쓸 수 없는 키들도 함께 막는다.
      for (const key of ['redirects', 'headers', 'cleanUrls', 'trailingSlash']) {
        assert.equal(key in config, false, `${key} 는 routes 와 함께 쓸 수 없다`)
      }
    })

    it('함수 번들에는 여전히 필요한 파일이 들어간다', () => {
      // 노출을 막는 것과 함수가 파일을 읽는 것은 다른 문제다.
      assert.equal(config.functions['api/index.ts'].includeFiles, '{data,prompts,사주}/**')
    })
  })
})
