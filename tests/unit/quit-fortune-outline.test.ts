import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { buildWorkQuitContext, buildWorkQuitReport, parseWorkQuitRequest, WORK_QUIT_TOC } from '../../src/work/quit-service.js'
import { QUIT_DETAILS } from '../../src/work/practical-readings.js'
import { createOrGetReportRecord, toClientReport } from '../../src/report/report-store.js'

const sourceParts = [
  {
    file: 'tone-v2/source/산출물-실전/quit_fortune/part01.md',
    hash: 'BD452FB5E9884EF36B8BBAEA076AE83736A4575FC49E2D56F72CFD1EE9310E4A',
    groups: [
      ['지금 나와도 되는 흐름?', ['전체 판정', '나가고 싶은 이유의 진짜 정체', '버티면 생기는 것', 'GO/HOLD/타이밍 조정', '충동인지 결단인지']],
      ['왜 이렇게 힘든가', ['사람 문제인지 일 문제인지', '조직과 안 맞는 지점', '내 기질이 눌리는 부분', '반복되는 패턴', '자꾸 참게 되는 이유']],
    ],
  },
  {
    file: 'tone-v2/source/산출물-실전/quit_fortune/part02.md',
    hash: 'EFA7F9E12F63DC489B2994F9C917954DBC3A3B9F835D62964FE19AECC630E661',
    groups: [
      ['번아웃 체크', ['지금 소진 단계', '몸이 먼저 보내는 신호', '회복에 필요한 조건', '무리하면 위험한 패턴', '쉬어야 하는 신호']],
      ['돈 시뮬레이션', ['나간 뒤 돈 흐름', '공백기 버틸 체력', '받을 돈 체크 항목', '목돈 사용 원칙', '지출 방어선과 현금흐름 점검 기준']],
    ],
  },
  {
    file: 'tone-v2/source/산출물-실전/quit_fortune/part03.md',
    hash: 'D4226CFE833D5D2418B9C536C644EBF041171B7A680C13B556CBCB4F3707D6F4',
    groups: [
      ['나가면 뭐 할 사람인가', ['이직형·전직형·프리형·창업형', '내가 가진 무기', '다시 조직으로 갈 사람인지', '지금 배워야 할 것']],
      ['퇴사 타이밍', ['올해 흐름', '유리한 달', '피해야 할 시기', '통보 시점', '마지막 출근일 잡는 법']],
    ],
  },
  {
    file: 'tone-v2/source/산출물-실전/quit_fortune/part04.md',
    hash: '814365122CF46E9D1C83AD285677B711BAA86DD8BA93574E8C92ADF2B7E75D00',
    groups: [
      ['나가는 방식', ['상사에게 말하는 법', '뒷말 리스크', '인수인계 함정', '평판 관리', '다시 만날 인연']],
      ['남는다면', ['버티는 조건', '요구해야 할 것', '부서·역할 조정 가능성', '버티는 기한 정하기']],
    ],
  },
  {
    file: 'tone-v2/source/산출물-실전/quit_fortune/part05.md',
    hash: 'B73758A672F8B93473038A92C10A7B15F3AC4B3B290D9C3D403C22CA1163415B',
    groups: [
      ['멘탈과 주변', ['죄책감·불안 다루기', '가족 기대 설득', '남들과 비교되는 순간', '흔들릴 때 붙잡을 기준', '다섯 스승의 서로 다른 조언']],
      ['현실 액션 플랜', ['퇴사 전 체크리스트', 'D-30 준비', '나간 첫 90일', '되돌아갈 조건', '절대 하면 안 되는 행동']],
    ],
  },
] as const

const expected = sourceParts.flatMap(part => part.groups.flatMap(([category, titles]) => titles.map(title => ({ category, title }))))

function extractExplicitOutline(source: string): Array<{ category: string; title: string }> {
  const marker = '## ★ 긴 목차 규칙 — 이 서비스는 48항목입니다'
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

test('the supplied quit_fortune source blocks contain the exact ordered 48-item contract', () => {
  assert.deepEqual(sourceParts.map(part => part.groups.reduce((sum, [, titles]) => sum + titles.length, 0)), [10, 10, 9, 9, 10])
  assert.equal(expected.length, 48)
  sourceParts.forEach(part => {
    const source = readFileSync(part.file, 'utf8')
    assert.equal(createHash('sha256').update(source).digest('hex').toUpperCase(), part.hash)
    assert.deepEqual(extractExplicitOutline(source), part.groups.flatMap(([category, titles]) => titles.map(title => ({ category, title }))))
  })
})

test('quit_fortune runtime exposes all supplied items once and in source order', () => {
  const actual = WORK_QUIT_TOC.flatMap(group => group.items.map(title => ({ category: group.title, title })))
  assert.equal(actual.length, 48)
  assert.deepEqual(actual, expected)
  assert.equal(new Set(WORK_QUIT_TOC.flatMap(group => group.items.map((_, index) => `${group.id}-${index + 1}`))).size, 48)
  assert.deepEqual(
    actual.filter(({ title }) => !QUIT_DETAILS[title]),
    [],
    'every supplied title must own a direct reading instead of an alias to legacy copy',
  )
})

test('a new stored quit_fortune result keeps all 48 items pending with immutable identities', async () => {
  const birth = { year: 1992, month: 8, day: 20, hour: 12, gender: 'female' as const, calendar: 'solar' as const }
  const input = parseWorkQuitRequest({ reason: '업무 소진', tenure: '3년', candidateDate: '2027-02-01', nextPlan: '이직 탐색', concern: '합성 목차 저장 검증' })
  const context = buildWorkQuitContext('합성 저장 점검', input)
  const analysis = analyzeSaju(birth)
  const templateReport = buildWorkQuitReport(analysis, birth, context, input, randomUUID())
  const { record, created } = await createOrGetReportRecord({
    reportId: randomUUID(), birth, context, analysis, templateReport,
    owner: { id: 'quit-fortune-outline-test-owner' },
  })
  const client = toClientReport(record)
  assert.equal(created, true)
  assert.deepEqual(client.progress, { complete: 0, total: 48 })
  assert.equal(client.sections.length, 48)
  assert.ok(client.sections.every(section => section.status === 'pending' && section.hook === '' && section.interpretation === '' && section.generationId))
})
