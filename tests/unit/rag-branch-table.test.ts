import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { chartFacts, matchesChartCondition, RAG_CONDITION_KEYS } from '../../src/rag/chart-conditions.js'
import { knowledgeBlockToRagChunk, narrowChunkToChart } from '../../src/rag/knowledge-block.js'
import { buildCorpusIndex, formatRagForPrompt, retrieveRagChunks } from '../../src/rag/retriever.js'
import { reviewToneCopy } from '../../src/report/tone-v2-review.js'
import { analyzeSaju, sixCharAnalysis } from '../../src/saju/analyzer.js'
import type { BirthInput, RagChartCondition, RagKnowledgeBlock, SajuAnalysis, SajuReportContext } from '../../src/types/index.js'

/**
 * 참고서 갈래표(2026-10-16): 블록을 "조건 → 뜻" 갈래로 나누고, 그 사람 계산값과 맞지 않는 갈래·블록은
 * AI 에게 보내기 전에 코드에서 뺀다. 10/15 A/B 에서 약한 일간에게 "강한 일간" 조각이 섞인 문제를 막는다.
 */
// 丁卯 丙午 庚寅 丙戌 — 일간 庚, 약함, 수·토 없음(목·화 많음), 여름.
const WEAK: BirthInput = { year: 1987, month: 6, day: 10, hour: 20, minute: 0, gender: 'female', calendar: 'solar' }

const block = (extra: Partial<RagKnowledgeBlock>): RagKnowledgeBlock => ({
  id: 'test-001',
  topic: '시험 블록',
  keywords: ['시험'],
  concept: '시험 개념',
  condition: '시험 조건',
  interpretation: '공통 판단 기준.',
  real_world_pattern: ['가상 사례: 시험 장면인 경우'],
  risk: '위험.',
  opportunity: '기회.',
  advice: '조언.',
  confidence: 'medium',
  forbidden_generalization: '시험만으로 단정하지 않는다.',
  ...extra,
})

