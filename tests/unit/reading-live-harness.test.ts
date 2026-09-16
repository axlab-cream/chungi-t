import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { isolateLiveCheckEnvironment } from '../../scripts/reading-live-environment.js'
import { assertRequestedPrefixComplete } from '../../scripts/reading-live-invariants.js'

describe('합성 live reading 하네스 환경 격리', () => {
  it('OpenAI provider 설정만 남기고 무관한 자격증명과 운영 연결을 제거한다', () => {
    const env: NodeJS.ProcessEnv = {
      PATH: 'synthetic-path',
      OPENAI_API_KEY: 'synthetic-approved-provider-key',
      OPENAI_MODEL: 'synthetic-model',
      REPORT_OPENAI_MODEL: 'synthetic-report-model',
      PUNGSU_API_KEY: 'must-be-removed',
      GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: 'must-be-removed',
      SUPABASE_URL: 'must-be-removed',
      NEXT_PUBLIC_SUPABASE_URL: 'must-be-removed',
      VITE_SUPABASE_URL: 'must-be-removed',
      DATABASE_URL: 'must-be-removed',
      CRON_SECRET: 'must-be-removed',
      GITHUB_TOKEN: 'must-be-removed',
    }

    isolateLiveCheckEnvironment(env)

    assert.equal(env.PATH, 'synthetic-path')
    assert.equal(env.OPENAI_API_KEY, 'synthetic-approved-provider-key')
    assert.equal(env.OPENAI_MODEL, 'synthetic-model')
    assert.equal(env.REPORT_OPENAI_MODEL, 'synthetic-report-model')
    for (const name of ['PUNGSU_API_KEY', 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', 'SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL', 'DATABASE_URL', 'CRON_SECRET', 'GITHUB_TOKEN']) {
      assert.equal(env[name], undefined, name)
    }
  })

  it('fresh 실행은 기존 레코드 재사용을 거부하고 신규 생성 여부를 강제한다', () => {
    const script = readFileSync(new URL('../../scripts/check-reading-live.ts', import.meta.url), 'utf8')

    assert.match(script, /requireFresh && record[\s\S]*Fresh live check version already exists/)
    assert.match(script, /requireFresh && !created\.created[\s\S]*Fresh live check did not create a new record/)
    assert.match(script, /fullReview:\s*reviewGeneratedSajuReportSection/)
  })

  it('52항목 live 하네스는 합성 격리, fresh 생성, 최초 실패 중단과 전체 replay를 강제한다', () => {
    const script = readFileSync(new URL('../../scripts/check-pass-angle-outline-live.ts', import.meta.url), 'utf8')

    assert.match(script, /isolateLiveCheckEnvironment\(process\.env\)/)
    assert.match(script, /REPORT_STORAGE_DIR = resolve\('\.cache\/reading-live-20260907'\)/)
    assert.match(script, /assert\.equal\(templateReport\.sections\.length, 52\)/)
    assert.match(script, /requireFresh && record[\s\S]*Fresh pass_angle outline version already exists/)
    assert.match(script, /if \(generated\.status !== 'complete'\) break/)
    assert.match(script, /assert\.equal\(attemptedAfterFailure\.length, 0/)
    assert.match(script, /--limit=/)
    assert.match(script, /sections\.slice\(0, maxSections\)/)
    assert.match(script, /attemptedOutsideLimit/)
    assert.match(script, /reviewGeneratedSajuReportSection/)
    assert.doesNotMatch(script, /from ['"][^'"]*supabase|process\.env\.(?:SUPABASE|DATABASE_URL)/i)
  })

  it('48항목 퇴사운 live 하네스도 전용 합성 입력과 같은 실패 폐쇄 계약을 강제한다', () => {
    const script = readFileSync(new URL('../../scripts/check-quit-fortune-outline-live.ts', import.meta.url), 'utf8')

    assert.match(script, /isolateLiveCheckEnvironment\(process\.env\)/)
    assert.match(script, /REPORT_STORAGE_DIR = resolve\('\.cache\/reading-live-20260907'\)/)
    assert.match(script, /serviceKey:\s*WORK_QUIT_SERVICE_KEY/)
    assert.match(script, /assert\.equal\(templateReport\.sections\.length, 48\)/)
    assert.match(script, /requireFresh && record[\s\S]*Fresh quit_fortune outline version already exists/)
    assert.match(script, /if \(generated\.status !== 'complete'\) break/)
    assert.match(script, /assert\.equal\(attemptedAfterFailure\.length, 0/)
    assert.match(script, /--limit=/)
    assert.match(script, /sections\.slice\(0, maxSections\)/)
    assert.match(script, /attemptedOutsideLimit/)
    assert.match(script, /assertRequestedPrefixComplete/)
    assert.doesNotMatch(script, /failedIndex < 0 && !retrySectionId && !recoverSectionId/)
    assert.match(script, /reviewGeneratedSajuReportSection/)
    assert.doesNotMatch(script, /from ['"][^'"]*supabase|process\.env\.(?:SUPABASE|DATABASE_URL)/i)
  })

  it('재시도·복구 뒤 실패 항목이 없어도 요청 구간이 덜 끝났으면 성공으로 닫지 않는다', () => {
    assert.throws(
      () => assertRequestedPrefixComplete({ firstFailureIndex: -1, completedInRequestedPrefix: 1, requestedPrefixSize: 48 }),
      /complete every section in the requested prefix/,
    )
    assert.doesNotThrow(
      () => assertRequestedPrefixComplete({ firstFailureIndex: -1, completedInRequestedPrefix: 48, requestedPrefixSize: 48 }),
    )
    assert.doesNotThrow(
      () => assertRequestedPrefixComplete({ firstFailureIndex: 3, completedInRequestedPrefix: 3, requestedPrefixSize: 48 }),
    )
  })
})
