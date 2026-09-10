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
      // Windows 는 백슬래시를 경로 구분자로 쓴다. 이 변형은 실제로 원문 전체를
      // 반환하고 있었다 (2026-09-10 Codex 리뷰 Critical).
      '/me/pass-angle/01-step-1-story/PROMPT.md%5C',
      '/me/pass-angle/01-step-1-story/PROMPT.md%5c',
      '/me/pass-angle/01-step-1-story/PROMPT.md%5C/',
      '/me/pass-angle/01-step-1-story/PROMPT.md%5C.',
      '/me/pass-angle/01-step-1-story/PROMPT%2Emd%5C',
      '/me/pass-angle/01-step-1-story/PROMPT.md%2F%5C',
      '/me/pass-angle/01-step-1-story/PROMPT.md%255C',
    ]
    for (const path of bypassAttempts) {
      it(`${path} 로 우회되지 않는다`, async () => {
        const response = await fetch(origin + path)
        // 상태 코드만 보면 200 이 아닌 응답에 원문이 실려도 통과한다.
        const body = await response.text()
        assert.ok(!/당신은|SERVICE-GENERATION-CONTRACT/.test(body), `${path} 응답에 프롬프트 원문이 실렸다`)
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
describe('정적 제공은 허용 목록이다 (기본 거부)', { concurrency: false }, () => {
  // 거부 목록은 형식을 세는 방식이라 새 형식에 진다. 실제로 스크래핑 결과가 .html 로
  // 저장돼 있어서 목록을 지나갔다(Codex Major). 기본값을 거부로 뒤집었다.
  describe('보안', () => {
    // 트리에 없는 형식들. 파일이 없어도 404 여야 하고, 가드가 먼저 잡아야 한다.
    const unlisted = ['/assets/report.csv', '/assets/config.yaml', '/assets/.env', '/js/app.js.map', '/assets/notes.rtf', '/assets/data.sqlite']
    for (const path of unlisted) {
      it(`허용 목록에 없는 ${path} 는 404`, async () => {
        const response = await fetch(origin + path)
        assert.equal(response.status, 404, `${path} 가 ${response.status} 로 응답했다`)
        assert.equal(await response.text(), '찾을 수 없는 경로입니다.', `${path} 가 가드가 아닌 다른 곳에서 처리됐다`)
      })
    }

    it('확장자 없는 파일이 트리에 없다', () => {
      // 확장자 없는 요청은 라우트가 처리하는 URL 로 보고 통과시킨다.
      // 트리에 확장자 없는 파일이 생기면 그 전제가 깨지고 그 파일이 공개된다.
      const walk = (dir: string): string[] => readdirSync(new URL('../../' + dir + '/', import.meta.url), { withFileTypes: true })
        .flatMap((entry) => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`])
      const extensionless = walk('사주').filter((name) => !/\.[A-Za-z0-9]{1,8}$/.test(name))
      assert.deepEqual(extensionless, [], '확장자 없는 파일이 생겼다. 공개 여부를 명시적으로 결정해야 한다')
    })
  })

  describe('정상 동작', () => {
    // 허용 목록 누락이 자산을 막지 않는지 형식별로 확인한다.
    const assets: Array<[string, string]> = [
      ['/assets/umsh-brand-logo.png', 'png'],
      ['/assets/chungi-asset-one.webp', 'webp'],
      ['/assets/umsh-kakao-share.jpg', 'jpg'],
      ['/assets/fonts/MaruBuri-Bold.woff2', 'woff2'],
      ['/assets/fonts/NotoSerifKR-Regular.ttf', 'ttf'],
      ['/css/policy.css', 'css'],
      ['/js/faq-knowledge.js', 'js'],
      ['/favicon.ico', 'ico'],
    ]
    for (const [path, label] of assets) {
      it(`${label} 자산은 200`, async () => {
        const response = await fetch(origin + path)
        assert.equal(response.status, 200, `${path} 가 ${response.status} 로 막혔다`)
      })
    }
  })
})
describe('내부 산출물은 웹 확장자로 저장돼 있어도 나가지 않는다', { concurrency: false }, () => {
  // 확장자 허용 목록은 형식만 본다. 내부 산출물이 `.html` 로 저장돼 있으면 통과한다.
  // 실제로 `GET /extracted_decoded.html` 이 외부 사이트 스크래핑 결과 116KB 를
  // 반환하고 있었다 — 중첩 폴더를 통째로 마운트한 탓이다 (Codex 리뷰 Major 확인 중 발견).
  const walk = (dir: string): string[] => readdirSync(new URL('../../' + dir + '/', import.meta.url), { withFileTypes: true })
    .flatMap((entry) => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`])

  /** 생성 도구와 조사 스크립트가 남기는 이름들. 대문자 패턴은 생성 계약이 쓰는 형태다. */
  const INTERNAL_NAME = /(^|\/)(PROMPT\.[^/]+|[^/]*-(RESULT|CONTRACT)\.[^/]+|extract[^/]*|extracted[^/]*|teaser_[^/]*|check_[^/]*)$/
  const SERVABLE = /\.(html?|css|m?js|webp|png|jpe?g|gif|svg|avif|ico|mp4|webm|mp3|woff2?|ttf|otf|xml)$/i

  describe('보안', () => {
    it('웹 확장자를 가진 내부 산출물이 어느 URL 로도 열리지 않는다', async () => {
      const artifacts = walk('사주').filter((name) => INTERNAL_NAME.test(name) && SERVABLE.test(name))
      // 이 검사가 무엇도 확인하지 않는 상태로 통과하지 않게 한다.
      assert.ok(artifacts.length > 0, '검사 대상 산출물이 없다. 패턴이 맞는지 확인해야 한다')
      for (const file of artifacts) {
        // `사주/x` → `/x`, `사주/사주/x` → `/x` 와 `/사주/x` 두 URL 공간 모두 시도한다.
        const relative = file.replace(/^사주\//, '')
        const urls = new Set([`/${relative}`, `/${relative.replace(/^사주\//, '')}`, `/${encodeURI(relative)}`])
        for (const url of urls) {
          const response = await fetch(origin + url)
          assert.equal(response.status, 404, `${url} 가 ${response.status} 로 열렸다 (${file})`)
        }
      }
    })
  })
})

describe('참조된 자산이 전부 응답한다', { concurrency: false }, () => {
  // 허용 목록에서 형식 하나를 빠뜨리면 그 자산만 조용히 404 가 된다.
  // 페이지가 실제로 참조하는 URL 을 뽑아 전수로 확인한다 (Codex 제안).
  const walk = (dir: string): string[] => readdirSync(new URL('../../' + dir + '/', import.meta.url), { withFileTypes: true })
    .flatMap((entry) => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`])
  const read = (p: string) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8')

  describe('정상 동작', () => {
    it('HTML·CSS 가 참조하는 로컬 자산 URL 이 모두 200', async () => {
      const sources = walk('사주').filter((name) => /\.(html|css)$/i.test(name) && !name.startsWith('사주/사주/'))
      const urls = new Set<string>()
      for (const file of sources) {
        const text = read(file)
        for (const match of text.matchAll(/(?:href|src)="(\/[^"?#]+\.[a-z0-9]{2,8})/gi)) urls.add(match[1])
        for (const match of text.matchAll(/url\((["']?)(\/[^)"']+\.[a-z0-9]{2,8})/gi)) urls.add(match[2])
      }
      assert.ok(urls.size > 30, `참조 URL 이 ${urls.size}개뿐이다`)
      const broken: string[] = []
      for (const url of urls) {
        const response = await fetch(origin + url)
        if (response.status !== 200) broken.push(`${url} → ${response.status}`)
      }
      assert.deepEqual(broken, [], '참조된 자산이 막혔다')
    })
  })
})