describe('갈래표 조건 판정', () => {
  const facts = chartFacts(analyzeSaju(WEAK))

  it('항목끼리는 그리고, 한 항목 안 값은 또는', () => {
    assert.equal(matchesChartCondition({ dayMasterStrength: ['weak'] }, facts, true), true)
    assert.equal(matchesChartCondition({ dayMasterStrength: ['strong', 'balanced'] }, facts, true), false)
    assert.equal(matchesChartCondition({ dayMasterStrength: ['weak'], dayMaster: ['甲'] }, facts, true), false)
    assert.equal(matchesChartCondition({ dayMaster: ['甲', '庚'] }, facts, true), true)
    assert.equal(matchesChartCondition({ elementMissing: ['water'], season: ['summer'] }, facts, true), true)
    assert.equal(matchesChartCondition({ elementMany: ['wood'] }, facts, true), true)
    assert.equal(matchesChartCondition({ tenGodPresent: ['관성'] }, facts, true), true)
    assert.equal(matchesChartCondition({}, facts, true), true)
  })

  it('모르는 조건 키(오타)는 맞지 않는 것으로 막는다', () => {
    assert.equal(matchesChartCondition({ dayMasterStrenght: ['weak'] } as unknown as RagChartCondition, facts, true), false)
  })

  it('명식을 읽지 않는 경우(facts 없음)에는 명식 조건이 맞지 않고, 시간 조건만 본다', () => {
    assert.equal(matchesChartCondition({ dayMasterStrength: ['weak'] }, null, false), false)
    assert.equal(matchesChartCondition({ birthTimeKnown: false }, null, false), true)
    assert.equal(matchesChartCondition({ birthTimeKnown: true }, null, false), false)
  })

  it('맞는 갈래만 남기고, 기본 갈래는 다른 갈래가 없을 때만 쓴다', () => {
    const chunk = knowledgeBlockToRagChunk(block({
      branches: [
        { label: '일간 강함', when: { dayMasterStrength: ['strong'] }, meaning: '강할 때 기준.' },
        { label: '일간 약함', when: { dayMasterStrength: ['weak'] }, meaning: '약할 때 기준.' },
        { label: '기본', when: {}, fallback: true, meaning: '기본 기준.' },
      ],
    }), 'test')
    const narrowed = narrowChunkToChart(chunk, facts, true)
    assert.deepEqual(narrowed?.knowledge?.branches?.map((branch) => branch.label), ['일간 약함'])
    assert.match(narrowed!.content, /\[일간 약함\] 약할 때 기준/)
    assert.doesNotMatch(narrowed!.content, /강할 때|기본 기준/)
    assert.doesNotMatch(narrowed!.searchText!, /강할 때/, '검색 점수도 남은 갈래로만 매긴다')
    assert.deepEqual(narrowChunkToChart(chunk, null, false)?.knowledge?.branches?.map((branch) => branch.label), ['기본'])
  })

  it('블록 조건이 안 맞거나, 갈래가 하나도 안 맞으면 블록째 뺀다. 조건 없는 블록은 그대로', () => {
    assert.equal(narrowChunkToChart(knowledgeBlockToRagChunk(block({ applies_when: { dayMaster: ['甲'] } })), facts, true), undefined)
    assert.equal(narrowChunkToChart(knowledgeBlockToRagChunk(block({ branches: [
      { label: '강함', when: { dayMasterStrength: ['strong'] }, meaning: '강.' },
      { label: '중화', when: { dayMasterStrength: ['balanced'] }, meaning: '중.' },
    ] })), facts, true), undefined)
    const plain = knowledgeBlockToRagChunk(block({}))
    assert.equal(narrowChunkToChart(plain, null, false), plain)
  })

  it('18자 베끼기 검사는 갈래 문장도 본다', () => {
    const chunk = knowledgeBlockToRagChunk(block({ branches: [
      { label: '약함', when: {}, meaning: '책임 범위를 먼저 줄이고 버틸 기준을 정하는 쪽으로 판단.' },
    ] }))
    const issues = reviewToneCopy('지금은 책임 범위를 먼저 줄이고 버틸 기준을 정하는 쪽으로 판단. 그다음을 봐요.', 'saju_master', { corpusEvidence: [chunk] }).issues
    assert.ok(issues.some((issue) => issue.includes('코퍼스 문장을 복사하지 말고')), issues.join(' / '))
  })
})

