import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildTemplateSajuReport } from '../../src/report/report-generator.js'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import type { BirthInput, SajuReportContext } from '../../src/types/index.js'
import { workMoveTeaserPreview, workMoveTeaserSection } from '../../src/work/move-teaser.js'

const birth: BirthInput = { year: 1988, month: 7, day: 14, hour: 9, gender: 'female', calendar: 'solar' }
const context: SajuReportContext = {
  serviceKey: 'work_move',
  name: '민지',
  concern: '권한은 그대로인데 책임만 늘어날까 걱정돼요.',
  workMove: {
    decisionMode: 'offer_review',
    currentCompanySignal: 'authority_blur',
    targetCompanyName: '',
    targetRole: 'AI Director',
    workType: 'hybrid',
    commuteLocation: '판교',
    salaryFeeling: 'slight_up',
    discomfortPoint: '최종 승인자가 누구인지 아직 명확하지 않아요.',
    priority: 'growth',
    realityChecks: ['resume_ready', 'offer_terms_checked'],
  },
}

describe('이직운 무료 티저 개인화', () => {
  const analysis = analyzeSaju(birth)
  const report = buildTemplateSajuReport(analysis, birth, context)
  const sections = report.sections.slice(0, 2).map((section, index) => workMoveTeaserSection(section, index, analysis, context))

  it('실제 입력과 사주의 네 기둥을 서로 다른 1·2번 해석에 연결한다', () => {
    assert.equal(sections.length, 2)
    assert.notEqual(sections[0].imageSrc, sections[1].imageSrc)
    const text = sections.map((section) => section.interpretation).join('\n')
    assert.match(text, /AI Director/)
    assert.match(text, /결정권이 애매함/)
    assert.match(text, /최종 승인자/)
    assert.match(text, /태어난 해|태어난 달|태어난 날|태어난 시간/)
    assert.doesNotMatch(text, /기본 QA|가상 입력|샘플 데이터|작업실 예시|실제 회원의 결과|이 해석은 예측하지|RAG|코퍼스/)
    assert.doesNotMatch(text, /AI Director은|결정권이 애매함”는|업무이라고/)
    assert.ok((sections[0].interpretation?.length ?? 0) > 900)
    assert.ok((sections[1].interpretation?.length ?? 0) > 900)
  })

  it('표에는 실제 입력만, 차트에는 서버가 계산한 다섯 기운 개수만 사용한다', () => {
    const firstTable = sections[0].storytelling?.tableMd ?? ''
    const secondTable = sections[1].storytelling?.tableMd ?? ''
    assert.match(firstTable, /오퍼를 받은 상태/)
    assert.match(firstTable, /하이브리드 · 판교/)
    assert.match(firstTable, /AI Director/)
    assert.match(secondTable, /사주의 네 기둥/)
    assert.doesNotMatch(secondTable, /[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]/)
    assert.deepEqual(
      sections[1].storytelling?.chartPoints?.map((point) => point.value),
      [analysis.elementCount.wood, analysis.elementCount.fire, analysis.elementCount.earth, analysis.elementCount.metal, analysis.elementCount.water],
    )
  })

  it('상단 후킹과 유료 범위도 실제 입력과 실제 목차 수를 사용한다', () => {
    const preview = workMoveTeaserPreview(context, report.sections.length)
    assert.match(preview.headline, /AI Director/)
    assert.match(preview.headline, /결정권이 애매함/)
    assert.match(preview.summary, /성장/)
    assert.match(preview.paidValue, new RegExp(`${report.sections.length}개 항목`))
  })
})
