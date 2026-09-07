import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { UserBirthProfile } from '../../src/user/profile-store.js'
import type { ReportRecord } from '../../src/report/report-store.js'

// Isolate this Node test process before dynamic imports: these snapshot checks
// must not load dotenv, write local report files, or access a live DB/provider.
const isolatedEnv = ['DATABASE_URL', 'SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'REPORT_STORAGE_DIR', 'VERCEL', 'NODE_ENV']
const previousEnv = new Map(isolatedEnv.map((key) => [key, process.env[key]]))
for (const key of isolatedEnv) delete process.env[key]
process.env.NODE_ENV = 'test'
const { savedDailyFortune } = await import('../../src/report/daily-report.js')
const { createReportId, findReportRecord, getReportRecord, saveReportRecord, toClientReport } = await import('../../src/report/report-store.js')
const { buildTodayFortune } = await import('../../src/saju/today-fortune.js')
after(() => {
  for (const [key, value] of previousEnv) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

function fixture(): UserBirthProfile {
  return {
    userId: randomUUID(), name: '오늘운 저장 검증',
    birth: { year: 1975, month: 9, day: 26, hour: 12, gender: 'male', calendar: 'solar' },
    birthTimeKnown: false, context: {}, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  }
}

describe('daily snapshot identity across v3 upgrade', { concurrency: false }, () => {
  it('saves once, coalesces concurrent creation, and reopens the exact UUID snapshot within its KST day', async () => {
    const profile = fixture()
    const owner = { id: profile.userId }
    const [first, concurrent] = await Promise.all([
      savedDailyFortune(profile, owner, new Date('2026-09-06T15:00:00Z')),
      savedDailyFortune(profile, owner, new Date('2026-09-07T14:59:59Z')),
    ])
    assert.equal(first.resultId, concurrent.resultId)
    assert.match(first.resultId!, /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/)
    assert.equal(first.report.model, 'daily-rules-v3')
    assert.equal(first.status, 'complete')
    assert.equal(first.revision, 1)
    assert.ok(first.report.sections[0].interpretation.includes('[1975년생 토끼띠 · 출생연도 기준]'))
    assert.ok(first.report.sections[0].interpretation.includes('[오늘의 결론]'))
    assert.equal(first.auxiliary?.todayFortune?.reading.zodiac?.animal, '토끼')
    const reopened = await findReportRecord(first.resultId!, owner)
    const repeated = await savedDailyFortune(profile, owner, new Date('2026-09-07T14:59:59Z'))
    assert.deepEqual(reopened, first)
    assert.deepEqual(repeated, first, 'recall must preserve body, version and timestamps')
    await assert.rejects(findReportRecord(first.resultId!, { id: randomUUID() }), /REPORT_ACCESS_DENIED/)
  })

  it('separates a new KST date, changed birth profile and a different owner without rewriting old readings', async () => {
    const profile = fixture()
    const owner = { id: profile.userId }
    const today = new Date('2026-09-07T03:00:00Z')
    const first = await savedDailyFortune(profile, owner, today)
    const next = await savedDailyFortune(profile, owner, new Date('2026-09-07T15:00:00Z'))
    const changed = await savedDailyFortune({ ...profile, birth: { ...profile.birth, day: 27 } }, owner, today)
    const other = await savedDailyFortune(profile, { id: randomUUID() }, today)
    assert.equal(new Set([first.resultId, next.resultId, changed.resultId, other.resultId]).size, 4)
    assert.equal(next.auxiliary?.todayFortune?.date.iso, '2026-09-08')
    assert.deepEqual(await findReportRecord(first.resultId!, owner), first)
  })

  it('never overwrites an existing v2 UUID or its interpretation when generating the v3 same-day reading', async () => {
    const profile = fixture()
    const owner = { id: profile.userId }
    const today = new Date('2026-09-07T03:00:00Z')
    const fortune = buildTodayFortune(profile, today)
    delete fortune.reading.zodiac
    fortune.reading.work = '이미 익숙한 일이 있다면 그 방법을 재사용해 보세요.'
    const context = { serviceKey: 'today', name: profile.name, birthTimeKnown: profile.birthTimeKnown, concern: fortune.date.iso }
    const reportId = createReportId(profile.birth, context, 'daily-reading-v2', owner.id)
    const legacy: ReportRecord = {
      reportId, resultId: randomUUID(), revision: 7, owner, birth: profile.birth, context,
      status: 'complete', createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:01:00Z',
      auxiliary: { todayFortune: fortune },
      report: {
        title: '오늘의 운세', subtitle: '저장된 기존 해석', model: 'daily-rules-v2', generatedBy: 'template', status: 'complete',
        sections: [{ id: 'daily-reading', order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '하루', categoryEn: 'daily', classification: '', hook: '기존 제목', patternKeys: [], ragTopics: [], interpretation: '저장되어 있던 원문입니다.', status: 'complete' }],
      },
    }
    await saveReportRecord(legacy)
    const before = await getReportRecord(reportId)
    const upgraded = await savedDailyFortune(profile, owner, today)
    assert.notEqual(upgraded.reportId, legacy.reportId)
    assert.notEqual(upgraded.resultId, legacy.resultId)
    const recalled = await findReportRecord(legacy.resultId!, owner)
    assert.deepEqual(recalled, before)
    assert.equal(toClientReport(recalled!).sections[0].interpretation, '저장되어 있던 원문입니다.')
    assert.equal(recalled?.auxiliary?.todayFortune?.reading.zodiac, undefined)
  })
})