describe('갈래표 참고서(옛 형식 103조각을 다시 쓴 것)', () => {
  const corpus = buildCorpusIndex()
  const LEGACY_DOMAINS = ['deep_saju_interpretation', 'myeongri_basics', 'input_context_interpretation', 'saju_advanced_manseryeok_gbr']

  it('네 묶음 모두 판단 블록이고, 옛 고정 문구(제목만 가던 변환)는 남지 않는다', () => {
    const chunks = corpus.filter((chunk) => LEGACY_DOMAINS.includes(chunk.domain ?? ''))
    assert.equal(chunks.length, 97)
    assert.ok(chunks.every((chunk) => chunk.knowledge && chunk.knowledge.confidence))
    assert.ok(!chunks.some((chunk) => chunk.content.includes('기존 청크에서 검색된 참고 근거다')))
    for (const chunk of chunks) {
      assert.ok(chunk.knowledge!.real_world_pattern.every((line) => line.startsWith('가상 사례:')), chunk.id)
    }
  })

  it('개발 메모 조각(ds-062/064/065, adv-001/005/006)은 참고서에서 빠졌다', () => {
    for (const id of ['ds-062', 'ds-064', 'ds-065', 'adv-001', 'adv-005', 'adv-006']) {
      assert.ok(!corpus.some((chunk) => chunk.id === id), id)
    }
  })

  it('약한 일간에게는 강한 일간 블록이 오지 않고, 약한 일간 블록에는 맞는 갈래만 간다', () => {
    const analysis = analyzeSaju(WEAK)
    assert.equal(analysis.dayMasterStrength, 'weak')
    const context: SajuReportContext = { serviceKey: 'saju_master', target: '본인', birthTimeKnown: true }
    const chunks = retrieveRagChunks('일간 강약 신강 신약 기질 버티는 힘', analysis, 20, context)
    assert.ok(!chunks.some((chunk) => chunk.id === 'ds-009'), '강한 일간 블록')
    assert.ok(chunks.some((chunk) => chunk.id === 'ds-010'), '약한 일간 블록')
    const prompt = formatRagForPrompt(chunks)
    assert.doesNotMatch(prompt, /\[일간 강함\]|\[신강\]/)
    // 일간 블록은 그 일간에게만 간다.
    const stems = retrieveRagChunks('일간 성격 기질 갑목 을목 병화 정화 무토 기토 경금 신금 임수 계수', analysis, 30, context)
    const dayMasterBlocks = stems.filter((chunk) => /^ds-0(1[1-9]|20)$/.test(chunk.id)).map((chunk) => chunk.id)
    assert.deepEqual(dayMasterBlocks.filter((id) => id !== 'ds-017'), [], '경금(ds-017) 말고 다른 일간 블록')
    // 오행 자료에서 만드는 일간 조언(dm-*)도 그 일간 것만 온다.
    assert.deepEqual(stems.filter((chunk) => chunk.id.startsWith('dm-')).map((chunk) => chunk.id).filter((id) => id !== 'dm-庚'), [])
  })

  it('참고서의 모든 조건은 아는 키·값만 쓰고, 갈래는 블록당 6개까지다', () => {
    const allowed: Record<string, readonly unknown[]> = {
      dayMaster: ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
      dayMasterStrength: ['strong', 'balanced', 'weak'],
      season: ['spring', 'summer', 'autumn', 'winter'],
      temperature: ['cold', 'cool', 'balanced', 'warm', 'hot'],
      interaction: ['천간합', '천간충', '육합', '충', '형', '자형', '파', '해', '반합', '삼합', '방합'],
      dayBranchInteraction: ['육합', '충', '형', '자형', '파', '해', '반합', '삼합', '방합'],
    }
    const elements = ['wood', 'fire', 'earth', 'metal', 'water']
    const tenGods = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인', '비겁', '식상', '재성', '관성', '인성']
    for (const key of ['dayMasterElement', 'dominantElement', 'weakElement', 'elementMany', 'elementMissing', 'usefulGod']) allowed[key] = elements
    for (const key of ['tenGodPresent', 'tenGodAbsent', 'tenGodMany', 'tenGodTop', 'gyeokgukTenGod']) allowed[key] = tenGods
    const check = (id: string, condition: RagChartCondition) => {
      for (const [key, value] of Object.entries(condition)) {
        assert.ok(RAG_CONDITION_KEYS.includes(key as keyof RagChartCondition), `${id}: 모르는 키 ${key}`)
        if (key === 'flowBridge' || key === 'birthTimeKnown') { assert.equal(typeof value, 'boolean', `${id}.${key}`); continue }
        assert.ok(Array.isArray(value) && value.length > 0 && value.every((item) => allowed[key].includes(item)), `${id}.${key}: ${JSON.stringify(value)}`)
      }
    }
    for (const chunk of corpus) {
      const knowledge = chunk.knowledge
      if (!knowledge) continue
      if (knowledge.applies_when) check(chunk.id, knowledge.applies_when)
      assert.ok((knowledge.branches?.length ?? 0) <= 6, `${chunk.id}: 갈래 ${knowledge.branches?.length}개`)
      assert.ok((knowledge.branches ?? []).filter((branch) => branch.fallback).length <= 1, `${chunk.id}: 기본 갈래는 하나`)
      for (const branch of knowledge.branches ?? []) check(`${chunk.id}[${branch.label}]`, branch.when)
    }
  })

  it('시간 모름은 손님 입력(문맥)만으로도 명식을 읽지 않고, 6글자 서비스는 시주 뺀 계산으로 고른다', () => {
    const analysis = analyzeSaju(WEAK)
    // 인자 없이 문맥의 birthTimeKnown=false 만 있어도 보류 모드다(보류 서비스: pass_angle).
    const withheld = retrieveRagChunks('일간 강약 기질', analysis, 30, { serviceKey: 'pass_angle', birthTimeKnown: false })
    assert.ok(!withheld.some((chunk) => chunk.id === 'ds-010'), '보류 모드에 강약 조건 블록')
    // 6글자 서비스(천명사주)는 시주를 뺀 계산값으로 갈래를 고르고, 시간 모름 갈래도 함께 붙는다.
    const six = retrieveRagChunks('숨겨진 진짜 성격 지장간 겉과 속', sixCharAnalysis(analysis), 10, { serviceKey: 'saju_master', birthTimeKnown: false, birthTimeReading: 'six_char' }, undefined, false)
    assert.ok(!six.some((chunk) => chunk.id === 'ds-009'), '약한 일간에게 강한 일간 블록')
    const hidden = six.find((chunk) => chunk.id === 'ds-044')
    assert.ok(hidden, six.map((chunk) => chunk.id).join(' '))
    const labels = hidden!.knowledge!.branches!.map((branch) => branch.label)
    assert.ok(labels.includes('시간 모름'), labels.join(' / '))
    assert.ok(labels.some((label) => label !== '시간 모름' && label !== '기본'), '계산값 갈래도 남는다')
  })

  it('시간을 몰라 명식을 읽지 않는 경우에는 명식 조건이 붙은 블록·갈래가 가지 않는다', () => {
    const analysis = analyzeSaju(WEAK)
    const context: SajuReportContext = { serviceKey: 'pass_angle', birthTimeKnown: false }
    const chunks = retrieveRagChunks('일간 강약 오행 균형 성격', analysis, 30, context, undefined, false)
    for (const chunk of chunks) {
      assert.ok(!chunk.knowledge?.applies_when || Object.keys(chunk.knowledge.applies_when).every((key) => key === 'birthTimeKnown'), chunk.id)
      for (const branch of chunk.knowledge?.branches ?? []) {
        assert.ok(Object.keys(branch.when).every((key) => key === 'birthTimeKnown'), `${chunk.id} ${branch.label}`)
      }
    }
  })
})

