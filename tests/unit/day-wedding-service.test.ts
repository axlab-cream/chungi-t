import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  WEDDING_TOC,
  createWeddingReportId,
  buildWeddingContext,
  buildWeddingFrame,
  buildWeddingReport,
  buildWeddingTeaser,
  judgeCandidate,
  parseWeddingRequest,
} from '../../src/day/wedding-service.js'
import type { BirthInput } from '../../src/types/index.js'

/** as const 목차의 중분류를 한 줄로 펼친다. 대분류마다 튜플 타입이 달라 여기서 넓힌다. */
type TocItem = { id: string; title: string; note: string; why: string }
const allItems: TocItem[] = WEDDING_TOC.flatMap((group) => group.items as readonly TocItem[])

const BIRTH: BirthInput = {
  year: 1975, month: 9, day: 26, hour: 5, minute: 0,
  gender: 'male', calendar: 'solar', isLeapMonth: false,
}

const INPUT = parseWeddingRequest({
  candidateDate1: '2027-05-15',
  candidateDate2: '2027-05-22',
  candidateDate3: '2027-10-09',
  partnerBirth: '1988-03-11',
  partnerTime: '14:30',
  format: '예식장',
  familyLimit: '특정 주말만 가능',
})

test('택일 목차는 6 대분류 21 중분류를 유지한다', () => {
  assert.equal(WEDDING_TOC.length, 6)
  assert.equal(allItems.length, 21)
  // 05 목차와 06 상세가 이 id 로 라우팅하므로 중복이 있으면 상세가 엉뚱한 항목을 연다.
  assert.equal(new Set(allItems.map((item) => item.id)).size, 21)
  for (const group of WEDDING_TOC) {
    for (const item of group.items as readonly TocItem[]) {
      assert.match(item.id, new RegExp(`^${group.number}-\\d+$`))
    }
  }
})

test('입력은 날짜 형식과 선택지를 검증한다', () => {
  assert.deepEqual(INPUT.candidateDates, ['2027-05-15', '2027-05-22', '2027-10-09'])
  assert.equal(INPUT.format, '예식장')
  assert.equal(INPUT.familyLimit, '특정 주말만 가능')
  assert.equal(INPUT.partnerBirth?.year, 1988)
  assert.equal(INPUT.partnerBirth?.hour, 14)

  // 달력에 없는 날, 형식이 틀린 날, 목록에 없는 선택지는 버린다.
  const junk = parseWeddingRequest({
    candidateDate1: '2027-02-30',
    candidateDate2: '2027/05/22',
    candidateDate3: '2027-05-22',
    format: '야외결혼',
    familyLimit: '아무때나',
  })
  assert.deepEqual(junk.candidateDates, ['2027-05-22'])
  assert.equal(junk.format, undefined)
  assert.equal(junk.familyLimit, undefined)

  // 같은 날을 두 번 넣으면 한 번만 본다.
  const dup = parseWeddingRequest({ candidateDate1: '2027-05-22', candidateDate2: '2027-05-22' })
  assert.deepEqual(dup.candidateDates, ['2027-05-22'])
})

test('후보일 일주와 절기 달은 계산으로 나온다', () => {
  const analysis = analyzeSaju(BIRTH)
  const view = judgeCandidate('2027-05-15', [{ label: '본인', analysis }])
  assert.ok(view)
  assert.equal(view.pillar, '甲午')
  // 5월 15일은 입하 구간이고, 10월 9일은 한로 구간이다.
  assert.equal(view.termName, '입하')
  assert.equal(judgeCandidate('2027-10-09', [{ label: '본인', analysis }])?.termName, '한로')
  assert.match(view.label, /2027년 5월 15일\(토\)/)
  assert.equal(judgeCandidate('2027-02-30', [{ label: '본인', analysis }]), null)
})

test('충·합·해 판정은 명식이 쓰는 짝 표만 따른다', () => {
  const analysis = analyzeSaju(BIRTH)
  const partner = analyzeSaju(INPUT.partnerBirth!)
  // 본인 일지는 亥, 상대 일지는 丑이다.
  assert.equal(analysis.fourPillars.day.branch, '亥')
  assert.equal(partner.fourPillars.day.branch, '丑')

  const view = judgeCandidate('2027-05-15', [
    { label: '본인', analysis },
    { label: '상대', analysis: partner },
  ])!
  assert.equal(view.dayBranch, '午')
  // 亥午 는 짝 표에 없어 무관, 丑午 는 害 짝이다.
  assert.equal(view.sides[0].relation, '무관')
  assert.equal(view.sides[1].relation, '해')
  assert.equal(view.cautions, 1)
})

test('판정은 조건 개수로만 나오고 등급을 매기지 않는다', () => {
  const frame = buildWeddingFrame(analyzeSaju(BIRTH), INPUT)
  assert.equal(frame.candidates.length, 3)
  assert.equal(frame.hasPartner, true)
  for (const candidate of frame.candidates) {
    assert.ok(candidate.favourable >= 0 && candidate.cautions >= 0)
    assert.match(candidate.verdict, /조건이 맞는 편|걸리는 조건은 없는 편|조건이 반은 맞는 편|걸리는 조건이 있는 편/)
  }
  // 최선은 주의가 가장 적은 쪽이다.
  assert.ok(frame.best)
  const worst = Math.max(...frame.candidates.map((c) => c.cautions))
  assert.ok(frame.best.cautions <= worst)
})

