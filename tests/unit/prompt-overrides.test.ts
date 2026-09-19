import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

/**
 * 2026-09-19 (T30): 발행된 프롬프트 개정이 실제 생성 경로(loadServiceSystemPrompt 등)에
 * 반영되는지 확인한다. 이 함수들은 sectionPrompt/verdictPrompt 같은 동기 함수 안에서
 * 동기로 불리므로, 여기서도 계속 동기 문자열을 돌려줘야 한다 — 비동기로 바뀌면
 * report-generator.ts 전체로 번진다(코퍼스 스냅샷 사고와 같은 위험).
 */
const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://prompt-overrides.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

const calls: URL[] = []
let publishedRows: Array<{ content_type: string; content_key: string; body: string }> = []

const nativeFetch = globalThis.fetch
globalThis.fetch = (async (input: string | URL | Request) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  calls.push(url)
  if (url.pathname === '/rest/v1/prompt_content_versions') {
    return new Response(JSON.stringify(publishedRows), { headers: { 'content-type': 'application/json' } })
  }
  throw new Error(`Unexpected request: ${url}`)
}) as typeof fetch

const overrides = await import('../../src/prompt/prompt-overrides.js')
const serviceSystem = await import('../../src/prompt/service-system.js')
const toneV2 = await import('../../src/prompt/tone-v2.js')

after(() => {
  globalThis.fetch = nativeFetch
  for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]
  Object.assign(process.env, previousEnv)
})

describe('발행된 프롬프트 개정이 생성 경로에 동기로 반영된다', { concurrency: false }, () => {
  before(() => {
    calls.length = 0
    overrides.resetPromptOverlayForTests()
    publishedRows = []
  })

  it('오버레이가 비어 있으면 배포 파일 그대로 쓴다', async () => {
    await overrides.forceRefreshPromptOverridesForTests()
    const fileCommon = toneV2.loadToneCommon()
    assert.equal(serviceSystem.loadCommonSystemPrompt(), fileCommon)
  })

  it('발행된 공통 규칙 개정이 있으면 그것을 쓰고, 서비스 블록은 배포 파일 그대로다', async () => {
    publishedRows = [{ content_type: 'common', content_key: 'common', body: '개정된 공통 규칙 본문입니다.' }]
    await overrides.forceRefreshPromptOverridesForTests()
    assert.equal(serviceSystem.loadCommonSystemPrompt(), '개정된 공통 규칙 본문입니다.')
    assert.equal(serviceSystem.loadServiceBlock('money_save'), toneV2.loadToneService('money_save'))
    // 조합 결과에도 개정본이 들어간다.
    assert.match(serviceSystem.loadServiceSystemPrompt('money_save'), /^개정된 공통 규칙 본문입니다\./)
  })

  it('발행된 서비스 페르소나 개정이 있으면 그것을 쓴다', async () => {
    publishedRows = [{ content_type: 'service', content_key: 'money_save', body: '개정된 소비성향 페르소나입니다.' }]
    await overrides.forceRefreshPromptOverridesForTests()
    assert.equal(serviceSystem.loadServiceBlock('money_save'), '개정된 소비성향 페르소나입니다.')
    assert.equal(serviceSystem.loadServiceBlock('job_choice'), toneV2.loadToneService('job_choice'), '다른 서비스는 영향받지 않는다')
  })

  it('저장소 조회가 실패해도 던지지 않고 배포 파일로 접는다', async () => {
    globalThis.fetch = (async () => { throw new Error('network down') }) as typeof fetch
    await overrides.forceRefreshPromptOverridesForTests()
    assert.equal(serviceSystem.loadCommonSystemPrompt(), toneV2.loadToneCommon())
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
      calls.push(url)
      return new Response(JSON.stringify(publishedRows), { headers: { 'content-type': 'application/json' } })
    }) as typeof fetch
  })

  it('새로고침 주기 안에서는 다시 조회하지 않는다', async () => {
    await overrides.forceRefreshPromptOverridesForTests()
    const before = calls.length
    overrides.refreshPromptOverridesIfStale()
    overrides.refreshPromptOverridesIfStale()
    assert.equal(calls.length, before, '주기 안의 반복 호출이 새 요청을 만들었다')
  })
})
