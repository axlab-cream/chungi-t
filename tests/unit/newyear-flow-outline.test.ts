import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { buildNewYearContext, buildNewYearReport, NEWYEAR_SERVICE_KEY, NEWYEAR_TOC, parseNewYearRequest } from '../../src/flow/newyear-service.js'
import { createOrGetReportRecord, toClientReport } from '../../src/report/report-store.js'

const parts = [
  ['part01.md', '29951470F6F3F77B6439B066B69499AA1A0806AB7650F3694D4A46D20787EE2D', 8],
  ['part02.md', 'D4E4DA591FAF40FAB6FE52D5263D68BD7C64A7672C1FB1EF831732458CD5571A', 8],
  ['part03.md', 'E913940BA5746E0E83322ACE3D8800E2DFD448B5D62EC0447999E8C6179A1888', 9],
  ['part04.md', '2E7568C7347A1CB4BB6EC97724989E69D8D8A0DE775D1D0E1EB854747CC6540E', 6],
  ['part05.md', '3CC82B7A3DD9553EC91F3B97C35C56E470A6B9D4B29F53973F0F5C5C3716B575', 5],
] as const
function outline(source: string) {
  const marker = '## ★ 긴 목차 규칙 — 이 서비스는 36항목입니다'
  const start = source.indexOf(marker); assert.notEqual(start, -1)
  const end = source.indexOf('\n해설 없이 본문만.', start); assert.notEqual(end, -1)
  const result: Array<{ category: string; title: string }> = []; let category = ''
  for (const heading of source.slice(start + marker.length, end).match(/^### .+$/gm) ?? []) {
    const label = heading.slice(4).trim(); const group = label.match(/^〔(.+)〕$/)
    if (group) category = group[1]
    else result.push({ category, title: label.replace(' (※ 종교 의례로 흐르지 않게)', '') })
  }
  return result
}
// 공급 소스 파일(part01~05.md)은 손대지 않는다 — 계약 원본은 해시로 그대로 고정한다.
test('supplied newyear_flow source hashes stay frozen', () => {
  const extracted = parts.flatMap(([file, hash, count]) => { const source = readFileSync(`tone-v2/source/산출물-실전/newyear_flow/${file}`, 'utf8'); assert.equal(createHash('sha256').update(source).digest('hex').toUpperCase(), hash); const items = outline(source); assert.equal(items.length, count); return items })
  assert.equal(extracted.length, 36)
})
/*
 * 2026-09-17 목차 축소: 36 → 20. 대분류(10) 는 그대로 두고 대분류당 2개만 남긴다.
 * 이 서비스는 문단이 항목이 아니라 대분류 단위로 계산돼(`sectionBody`) 항목 수를
 * 줄여도 문단이 사라지지 않는다 — 남는 문단은 그 대분류의 마지막 항목에 붙는다
 * (`buildNewYearReport` 의 `leftover` 처리). 그래서 어떤 항목을 남기든 안전하지만,
 * 공급 원본에 없는 제목을 새로 짓지는 않는다.
 */
test('newyear_flow runtime keeps a reviewed subset of the supplied items, invents no new titles', () => {
  const extracted = parts.flatMap(([file]) => outline(readFileSync(`tone-v2/source/산출물-실전/newyear_flow/${file}`, 'utf8')))
  const runtime = NEWYEAR_TOC.flatMap((group) => group.items.map((item) => ({ category: group.title, title: item.title })))
  assert.equal(runtime.length, 20, '10대분류 × 36항목 → 10대분류 × 20항목으로 줄이기로 했다')
  const supplied = new Set(extracted.map((item) => item.title))
  assert.deepEqual(runtime.filter((item) => !supplied.has(item.title)).map((item) => item.title), [], '공급되지 않은 제목을 새로 지어내지 않는다')
  assert.equal(new Set(NEWYEAR_TOC.flatMap((group) => group.items.map((item) => item.id))).size, 20)
})
test('new isolated newyear_flow record retains 20 immutable pending identities', async () => {
  const birth = { year: 1991, month: 4, day: 18, hour: 11, gender: 'female' as const, calendar: 'solar' as const }
  const input = parseNewYearRequest({ displayName: '합성 새해 흐름 점검' }); const analysis = analyzeSaju(birth); const context = buildNewYearContext(input.displayName, input, analysis, true); const reportId = randomUUID(); const templateReport = buildNewYearReport(analysis, birth, context, input, reportId)
  const { record, created } = await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport, owner: { id: 'newyear-outline-test-owner' } }); const client = toClientReport(record)
  assert.equal(created, true); assert.equal(record.context.serviceKey, NEWYEAR_SERVICE_KEY); assert.deepEqual(client.progress, { complete: 0, total: 20 }); assert.ok(client.sections.every((section) => section.status === 'pending' && section.hook === '' && section.interpretation === '' && section.generationId))
})
test('newyear live harness is isolated, fresh-only, fail-closed and replaying', () => {
  const script = readFileSync(new URL('../../scripts/check-newyear-flow-outline-live.ts', import.meta.url), 'utf8')
  assert.match(script, /isolateLiveCheckEnvironment\(process\.env\)/); assert.match(script, /OPENAI_REASONING_EFFORT = 'low'/); assert.match(script, /shouldResume && !shouldGenerate/); assert.match(script, /retry: stored\.status === 'failed'/); assert.match(script, /assert\.equal\(templateReport\.sections\.length, 20\)/); assert.match(script, /if \(generated\.status !== 'complete'\) break/); assert.match(script, /attemptedAfterFailure\.length, 0/); assert.match(script, /reviewGeneratedSajuReportSection/); assert.doesNotMatch(script, /from ['"][^'"]*supabase|process\.env\.(?:SUPABASE|DATABASE_URL)/i)
})
