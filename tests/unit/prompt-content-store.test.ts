import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://prompt-content.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_synthetic_prompt_content'

const ALL_ROWS = [
  { content_type: 'common', content_key: 'common', version: 2, state: 'published', revision: 3, updated_at: '2026-09-19T00:00:00Z', body: '발행된 공통 규칙' },
  { content_type: 'common', content_key: 'common', version: 3, state: 'draft', revision: 0, updated_at: '2026-09-19T01:00:00Z', body: '초안 공통 규칙' },
  { content_type: 'service', content_key: 'money_save', version: 1, state: 'published', revision: 0, updated_at: '2026-09-18T00:00:00Z', body: '발행된 소비성향 페르소나' },
]

const calls: Array<{ url: URL; headers: Headers; body?: unknown }> = []
const nativeFetch = globalThis.fetch
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const headers = new Headers(init?.headers)
  const body = init?.body ? JSON.parse(String(init.body)) : undefined
  calls.push({ url, headers, body })
  if (url.pathname === '/rest/v1/prompt_content_versions') {
    let rows = ALL_ROWS
    const stateFilter = url.searchParams.get('state')
    if (stateFilter?.startsWith('in.')) {
      const allowed = stateFilter.slice(4, -1).split(',')
      rows = rows.filter((row) => allowed.includes(row.state))
    }
    return new Response(JSON.stringify(rows), { headers: { 'content-type': 'application/json' } })
  }
  throw new Error(`Unexpected request: ${url}`)
}) as typeof fetch

const store = await import('../../src/admin/prompt-content-store.js')

after(() => {
  globalThis.fetch = nativeFetch
  for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]
  Object.assign(process.env, previousEnv)
})

describe('프롬프트 개정 관리자 조회', { concurrency: false }, () => {
  before(() => { calls.length = 0 })

  it('공통 규칙 1개 + 서비스 20개, 총 21개 항목을 나열하고 최신 초안/발행을 결합한다', async () => {
    const snapshot = await store.getAdminPromptContentSnapshot()
    assert.equal(snapshot.versionStore, 'ready')
    assert.equal(snapshot.items.length, 21)
    const common = snapshot.items.find((item) => item.contentType === 'common')
    assert.deepEqual({ published: common?.publishedVersion, draft: common?.draftVersion, body: common?.currentBody }, { published: 2, draft: 3, body: '초안 공통 규칙' })
  })

  it('개정이 없는 항목은 배포 파일 본문을 currentBody 로 준다', async () => {
    const snapshot = await store.getAdminPromptContentSnapshot()
    const jobChoice = snapshot.items.find((item) => item.contentKey === 'job_choice')
    assert.equal(jobChoice?.publishedVersion, null)
    assert.equal(jobChoice?.currentBody, jobChoice?.baselineBody)
    assert.ok(jobChoice?.baselineBody && jobChoice.baselineBody.length > 0)
  })
})

describe('프롬프트 라우트는 감사 명령을 거치고, prompts:write/publish 로만 쓴다', () => {
  const source = readFileSync(join(ROOT, 'src/server/app.ts'), 'utf8')
  const draftRoute = source.slice(source.indexOf("app.post('/api/admin/v1/prompts/content/:contentType/:contentKey/draft'"), source.indexOf("app.post('/api/admin/v1/prompts/content/:contentType/:contentKey/publish'"))
  const publishRoute = source.slice(source.indexOf("app.post('/api/admin/v1/prompts/content/:contentType/:contentKey/publish'"))

  it('초안 저장은 prompts:write, 발행은 prompts:publish 를 요구한다', () => {
    assert.match(draftRoute, /requireStaff\(req, res, 'prompts:write'\)/)
    assert.match(publishRoute.slice(0, 2000), /requireStaff\(req, res, 'prompts:publish'\)/)
  })

  it('두 라우트 모두 감사 명령과 멱등 키를 거친다', () => {
    for (const route of [draftRoute, publishRoute.slice(0, 2500)]) {
      assert.match(route, /executeAdminCommand\(/)
      assert.match(route, /adminCommandKey\(req\)/)
    }
  })

  it('두 scope 모두 SUPER_ADMIN_SCOPES 와 LOCAL_ADMIN_SCOPES 에 있다', () => {
    const staff = readFileSync(join(ROOT, 'src/auth/staff.ts'), 'utf8')
    assert.match(staff, /'prompts:write'/)
    assert.match(staff, /'prompts:publish'/)
    const localScopesLine = source.slice(source.indexOf('const LOCAL_ADMIN_SCOPES'), source.indexOf('\n', source.indexOf('const LOCAL_ADMIN_SCOPES')))
    assert.match(localScopesLine, /'prompts:write'/)
    assert.match(localScopesLine, /'prompts:publish'/)
  })
})
