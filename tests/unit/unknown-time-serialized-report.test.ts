import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import type { ReportRecord } from '../../src/report/report-store.js'
import type { SajuReportContext } from '../../src/types/index.js'

// Serializer-only tests: no storage, provider or transport can be reached.
const envNames = ['NODE_ENV', 'DATABASE_URL', 'SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'REPORT_STORAGE_DIR', 'VERCEL']
const originalEnv = new Map(envNames.map(name => [name, process.env[name]]))
for (const name of envNames) delete process.env[name]
process.env.NODE_ENV = 'test'
const originalFetch = globalThis.fetch
globalThis.fetch = async () => { throw new Error('Unexpected transport in serializer-only test') }
const { toClientReport } = await import('../../src/report/report-store.js')
const { toSavedChatResult } = await import('../../src/report/saved-chat.js')
const { analyzeSaju } = await import('../../src/saju/analyzer.js')
after(() => {
  globalThis.fetch = originalFetch
  for (const [name, value] of originalEnv) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
})

const birth = { year: 1991, month: 4, day: 12, hour: 12, gender: 'female' as const, calendar: 'solar' as const }
const derivedKeys = ['birth:solar:1991-4-12:12', 'hourPillar:甲午', 'dayMasterStrength:strong', 'dominantElement:fire', 'weakElement:water', 'usefulGod:wood', 'tenGod:정관', 'gyeokguk:임시격국', 'climate:summer:hot', 'flowBridge:wood']
const safeKeys = ['service:work_job', 'yearPillar:辛未', 'monthPillar:壬辰', 'dayPillar:壬子', 'dayMaster:壬', 'dayMasterElement:water', 'concern:시주라는 말을 질문했어요', 'work:직장']
const paidText = '유료 원문은 그대로 보존합니다. 고객이 “시주가 뭔가요?”라고 질문한 내용도 삭제하지 않습니다.'
function fixture(birthTimeKnown?: boolean): ReportRecord {
  const context: SajuReportContext = { serviceKey: 'work_job', ...(birthTimeKnown === undefined ? {} : { birthTimeKnown }) }
  return {
    reportId: 'legacy-serializer', resultId: 'public-serializer', birth, context,
    analysis: { ...analyzeSaju(birth), summary: '임시 시각 분석 요약_SENTINEL' },
    status: 'complete', createdAt: '2026-10-14T00:00:00Z', updatedAt: '2026-10-14T00:00:00Z',
    report: { title: '원래 리포트', subtitle: '원래 부제', model: 'static-fixture', generatedBy: 'template', sections: [{
      id: 'legacy-section', order: 1, imageKey: 'static-fixture', imageSrc: '/static-fixture.webp', imageAlt: '이미지 설명', category: '일', categoryEn: 'Work', classification: '원래 항목', hook: '원래 후킹',
      patternKeys: [...safeKeys, ...derivedKeys], ragTopics: ['일반 질문'], interpretation: paidText, status: 'complete',
      storytelling: { feel: '고객의 감정 문장', softBridge: '고객과 연결하는 문장', scene: '관찰한 장면', actions: ['실제 계약서 확인'], imagePrompt: { ko: '이미지 안내', en: 'image guidance' }, tableMd: '| 직접 입력한 이동 | 30분 |', tableCaption: '직접 입력한 정보', chartPoints: [{ label: '편도 이동', value: 30, note: '직접 입력한 편도 시간' }], chartCaption: '입력한 이동 시간', flowSteps: [{ label: '확인', value: '계약서', note: '직접 받은 문서' }] },
    }] },
  }
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value)
    for (const child of Object.values(value)) freeze(child)
  }
  return value
}

test('unknown client serialization masks legacy derived keys in the returned clone only', () => {
  const record = fixture(false)
  const before = structuredClone(record)
  freeze(record)
  const result = toClientReport(record)
  assert.deepEqual(result.sections[0].patternKeys, safeKeys)
  assert.deepEqual(record, before)
  assert.notEqual(result.sections[0], record.report.sections[0])
  assert.equal(result.reportId, record.reportId)
  assert.equal(result.resultId, record.resultId)
  assert.equal(result.sections[0].interpretation, paidText)
  assert.deepEqual(result.sections[0].storytelling, before.report.sections[0].storytelling)
  result.sections[0].patternKeys.push('returned-only')
  assert.deepEqual(record.report.sections[0].patternKeys, before.report.sections[0].patternKeys)
})

test('known and omitted certainty retain all existing pattern keys, paid prose and story fields', () => {
  for (const known of [true, undefined]) {
    const record = fixture(known)
    const before = structuredClone(record)
    const result = toClientReport(freeze(record))
    assert.deepEqual(result.sections[0].patternKeys, [...safeKeys, ...derivedKeys])
    assert.equal(result.sections[0].interpretation, paidText)
    assert.deepEqual(result.sections[0].storytelling, before.report.sections[0].storytelling)
    assert.deepEqual(record, before)
  }
})

function chatFixture(known?: boolean): ReportRecord {
  const record = fixture(known)
  record.report.sections[0].id = 'chat-reply'
  record.context = { ...record.context, savedChat: { version: 1, requestId: 'request-fixture', message: '고객 질문', history: [], messages: [], intent: 'career', model: 'static-fixture', maxTokens: 10 } } as SajuReportContext
  return record
}

test('unknown saved chat serialization suppresses provisional summary without changing the saved reply', () => {
  const record = chatFixture(false)
  const before = structuredClone(record)
  const result = toSavedChatResult(freeze(record))
  assert.equal(result.sajuSummary, '')
  assert.doesNotMatch(JSON.stringify(result), /임시 시각 분석 요약_SENTINEL/)
  assert.equal(result.reply, paidText)
  assert.equal(result.reportId, record.reportId)
  assert.deepEqual(record, before)
})

test('known and omitted saved chat certainty preserve their existing summary and reply', () => {
  for (const known of [true, undefined]) {
    const record = chatFixture(known)
    const result = toSavedChatResult(freeze(record))
    assert.equal(result.sajuSummary, '임시 시각 분석 요약_SENTINEL')
    assert.equal(result.reply, paidText)
  }
})