describe('공통 조각 갈래표(2026-10-16 4단계 ②)', () => {
  const COMMON = ['q95-009', 'q95-010', 'q95-011', 'q95-012', 'q95-013', 'ps-003', 'ps-004', 'ps-005']
  const PEOPLE: BirthInput[] = [
    WEAK,
    { year: 1992, month: 11, day: 3, hour: 8, minute: 30, gender: 'male', calendar: 'solar' },
    { year: 1979, month: 2, day: 20, hour: 15, minute: 0, gender: 'female', calendar: 'solar' },
  ]

  it('모든 사람에게 같은 정답(약속 이행·돈과 책임·직업 목록)을 주던 문구가 없다', () => {
    const corpus = buildCorpusIndex()
    for (const id of COMMON) {
      const block = corpus.find((chunk) => chunk.id === id)?.knowledge
      assert.ok(block?.branches && block.branches.length >= 2, id)
      const text = JSON.stringify(block)
      assert.doesNotMatch(text, /약속 이행|돈과 책임을 다루는|답장보다 약속|기획, 분석, 교육, 연구, 콘텐츠/, id)
    }
    for (const id of ['q95-006', 'q95-015', 'ps-007']) assert.ok(!corpus.some((chunk) => chunk.id === id), `${id} 개발 메모`)
  })

  it('사람마다 가장 크게 기운 기운의 갈래만 받는다(동점이면 함께, 일지 작용은 일지에 걸린 것만)', () => {
    const corpus = buildCorpusIndex()
    const labels = (birth: BirthInput, id: string) => narrowChunkToChart(corpus.find((item) => item.id === id)!, chartFacts(analyzeSaju(birth)), true)?.knowledge?.branches?.map((branch) => branch.label) ?? []
    const [a, b, c] = PEOPLE
    // A 庚: 관성·재성 동점(가장 많음), 일지 寅 반합 / B 癸: 관성(흙 3), 일지 형·파 / C 戊: 비겁(흙 5), 일지 육합·반합
    assert.deepEqual(chartFacts(analyzeSaju(a)).topTenGodGroups, new Set(['재성', '관성']))
    assert.deepEqual(labels(a, 'q95-011'), ['관성 가장 많음', '재성 가장 많음'])
    assert.deepEqual(labels(b, 'q95-012'), ['관성 가장 많음'])
    assert.deepEqual(labels(c, 'q95-013'), ['비겁 가장 많음'])
    assert.deepEqual(labels(a, 'ps-004'), ['일지 합 있음'])
    assert.deepEqual(labels(b, 'ps-004'), ['기본'], '일지에 합·충이 없으면 기본 갈래')
    assert.deepEqual(labels(c, 'ps-004'), ['일지 합 있음'])
    for (const birth of PEOPLE) {
      for (const id of COMMON) {
        const got = labels(birth, id)
        assert.ok(got.length > 0, `${id} 빠짐`)
        assert.ok(!(got.includes('기본') && got.length > 1), `${id}: 기본 갈래가 다른 갈래와 함께 감`)
        assert.ok(got.filter((label) => label.endsWith('가장 많음')).length <= 2, `${id}: ${got.join(' | ')}`)
      }
    }
  })

  it('tenGodTop: 가장 많은 묶음만(십신 하나를 넣어도 그 묶음), 최대가 2개 미만이면 아무 묶음도 아니다', () => {
    const facts = chartFacts(analyzeSaju(WEAK))
    assert.equal(matchesChartCondition({ tenGodTop: ['관성'] }, facts, true), true)
    assert.equal(matchesChartCondition({ tenGodTop: ['정관'] }, facts, true), true)
    assert.equal(matchesChartCondition({ tenGodTop: ['식상'] }, facts, true), false)
    // 십신이 한 자리씩 흩어진 원국: 어느 묶음도 2개가 안 되므로 "가장 많음"이 없다.
    const scattered = {
      ...analyzeSaju(WEAK),
      manseryeok: {
        ...analyzeSaju(WEAK).manseryeok!,
        tenGodPlacements: [{ pillar: 'year', stem: '甲', tenGod: '편재' }, { pillar: 'month', stem: '壬', tenGod: '식신' }],
        hiddenStems: [{ pillar: 'day', branch: '子', stems: [{ stem: '癸', element: 'water', weight: 1, tenGod: '정인' }] }],
      },
    } as unknown as SajuAnalysis
    const flat = chartFacts(scattered)
    // 편재·식신·정인 한 자리씩 → 재성 1·식상 1·인성 1.
    assert.deepEqual([...flat.topTenGodGroups], [])
    assert.equal(matchesChartCondition({ tenGodTop: ['재성'] }, flat, true), false)
    // 같은 묶음이 두 자리면(식신·상관) 그 묶음이 가장 많음이 된다.
    const paired = chartFacts({ ...scattered, manseryeok: { ...scattered.manseryeok!, hiddenStems: [{ pillar: 'day', branch: '子', stems: [{ stem: '癸', element: 'water', weight: 1, tenGod: '상관' }] }] } } as SajuAnalysis)
    assert.deepEqual([...paired.topTenGodGroups], ['식상'])
  })

  it('dayBranchInteraction: 일지가 낀 지지 작용만 보고, 천간합·다른 자리 충은 보지 않는다', () => {
    const facts = chartFacts(analyzeSaju(WEAK))
    // 丁卯 丙午 庚寅 乙酉: 충(卯酉)은 년·시 자리, 일지 寅은 午와 반합, 일간 庚은 시간 乙과 천간합.
    assert.equal(matchesChartCondition({ interaction: ['충'] }, facts, true), true)
    assert.equal(matchesChartCondition({ dayBranchInteraction: ['충'] }, facts, true), false, '일지 아닌 충')
    assert.equal(matchesChartCondition({ interaction: ['천간합'] }, facts, true), true)
    assert.equal(matchesChartCondition({ dayBranchInteraction: ['천간합'] }, facts, true), false)
    assert.equal(matchesChartCondition({ dayBranchInteraction: ['반합'] }, facts, true), true)
  })
})
