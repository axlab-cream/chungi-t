import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

const previousEnv = { ...process.env }
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'https://profile-context.synthetic.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'test-public-key'
delete process.env.DATABASE_URL

const nativeFetch = globalThis.fetch
const owner = { id: 'aaaaaaaa-0000-0000-0000-000000000099', accessToken: 'member-token' }
const row: any = {
  user_id: owner.id,
  name: '김철수',
  birth_year: 1990, birth_month: 5, birth_day: 12, birth_hour: 9, birth_minute: 30,
  gender: 'male', calendar: 'solar', is_leap_month: false, birth_time_known: true,
  profile_payload: { life_context: { work: '현재 역할과 평가 기준을 확인합니다.' } },
  created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-02T00:00:00.000Z',
}

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const method = init?.method ?? 'GET'
  if (url.origin !== 'https://profile-context.synthetic.invalid') throw new Error(`Unexpected request: ${method} ${url}`)
  if (method === 'GET') return new Response(JSON.stringify([row]), { headers: { 'content-type': 'application/json' } })
  if (method === 'POST') {
    const body = JSON.parse(String(init?.body))
    Object.assign(row, body, { updated_at: '2026-09-22T00:00:00.000Z' })
    return new Response(JSON.stringify([row]), { headers: { 'content-type': 'application/json' } })
  }
  throw new Error(`Unexpected request: ${method} ${url}`)
}) as typeof fetch

const profileStore = await import('../../src/user/profile-store.js')

after(() => {
  globalThis.fetch = nativeFetch
  for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]
  Object.assign(process.env, previousEnv)
})

describe('회원 공통 현실 기준', { concurrency: false }, () => {
  it('profile_payload에 저장하고 구형 저장 요청은 이미 저장한 기준을 지우지 않는다', async () => {
    const existing = await profileStore.getUserBirthProfile(owner)
    assert.equal(existing?.lifeContext?.work, '현재 역할과 평가 기준을 확인합니다.')
    const draft = profileStore.buildUserBirthProfile({
      owner,
      name: '김철수',
      birth: existing!.birth,
      lifeContext: { money: '보상 조건과 고정 지출을 비교합니다.', relationship: '약속 시간은 미리 조정합니다.' },
    })
    const saved = await profileStore.saveUserBirthProfile(draft, owner)
    assert.equal(saved.lifeContext?.money, '보상 조건과 고정 지출을 비교합니다.')
    assert.equal(row.profile_payload.life_context.relationship, '약속 시간은 미리 조정합니다.')

    const legacyDraft = profileStore.buildUserBirthProfile({ owner, name: '김철수', birth: saved.birth })
    const retained = await profileStore.saveUserBirthProfile(legacyDraft, owner)
    assert.equal(retained.lifeContext?.money, '보상 조건과 고정 지출을 비교합니다.')
  })
})