test('후보일이 없으면 판정 없이도 리포트가 선다', () => {
  const empty = parseWeddingRequest({})
  assert.deepEqual(empty.candidateDates, [])
  const frame = buildWeddingFrame(analyzeSaju(BIRTH), empty)
  assert.equal(frame.candidates.length, 0)
  assert.equal(frame.best, null)
  const report = buildWeddingReport(analyzeSaju(BIRTH), BIRTH, buildWeddingContext('정재용', empty), empty)
  assert.equal(report.sections.length, 21)
  for (const section of report.sections) {
    assert.ok(section.interpretation.length > 40, `${section.id} 해석이 비었다`)
  }
})

test('리포트는 중분류마다 섹션 하나를 채운다', () => {
  const report = buildWeddingReport(analyzeSaju(BIRTH), BIRTH, buildWeddingContext('정재용', INPUT), INPUT)
  assert.equal(report.sections.length, 21)
  assert.equal(report.generatedBy, 'template')
  assert.deepEqual(report.sections.map((s) => s.id), allItems.map((i) => i.id))
  for (const section of report.sections) {
    assert.equal(section.status, 'complete')
    assert.ok(section.interpretation.length > 60, `${section.id} 해석이 너무 짧다`)
    // 고객 문장에 내부 용어가 새지 않아야 한다.
    for (const banned of ['RAG', 'KMS', 'LLM', '코퍼스', '지식 블록', 'interpretation:']) {
      assert.ok(!section.interpretation.includes(banned), `${section.id} 에 ${banned} 노출`)
    }
  }
})

test('택일 문장은 길일·흉일을 선고하지 않는다', () => {
  const report = buildWeddingReport(analyzeSaju(BIRTH), BIRTH, buildWeddingContext('정재용', INPUT), INPUT)
  const text = report.sections.map((s) => `${s.hook} ${s.interpretation}`).join(' ')
  for (const banned of ['무조건', '반드시', '100%', '망한다', '손없는날', '부적', '길시']) {
    assert.ok(!text.includes(banned), `${banned} 가 문장에 있다`)
  }
  // 길일·흉일은 부정할 때만 쓴다. 단정으로 쓰이면 상품의 성격이 바뀐다.
  for (const match of text.match(/[^.]*(?:길일|흉일)[^.]*\./g) ?? []) {
    assert.match(match, /선고하지 않|아니/, `단정으로 쓰인 문장: ${match.trim()}`)
  }
  // 그리고 그 부정 문장은 반드시 한 번은 있어야 한다.
  assert.ok(/길일·흉일(로|을) 선고하지 않습니다/.test(text), '길흉을 선고하지 않는다는 문장이 없다')
})

test('무료 티저는 후보일 판정을 앞세우고 유료 범위를 숨기지 않는다', () => {
  const teaser = buildWeddingTeaser(analyzeSaju(BIRTH), INPUT, buildWeddingContext('정재용', INPUT))
  assert.match(teaser.headline, /2027년/)
  assert.ok(teaser.lines.some((line) => line.includes('甲午')))
  assert.ok(teaser.lines.some((line) => line.includes('선고하지 않습니다')))
  assert.equal(teaser.scope.length, 6)
  assert.equal(teaser.scope.reduce((n, group) => n + group.items.length, 0), 21)
})
test('동일 후보일도 상대나 준비 조건이 달라지면 별도 해석으로 저장한다', () => {
  const analysis = analyzeSaju(BIRTH)
  const id = createWeddingReportId(analysis, BIRTH, INPUT)
  assert.equal(id, createWeddingReportId(analysis, BIRTH, INPUT))
  assert.notEqual(id, createWeddingReportId(analysis, BIRTH, { ...INPUT, familyLimit: undefined }))
  assert.notEqual(id, createWeddingReportId(analysis, { ...BIRTH, hour: 8 }, INPUT))
})

test('한 자리 시각도 상대 출생시각을 받은 것으로 센다', () => {
  // parseTime 은 '9:30' 을 받아 09:30 으로 읽는다. 확인 여부가 두 자리만 인정하면
  // 유효한 시각을 미상으로 처리해 용신 판단을 불필요하게 끈다.
  assert.equal(parseWeddingRequest({ candidateDate1: '2027-05-15', partnerBirth: '1988-03-11', partnerTime: '9:30' }).partnerBirthTimeKnown, true)
  assert.equal(parseWeddingRequest({ candidateDate1: '2027-05-15', partnerBirth: '1988-03-11', partnerTime: '09:30' }).partnerBirthTimeKnown, true)
  assert.equal(parseWeddingRequest({ candidateDate1: '2027-05-15', partnerBirth: '1988-03-11', partnerTime: '24:00' }).partnerBirthTimeKnown, false)
  assert.equal(parseWeddingRequest({ candidateDate1: '2027-05-15', partnerBirth: '1988-03-11' }).partnerBirthTimeKnown, false)
})

