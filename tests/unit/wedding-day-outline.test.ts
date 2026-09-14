import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { buildWeddingContext, buildWeddingReport, parseWeddingRequest, WEDDING_SERVICE_KEY, WEDDING_TOC } from '../../src/day/wedding-service.js'
import { createOrGetReportRecord, toClientReport } from '../../src/report/report-store.js'
import { reviewPaidSectionDensity } from '../../src/report/tone-v2-review.js'

const parts = [
  ['part01.md', '02E01E2B223D0AD8C2FE690944FD3E457D024CECE005621C50806A0717DBCBCA', 7],
  ['part02.md', '950B4CD63E2B088403A91762CEAA28E9EAA0A886AAD6A1A478E92EEDD509D761', 6],
  ['part03.md', 'A9386C71E0BF70EF738E29E79EC2FF8D9E67573220AF91F722D17876DE9D0631', 7],
] as const

function outline(source: string) {
  const marker = '## ★ 긴 목차 규칙 — 이 서비스는 20항목입니다'
  const start = source.indexOf(marker); assert.notEqual(start, -1)
  const end = source.indexOf('\n해설 없이 본문만.', start); assert.notEqual(end, -1)
  const result: Array<{ category: string; title: string }> = []; let category = ''
  for (const heading of source.slice(start + marker.length, end).match(/^### .+$/gm) ?? []) {
    const label = heading.slice(4).trim(); const group = label.match(/^〔(.+)〕$/)
    if (group) category = group[1]
    else result.push({ category, title: label })
  }
  return result
}

test('supplied wedding_day source hashes and exact ordered 20-item contract stay frozen', () => {
  const extracted = parts.flatMap(([file, hash, count]) => {
    const source = readFileSync(`tone-v2/source/산출물-실전/wedding_day/${file}`, 'utf8')
    assert.equal(createHash('sha256').update(source).digest('hex').toUpperCase(), hash)
    const items = outline(source); assert.equal(items.length, count); return items
  })
  const runtime = WEDDING_TOC.flatMap((group) => group.items.map((item) => ({ category: group.title, title: item.title })))
  assert.equal(extracted.length, 20)
  assert.deepEqual(runtime, extracted)
  assert.equal(new Set(WEDDING_TOC.flatMap((group) => group.items.map((item) => item.id))).size, 20)
})

test('new isolated wedding_day record retains 20 immutable pending identities', async () => {
  const birth = { year: 1991, month: 4, day: 18, hour: 11, gender: 'female' as const, calendar: 'solar' as const }
  const input = parseWeddingRequest({ candidateDate1: '2027-04-11', candidateDate2: '2027-05-23', candidateDate3: '2027-10-18', partnerBirth: '1989-03-11', familyLimit: '5월 넷째 주 가족 일정' })
  const analysis = analyzeSaju(birth); const context = buildWeddingContext('합성 결혼 택일 점검', input, analysis); const reportId = randomUUID(); const templateReport = buildWeddingReport(analysis, birth, context, input, reportId)
  const { record, created } = await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport, owner: { id: 'wedding-outline-test-owner' } }); const client = toClientReport(record)
  assert.equal(created, true); assert.equal(record.context.serviceKey, WEDDING_SERVICE_KEY); assert.deepEqual(client.progress, { complete: 0, total: 20 }); assert.ok(client.sections.every((section) => section.status === 'pending' && section.hook === '' && section.interpretation === '' && section.generationId))
})

test('wedding live harness is isolated, fresh-only, fail-closed and replaying', () => {
  const script = readFileSync(new URL('../../scripts/check-wedding-day-outline-live.ts', import.meta.url), 'utf8')
  assert.match(script, /isolateLiveCheckEnvironment\(process\.env\)/); assert.match(script, /OPENAI_REASONING_EFFORT = 'low'/); assert.match(script, /shouldResume && !shouldGenerate/); assert.match(script, /retry: stored\.status === 'failed'/); assert.match(script, /assert\.equal\(templateReport\.sections\.length, 20\)/); assert.match(script, /if \(generated\.status !== 'complete'\) break/); assert.match(script, /attemptedAfterFailure\.length, 0/); assert.match(script, /reviewGeneratedSajuReportSection/); assert.doesNotMatch(script, /from ['"][^'"]*supabase|process\.env\.(?:SUPABASE|DATABASE_URL)/i)
})

test('wedding planning tables are concrete scenes while abstract marriage wording is not', () => {
  const base = { hook: '4월 11일이 먼저예요.', question: '후보일 판정', context: { serviceKey: WEDDING_SERVICE_KEY, concern: '후보 3개 비교' } }
  const concrete = reviewPaidSectionDensity({ ...base, interpretation: '계산된 후보 3개의 조건을 비교해요. 예식장 상담 테이블에서 홀 대관표와 양가 이동 시간을 같이 펼쳐 놓으면 날짜 차이가 보여요. 후보별 추가 비용을 기록하세요.' })
  const abstract = reviewPaidSectionDensity({ ...base, interpretation: '계산된 후보 3개의 조건을 비교해요. 결혼 준비를 잘하면 날짜 차이가 보여요. 후보별 조건을 기록하세요.' })
  assert.equal(concrete.elements.scene, true)
  assert.equal(abstract.elements.scene, false)
})

test('a wedding plan setting carries a concrete comma-separated comparison action', () => {
  const review = reviewPaidSectionDensity({
    hook: '4월 11일이 먼저예요.', question: '후보일 판정', context: { serviceKey: WEDDING_SERVICE_KEY, concern: '후보 3개 비교' },
    interpretation: '계산된 후보 3개의 조건을 비교해요. 예식장 상담 테이블에서 홀 대관표를 펼쳐 놓으면 차이가 보여요. 다음 기준은 예식장 가능 시간표와 계약 조건이에요. 세 후보일의 홀 시간, 보증 인원, 식대 조건, 양가 이동 부담을 같은 표에 기록하세요.',
  })
  assert.equal(review.elements.nextCriterion, true, JSON.stringify(review))
})

test('an explicit wedding check target carries the polite 적으세요 action', () => {
  const review = reviewPaidSectionDensity({
    hook: '준비량이 기준이에요.', question: '남한테 좋아도 나한텐 다른 이유', context: { serviceKey: WEDDING_SERVICE_KEY, concern: '후보 3개 비교' },
    interpretation: '계산된 후보를 비교해요. 예식장 상담실에서 체크리스트를 펼쳐 놓으면 차이가 보여요. 확인할 대상은 세 후보일별 본인 담당 업무와 이동 동선이에요. 각 날짜 옆에 계약 확인, 의상 이동, 가족 안내, 업체 연락을 적으세요.',
  })
  assert.equal(review.elements.nextCriterion, true, JSON.stringify(review))
})
