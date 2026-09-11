import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://published-services.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_synthetic_published_services'
const nativeFetch = globalThis.fetch
let fail = false
globalThis.fetch = (async () => {
  if (fail) return new Response('unavailable', { status: 503 })
  return new Response(JSON.stringify([
    { id: 'published-cmdg', service_key: 'cmdg', version: 2, state: 'published', revision: 4, updated_at: '2026-09-12T02:00:00Z', payload: { title: '발행 제목', tagline: '발행 한줄', summary: '발행 요약', category: '발행 분류', discoveryVisible: true, landingPath: '/cmdg/' } },
    { id: 'published-hidden', service_key: 'love_mind', version: 1, state: 'published', revision: 1, updated_at: '2026-09-12T02:00:00Z', payload: { title: '숨김 해제 시도', tagline: '숨김 한줄', summary: '숨김 요약', category: '연애', discoveryVisible: true, landingPath: '/love/mind' } },
  ]), { headers: { 'content-type': 'application/json' } })
}) as typeof fetch

const directory = await import('../../src/server/published-service-directory.js')

after(() => {
  globalThis.fetch = nativeFetch
  for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]
  Object.assign(process.env, previousEnv)
})

describe('발행 서비스 공개 목록', { concurrency: false }, () => {
  it('발행된 비결제 필드만 덮고 key, 가격, 이미지, 경로는 코드 정본을 유지한다', async () => {
    const snapshot = await directory.getPublicServiceDirectorySnapshot()
    const cmdg = snapshot.services.find((service) => service.key === 'cmdg')
    assert.equal(snapshot.source, 'published')
    assert.equal(cmdg?.title, '발행 제목')
    assert.equal(cmdg?.tagline, '발행 한줄')
    assert.equal(cmdg?.summary, '발행 요약')
    assert.equal(cmdg?.category, '발행 분류')
    assert.equal(cmdg?.amount, 49900)
    assert.equal(cmdg?.image, '/assets/umsh-cmdg-card-bg.webp')
    assert.equal(cmdg?.href, '/cmdg/')
    assert.ok(!snapshot.services.some((service) => service.key === 'love_mind'), 'U10 결정 전 숨김 서비스가 공개됐다')
    assert.ok(snapshot.services.every((service) => !('revision' in service) && !('payload' in service) && !('authorEmail' in service) && !('discoveryVisible' in service)))
  })

  it('버전 저장소 조회 실패 시 목업 없이 현재 코드 정본으로 안전 복귀한다', async () => {
    fail = true
    const snapshot = await directory.getPublicServiceDirectorySnapshot()
    assert.equal(snapshot.source, 'code-fallback')
    assert.equal(snapshot.services.find((service) => service.key === 'cmdg')?.title, '천명사주')
    assert.equal(snapshot.services.length, 15)
  })
})
