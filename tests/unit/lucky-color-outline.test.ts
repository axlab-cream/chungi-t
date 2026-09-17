import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildLuckyColorContext,
  buildLuckyColorReport,
  LUCKY_COLOR_SERVICE_KEY,
  LUCKY_COLOR_TOC,
  parseLuckyColorRequest,
} from '../../src/body/lucky-service.js'
import { luckyDetails } from '../../src/body/lucky-practical-readings.js'
import { createOrGetReportRecord, toClientReport } from '../../src/report/report-store.js'

const sourceParts = [
  {
    file: 'tone-v2/source/산출물-실전/lucky_color/part01.md',
    hash: '840BDDDFFE05BE2D8D2CF4CF71E4D3C1E5607217AFDC63E59AC3193C263B4E22',
    groups: [
      ['나 무슨 기운이야?', ['넘치는 기운 모자란 기운', '어디서 밸런스 깨져?', '채워야 할 기운 한 줄', '멀리하면 편한 기운 한 줄']],
      ['내 색 뭐야?', ['나한테 붙는 색', '옷에 쓰는 법', '가방·소품에 쓰는 법', '방에 쓰는 법']],
    ],
  },
  {
    file: 'tone-v2/source/산출물-실전/lucky_color/part02.md',
    hash: 'E7C3AE3584EC1A7A63AA4A003E9ED3BF34AB9C38F441D21465612FDD1945B36C',
    groups: [
      ['늘 지니면 좋은 건?', ['나한테 붙는 재질과 형태', '가방에 하나 넣는다면', '몸에 걸친다면', '책상에 둔다면']],
      ['오히려 멀리할 건?', ['거리 두면 편한 색', '과하면 오히려 걸리는 재질', '지금 방에서 빼면 가벼워지는 것']],
    ],
  },
  {
    file: 'tone-v2/source/산출물-실전/lucky_color/part03.md',
    hash: 'EE290203809D2749AB4A171EE68C35A679EDF0842A8AA96AC355A34ECDA3614D',
    groups: [
      ['어디 앉아야 잘 풀려?', ['나한테 열리는 방향', '책상 둘 자리', '침대 둘 자리', '앉으면 답답해지는 자리']],
      ['하루를 어떻게 굴려?', ['아침 세팅', '집중 터지는 시간대', '뭘 먹으면 붙어?', '잘 자는 법', '오늘 당장 뭐 하지?']],
    ],
  },
] as const

const expected = sourceParts.flatMap((part) => part.groups.flatMap(([category, titles]) =>
  titles.map((title) => ({ category, title }))))

