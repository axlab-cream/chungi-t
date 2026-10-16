import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { analyzeSaju, sixCharAnalysis } from '../../src/saju/analyzer.js'
import { GROUPS, birthSeed, buildFreePreview, freePreviewFacts, freePreviewForService } from '../../src/report/free-preview.js'
import type { BirthInput } from '../../src/types/index.js'

const bank = JSON.parse(readFileSync('data/teaser/free-preview-saju-master.json', 'utf8'))
const ELEMENTS = ['wood', 'fire', 'earth', 'metal', 'water']
const STEMS = [...'甲乙丙丁戊己庚辛壬癸']
const birthOf = (year: number, month: number, day: number, hour: number, minute: number, gender: 'male' | 'female') =>
  ({ year, month, day, hour, minute, gender, calendar: 'solar' }) as BirthInput
const A = birthOf(1987, 6, 10, 20, 0, 'female')
const B = birthOf(1992, 11, 3, 8, 30, 'male')
const C = birthOf(1979, 2, 20, 15, 0, 'female')

function sentences(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(sentences)
  if (value && typeof value === 'object') return Object.values(value).flatMap(sentences)
  return []
}

test('문장 묶음: 칸마다 모든 값의 문장이 있고, 짝 칸은 변형 수가 같다', () => {
  for (const stem of STEMS) for (const strength of ['strong', 'balanced', 'weak']) assert.ok(bank.now.outer[stem]?.[strength], `${stem} ${strength}`)
  for (const group of GROUPS) {
    for (const slot of ['habit', 'want', 'lately']) assert.ok(bank.now[slot][group]?.length >= 2, `now.${slot}.${group}`)
    for (const stage of ['new', 'early', 'mid', 'late']) assert.ok(bank.luck.phase[stage][group], `phase ${stage} ${group}`)
    assert.ok(bank.luck.phaseYear[group])
    assert.ok(bank.luck.picture[group]?.length >= 2)
    for (const slot of ['act', 'hole', 'year', 'ask']) assert.ok(bank.love[slot][group]?.length >= 2, `love.${slot}.${group}`)
    for (const speaker of ['base', 'female']) assert.ok(bank.love.open[speaker][group]?.every((line: string) => line.startsWith('{이름}, ')))
    assert.equal(bank.love.act[group].length, bank.love.ask[group].length, `${group} act/ask 짝`)
  }
  for (const element of ELEMENTS) for (const slot of [bank.luck.open, bank.luck.strength, bank.love.start]) assert.ok(slot[element]?.length >= 2, element)
  assert.equal(bank.money.tease.length, bank.money.ask.has.length, 'tease/ask 짝')
  for (const bowl of ['many_shown', 'many_hidden', 'some_shown', 'some_hidden', 'none']) assert.ok(bank.money.bowl[bowl]?.length >= 2)
})

