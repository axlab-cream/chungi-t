import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { buildTemplateSajuReport } from '../../src/report/report-generator.js'
import { createOrGetReportRecord, toClientReport } from '../../src/report/report-store.js'

const sourceParts = [
  {
    file: 'tone-v2/source/산출물-실전/pass_angle/part01.md',
    groups: [
      ['나, 붙을 각이야?', ['전체 흐름 판정', '지금이 붙는 구간인지', '밀어주는 기운 vs 잡는 기운', '올해 GO/HOLD 시그널', '한 번에 갈 각 vs 길게 볼 각']],
      ['내 머리 쓰는 법', ['암기형 vs 이해형', '몰아치기 vs 꾸준형', '혼자 vs 같이', '집중 끊기는 지점', '슬럼프 오는 패턴']],
    ],
  },
  {
    file: 'tone-v2/source/산출물-실전/pass_angle/part02.md',
    groups: [
      ['나랑 맞는 시험', ['객관식형 vs 서술형', '조직·규율형 시험', '자격·전문직형', '어학·인증형', '실기·기술형', '말로 하는 시험(면접·구술)']],
      ['붙는 타이밍', ['올해 흐름', '대운이 밀어주는 구간', '유리한 달·불리한 달', '원서·접수 시기', '재도전 판단 시점']],
    ],
  },
  {
    file: 'tone-v2/source/산출물-실전/pass_angle/part03.md',
    groups: [
      ['공부 방해 요인', ['집중 깨지는 지점', '사람에 끌려다니는 패턴', '비교·SNS 리스크', '돈·생활 걱정', '자기 의심이 올라오는 때']],
      ['버티는 몸과 멘탈', ['번아웃 신호', '수면·회복 리듬', '아침 세팅', '밥·컨디션 관리', '흔들릴 때 붙잡을 한 문장']],
    ],
  },
  {
    file: 'tone-v2/source/산출물-실전/pass_angle/part04.md',
    groups: [
      ['공부 환경 세팅', ['잘 되는 방향', '책상 놓을 자리', '도움 되는 색', '소음·공간 조건', '피해야 할 배치']],
      ['나를 밀어주는 사람', ['귀인 유형', '스터디·학원 궁합', '가족 기대 다루는 법', '멘토 만나는 시기', '피해야 할 조언']],
    ],
  },
  {
    file: 'tone-v2/source/산출물-실전/pass_angle/part05.md',
    groups: [
      ['시험 날 택일과 컨디션', ['시험 택일 보는 법', '좋은 조건', '피할 조건', '내 기준으로 고르는 날', '전날·당일 루틴', '끝나고 할 일']],
      ['현실 액션 플랜', ['목표 쪼개기 프레임', 'D-100·D-30·D-7', '포기할 것 정하기', '재도전 판단 기준', '붙고 나서 첫 90일']],
    ],
  },
] as const

const expected = sourceParts.flatMap((part) => part.groups.flatMap(([category, titles]) => titles.map((title) => ({ category, title }))))

const expectedSourceHashes = [
  '5F556CF8A0A1C235E75E14D5B8B8F4F8A323D51CFCD596CD9EA6971BF1AF86A8',
  'B70D3C021C48FF7AB016F6101C8468E33D8CADF4C4CDDB4FABB501EB379DAD41',
  '40011C37B52A2754E196C49DDFB9A7F8496FBA5A4834F63D7893A35006E69AFC',
  'F899BB1B3ABF45E199ADF368359614836ABFF6ADC29E85F6F72ED85AA13F3ED7',
  'A95B70CD2D2A12A90BBB70ABC1F47B0E9AB91833EDD214CD50402B8B950494EE',
]

function extractExplicitOutline(source: string): Array<{ category: string; title: string }> {
  const marker = '## ★ 긴 목차 규칙 — 이 서비스는 52항목입니다'
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

test('the supplied pass_angle source blocks contain the exact ordered 52-item contract', () => {
  assert.deepEqual(sourceParts.map((part) => part.groups.reduce((count, [, titles]) => count + titles.length, 0)), [10, 11, 10, 10, 11])
  assert.equal(expected.length, 52)

  sourceParts.forEach((part, index) => {
    const source = readFileSync(part.file, 'utf8')
    assert.match(source, /긴 목차 규칙 — 이 서비스는 52항목입니다/)
    assert.equal(createHash('sha256').update(source).digest('hex').toUpperCase(), expectedSourceHashes[index])
    assert.deepEqual(extractExplicitOutline(source), part.groups.flatMap(([category, titles]) => titles.map(title => ({ category, title }))))
  })
})

test('pass_angle template exposes all supplied items once, in source order, with no title substitution', () => {
  const birth = { year: 1994, month: 4, day: 15, hour: 12, gender: 'female' as const, calendar: 'solar' as const }
  const report = buildTemplateSajuReport(analyzeSaju(birth), birth, {
    serviceKey: 'pass_angle',
    name: '합성 목차 점검',
    birthTimeKnown: false,
    exam: { examName: '합성 필기 시험', examDate: '2026-12-01', examType: 'objective' },
  })

  assert.equal(report.sections.length, 52)
  assert.equal(report.progress?.total ?? report.sections.length, 52)
  assert.deepEqual(report.sections.map((section) => ({ category: section.category, title: section.classification })), expected)
  assert.equal(new Set(report.sections.map((section) => section.id)).size, 52)
  assert.ok(report.sections.every((section, index) => section.order === index + 1 && section.ragTopics.length > 0))
})

test('a new stored pass_angle result keeps all 52 items pending with immutable identities', async () => {
  const birth = { year: 1994, month: 4, day: 15, hour: 12, gender: 'female' as const, calendar: 'solar' as const }
  const context = {
    serviceKey: 'pass_angle', name: '합성 저장 점검', birthTimeKnown: false,
    exam: { examName: '합성 필기 시험', examDate: '2026-12-01', examType: 'objective' },
  }
  const analysis = analyzeSaju(birth)
  const templateReport = buildTemplateSajuReport(analysis, birth, context)
  const { record, created } = await createOrGetReportRecord({
    reportId: randomUUID(), birth, context, analysis, templateReport,
    owner: { id: 'pass-angle-outline-test-owner' },
  })
  const client = toClientReport(record)

  assert.equal(created, true)
  assert.deepEqual(client.progress, { complete: 0, total: 52 })
  assert.equal(client.sections.length, 52)
  assert.ok(client.sections.every((section) => section.status === 'pending' && section.hook === '' && section.interpretation === '' && section.generationId))
})