function extractExplicitOutline(source: string): Array<{ category: string; title: string }> {
  const marker = '## ★ 긴 목차 규칙 — 이 서비스는 24항목입니다'
  const start = source.indexOf(marker)
  assert.notEqual(start, -1)
  const bodyStart = start + marker.length
  const end = source.indexOf('\n해설 없이 본문만.', bodyStart)
  assert.notEqual(end, -1)
  const headings = source.slice(bodyStart, end).match(/^### .+$/gm) ?? []
  const result: Array<{ category: string; title: string }> = []
  let category = ''
  for (const heading of headings) {
    const label = heading.slice(4).trim()
    const group = label.match(/^〔(.+)〕$/)
    if (group) category = group[1]
    else {
      assert.ok(category, `item heading appeared before a group: ${label}`)
      result.push({ category, title: label })
    }
  }
  return result
}

// 공급 소스 파일(part01~03.md)은 손대지 않는다 — 계약 원본은 해시로 그대로 고정한다.
test('the supplied lucky_color source blocks contain the exact ordered 24-item contract', () => {
  assert.deepEqual(sourceParts.map((part) => part.groups.reduce((count, [, titles]) => count + titles.length, 0)), [8, 7, 9])
  assert.equal(expected.length, 24)
  for (const part of sourceParts) {
    const source = readFileSync(part.file, 'utf8')
    assert.equal(createHash('sha256').update(source).digest('hex').toUpperCase(), part.hash)
    assert.deepEqual(extractExplicitOutline(source), part.groups.flatMap(([category, titles]) =>
      titles.map((title) => ({ category, title }))))
  }
})

/*
 * 2026-09-17 목차 축소: 24 → 13. 대분류(6) 는 그대로 두고 대분류당 2개만 남긴다.
 * quit_fortune 과 같은 방식으로 "13개는 24개의 부분집합이고 새 제목을 짓지 않는다"로
 * 계약을 바꾼다. luckyDetails 는 제목으로 찾는 사전이라 남은 제목마다 직접 해석이
 * 있어야 한다는 요건은 그대로 검사한다.
 */
test('lucky_color runtime keeps a reviewed subset of the supplied items, invents no new titles', () => {
  const actual = LUCKY_COLOR_TOC.flatMap((group) => group.items.map((item) => ({ category: group.title, title: item.title })))
  const readings = luckyDetails({ colors: '검증 색', materials: '검증 재질', shape: '검증 형태', direction: '검증 방향' })
  assert.equal(actual.length, 13, '6대분류 × 24항목 → 6대분류 × 13항목으로 줄이기로 했다')
  const supplied = new Set(expected.map(({ title }) => title))
  assert.deepEqual(actual.filter(({ title }) => !supplied.has(title)).map(({ title }) => title), [], '공급되지 않은 제목을 새로 지어내지 않는다')
  assert.equal(new Set(LUCKY_COLOR_TOC.flatMap((group) => group.items.map((item) => item.id))).size, 13)
  assert.deepEqual(actual.filter(({ title }) => !readings[title]), [])
})

test('a new isolated lucky_color record keeps all 13 items pending with immutable identities', async () => {
  const birth = { year: 1993, month: 7, day: 14, hour: 9, gender: 'female' as const, calendar: 'solar' as const }
  const input = parseLuckyColorRequest({ displayName: '합성 색과 물건 점검' })
  const context = buildLuckyColorContext('합성 색과 물건 점검', input)
  const analysis = analyzeSaju(birth)
  const reportId = randomUUID()
  const templateReport = buildLuckyColorReport(analysis, birth, context, input, reportId)
  const { record, created } = await createOrGetReportRecord({
    reportId,
    birth,
    context,
    analysis,
    templateReport,
    owner: { id: 'lucky-color-outline-test-owner' },
  })
  const client = toClientReport(record)
  assert.equal(created, true)
  assert.equal(record.context.serviceKey, LUCKY_COLOR_SERVICE_KEY)
  assert.deepEqual(client.progress, { complete: 0, total: 13 })
  assert.equal(client.sections.length, 13)
  assert.ok(client.sections.every((section) =>
    section.status === 'pending' && section.hook === '' && section.interpretation === '' && section.generationId))
})

test('the lucky_color live harness isolates credentials, requires fresh storage, stops on first failure and replays output', () => {
  const script = readFileSync(new URL('../../scripts/check-lucky-color-outline-live.ts', import.meta.url), 'utf8')
  assert.match(script, /isolateLiveCheckEnvironment\(process\.env\)/)
  assert.match(script, /REPORT_STORAGE_DIR = resolve\('\.cache\/reading-live-20260907'\)/)
  assert.match(script, /serviceKey:\s*LUCKY_COLOR_SERVICE_KEY/)
  assert.match(script, /assert\.equal\(templateReport\.sections\.length, 13\)/)
  assert.match(script, /requireFresh && record[\s\S]*Fresh lucky_color outline version already exists/)
  assert.match(script, /if \(generated\.status !== 'complete'\) break/)
  assert.match(script, /assert\.equal\(attemptedAfterFailure\.length, 0/)
  assert.match(script, /assertRequestedPrefixComplete/)
  assert.match(script, /reviewGeneratedSajuReportSection/)
  assert.doesNotMatch(script, /from ['"][^'"]*supabase|process\.env\.(?:SUPABASE|DATABASE_URL)/i)
})