test('문장 묶음: 사주 용어·한자·숫자·줄표·따옴표·보류 말투가 없고 문장은 90자 이하다', () => {
  const all = sentences({ ...bank, note: undefined, version: undefined, service: undefined })
  assert.ok(all.length >= 200, `문장 ${all.length}개`)
  for (const line of all) {
    assert.doesNotMatch(line, /관성|재성|식상|비겁|인성|일간|대운|세운|용신|오행|신강|신약|십신|[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]/, line)
    assert.doesNotMatch(line, /판(?!단|을 넓히)|[0-9]|—|["“”‘’]|(^|\s)야,|수 있|아마|가능성|복채/, line)
    assert.doesNotMatch(line.replace('{이름}', ''), /[{}]/, line)
    for (const part of line.split(/(?<=[.?])\s/)) assert.ok(part.length <= 90, `${part.length}자: ${part}`)
  }
  for (const line of sentences([bank.now, bank.luck, bank.money, bank.love.start, bank.love.act, bank.love.hole, bank.love.year, bank.love.ask])) assert.doesNotMatch(line, /\{이름\}/, line)
  // 연애 올해 칸은 앞 칸의 "유형"을 받는다.
  for (const line of sentences(bank.love.hole)) assert.match(line, /유형/)
  for (const line of sentences(bank.love.year)) assert.match(line, /그 유형/)
})

test('견본 세 사람: 계산값으로 고른 칸이 확정 견본과 같다', () => {
  const facts = [A, B, C].map((birth) => freePreviewFacts(analyzeSaju(birth), true))
  assert.deepEqual(facts.map((f) => [f?.dayMaster, f?.strength, f?.topGroup, f?.weakGroup, f?.luckGroup, f?.luckStage, f?.moneyBowl, f?.loveElement]), [
    ['庚', 'weak', '관성', '식상', '비겁', 'new', 'many_shown', 'fire'],
    ['癸', 'balanced', '관성', '식상', '식상', 'mid', 'some_shown', 'earth'],
    ['戊', 'strong', '비겁', '재성', '식상', 'early', 'none', 'fire'],
  ])
  const a = buildFreePreview(analyzeSaju(A), birthSeed(A, true), true, 'female')!
  assert.equal(a.now[0], '너, 겉으론 칼같이 단단해 보이는데 속은 생각보다 쉽게 베이잖아.')
  assert.deepEqual([a.now.length, a.luck.length, a.money.length, a.love.length], [3, 4, 3, 4])
  assert.match(a.luck[0], /올해부터 운의 방향이 완전히 바뀌었거든\./)
  assert.match(a.money[0], /^너는 돈 들어오는 문이 넓은 사람이야\./)
  assert.equal(a.love.length, 4)
  assert.match(a.love[0], /^\{이름\}, 넌 /)
  assert.match(a.love[3], /더 궁금하지 않아\?$/)
  const c = buildFreePreview(analyzeSaju(C), birthSeed(C, true), true, 'base')!
  assert.match(c.money[0], /돈 자리가/)
  assert.match(c.love[0], /^\{이름\}, 너 은근 (고집 센|지기 싫어하는) 애야\./)
})

test('같은 사람은 늘 같은 문장, 다른 사람은 다른 조합. 끝맺음은 한 화면에서 겹치지 않는다', () => {
  const first = buildFreePreview(analyzeSaju(B), birthSeed(B, true), true, 'base')
  assert.deepEqual(buildFreePreview(analyzeSaju(B), birthSeed(B, true), true, 'base'), first)
  const screens = new Set<string>()
  for (let i = 0; i < 120; i += 1) {
    const birth = birthOf(1950 + (i * 7) % 56, 1 + (i * 5) % 12, 1 + (i * 11) % 28, (i * 3) % 24, (i * 13) % 60, i % 2 ? 'male' : 'female')
    const preview = buildFreePreview(analyzeSaju(birth), birthSeed(birth, true), true, i % 2 ? 'female' : 'base')
    assert.ok(preview, JSON.stringify(birth))
    const luckEnd = bank.endings.find((line: string) => preview.luck.at(-1)!.endsWith(line))
    const moneyEnd = bank.endings.find((line: string) => preview.money.at(-1)!.endsWith(line))
    assert.ok(luckEnd && moneyEnd)
    assert.notEqual(luckEnd.split(' ')[0], moneyEnd.split(' ')[0], '끝맺음 첫 낱말이 겹침')
    assert.equal([...preview.now, ...preview.luck, ...preview.money, ...preview.love.slice(1)].some((p) => p.includes('{이름}')), false)
    screens.add(JSON.stringify(preview))
  }
  assert.ok(screens.size >= 115, `서로 다른 화면 ${screens.size}개`)
})

test('시간을 모르면 대운 시점 대신 올해 기운으로 고르고, 씨앗에 임시 시각이 섞이지 않는다', () => {
  const unknownNoon = { ...A, hour: 12, minute: 0 }
  const unknownMorning = { ...A, hour: 9, minute: 0 }
  assert.equal(birthSeed(unknownNoon, false), birthSeed(unknownMorning, false))
  const facts = freePreviewFacts(sixCharAnalysis(analyzeSaju(unknownNoon)), false)!
  assert.equal(facts.luckStage, null)
  assert.equal(facts.luckGroup, facts.yearGroup)
  const preview = buildFreePreview(sixCharAnalysis(analyzeSaju(unknownNoon)), birthSeed(unknownNoon, false), false, 'base')!
  assert.ok(preview.luck[0].includes(bank.luck.phaseYear[facts.yearGroup]))
})

test('해가 바뀌면 올해 칸은 그해 계산값으로 다시 고른다', () => {
  const analysis = analyzeSaju(B)
  const nextYear = { ...analysis, fortune: { ...analysis.fortune!, currentYear: analysis.fortune!.currentYear + 1, yearPillar: '戊申' } }
  assert.notEqual(freePreviewFacts(analysis, true)?.yearGroup, freePreviewFacts(nextYear, true)?.yearGroup)
  const love = (value: typeof analysis) => buildFreePreview(value, birthSeed(B, true), true, 'base')!.love[2]
  assert.notEqual(love(analysis), love(nextYear))
})

test('켠 서비스(천명, 키 없음 포함)에만 무료 미리보기 문단이 붙고 화자 설정을 따른다', () => {
  const config = JSON.parse(readFileSync('data/runtime-config.json', 'utf8')).freePreview
  assert.deepEqual(config.services, ['saju_master'])
  const preview = freePreviewForService(analyzeSaju(A), A, { serviceKey: 'saju_master', birthTimeKnown: true })
  assert.equal(preview?.speaker, config.loveSpeaker === 'female' ? 'female' : 'base')
  assert.equal(freePreviewForService(analyzeSaju(A), A, { serviceKey: 'job_choice', birthTimeKnown: true }), undefined)
  // 천명 기본 화면은 서비스 키 없이 온다.
  assert.equal(freePreviewForService(analyzeSaju(A), A, {})?.speaker, preview?.speaker)
  assert.ok(freePreviewForService(analyzeSaju(A), A, { serviceKey: 'cmdg' }))
  assert.ok(freePreviewForService(analyzeSaju(A), A, { serviceKey: '' }))
  assert.ok(freePreviewForService(analyzeSaju(A), A, { serviceKey: null }))
})
