import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { evaluateReportQuality, REPORT_QUALITY_LIMITATION } from '../../src/report/report-quality.js'
import type { SajuReport, SajuReportContext, SajuReportSection } from '../../src/types/index.js'

const analysis = analyzeSaju({ year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' })
const context: SajuReportContext = { serviceKey: 'work_job', concern: '현재 업무에 만족하며 특별한 문제 없이 잘 지냅니다.' }
const goodParagraphs = [
  '현재 업무에 만족하며 특별한 문제 없이 잘 지냅니다. 입력한 내용에서는 편안하게 일하는 상태를 확인했습니다. 지금 잘 작동하는 환경을 유지하는 것이 우선이며, 해석을 읽었다는 이유로 새로운 문제를 찾을 필요는 없습니다.',
  '전통적인 상징은 경험을 정리할 때 참고하는 언어이지 실제 성과를 측정한 값이 아닙니다. 확인된 정보와 추측의 범위를 구분하며 읽어야 합니다. 구체적인 평가 자료가 입력되지 않았으므로 능력의 높고 낮음을 단정하지 않습니다.',
  '예를 들어 같은 기획 업무라도 자료를 조사하는 시간과 사람들과 의견을 조율하는 시간의 비중은 다를 수 있습니다. 혼자 맡을 때 편한지 함께 할 때 편한지는 최근 실제 장면에서 확인하세요. 직함보다 하루에 하는 일을 비교하면 판단하기 쉽습니다.',
  '업무가 끝났을 때 성과와 회복이 함께 유지된다면 지금 방식에 맞는 조건이 있다는 뜻으로 볼 수 있습니다. 반면 같은 일정이라도 역할이 달라지면 확인할 기준은 달라집니다. 아직 그런 변화가 없다면 조정하지 않고 현재 조건을 유지해도 충분합니다.',
  '최근 편하게 해낸 과제 하나에서 목표와 지원을 기록해 보세요. 누구에게 무엇을 확인할 수 있었고 완료 기준이 얼마나 분명했는지 나누어 적으면 됩니다. 다른 사람의 방식에 맞추려 하지 말고 자신의 경험과 실제 조건을 비교하세요.',
  '이후 업무가 바뀌면 먼저 적어 둔 조건과 새 환경을 비교하고 결과가 여전히 만족스러운지 확인하세요. 잘 유지되는 부분은 남기고 달라진 부분에만 작은 조정을 적용할 수 있습니다. 한 번의 결과로 나의 모든 성향을 판정하지 않아도 됩니다.',
]
const good = goodParagraphs.join('\n\n')
function section(interpretation: string, id = 'specialized-only'): SajuReportSection {
  return { id, order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '직업', categoryEn: 'Work', classification: '현재 만족을 유지하는 조건', hook: '', patternKeys: [], ragTopics: [], interpretation }
}
function report(text = good): SajuReport {
  return { title: '자동 편집 검토', subtitle: '', model: 'test', generatedBy: 'template', sections: [section(text)] }
}
function quality(text = good, input = context) { return evaluateReportQuality(report(text), analysis, input) }
function evidence(text = good, input = context) { return quality(text, input).categories.flatMap((item) => item.evidence).join('\n') }

test('a grounded, practical normal-state reading scores well without warning vocabulary', () => {
  assert.doesNotMatch(good, /위험|경고|돈구멍|대운|격국/)
  const result = quality()
  assert.ok(result.overallPercent >= 80, JSON.stringify(result))
  assert.match(evidence(), /상태\/적용 범위 100/)
  assert.ok(result.categories.every((item) => item.evidence.includes(REPORT_QUALITY_LIMITATION)))
  assert.equal(result.ragUsagePercent, 0)
  assert.equal(result.corpusRelevancePercent, 0)
  assert.match(evidence(), /미검증.*총점에서 제외/)
})

test('honest information insufficiency with useful decision criteria also scores well', () => {
  const unknown = ['현재 업무 경험에 대한 구체적인 정보가 부족하여 적합성의 결론을 보류합니다. 문제가 있는지 없는지는 아직 알 수 없습니다. 확인할 수 있는 조건부터 나누고 필요한 정보가 생긴 뒤 판단하는 편이 좋습니다.', ...goodParagraphs.slice(1)].join('\n\n')
  const result = quality(unknown, { serviceKey: 'work_job' })
  assert.ok(result.overallPercent >= 80, JSON.stringify(result))
  assert.match(evidence(unknown, { serviceKey: 'work_job' }), /상태\/적용 범위 100/)
})

test('RAG topics, hooks and technical or risk keyword stuffing do not earn quality points', () => {
  const base = report()
  const stuffed = structuredClone(base)
  stuffed.sections[0].ragTopics = Array(100).fill('코퍼스 대운 격국 위험 경고 돈구멍')
  stuffed.sections[0].hook = '흠 보입니다 그 이유 좋은 말만 위험 조심 시기적으로 풀 방법'
  stuffed.sections[0].classification = '명식 사주 년주 월주 일주 시주 대운 세운 조후 통관'
  assert.deepEqual(evaluateReportQuality(stuffed, analysis, context), evaluateReportQuality(base, analysis, context))
  const keywords = Array(50).fill('위험 경고 조심 돈구멍 대운 세운 격국 조후 이번 장은 대조 코퍼스').join(' ')
  assert.ok(quality(keywords).overallPercent <= 40)
  assert.ok(quality(good + '\n\n위험 경고 조심 돈구멍').overallPercent <= quality().overallPercent)
})

test('invented hidden trouble and categorical outcomes are penalized rather than rewarded', () => {
  const invented = good + '\n\n당신에게는 숨겨진 애정결핍과 마음속 상처의 문제가 있습니다. 겉으로는 문제 없어 보여도 실제로는 지금 큰 위기입니다.'
  assert.ok(quality(invented).overallPercent <= 45)
  assert.match(evidence(invented), /없는 문제·사건/)
  assert.ok(quality(good + '\n\n이 흐름이 들어왔으니 당신은 반드시 합격합니다.').overallPercent <= 45)
  assert.ok(quality(good + '\n\n특정한 상징만으로 반드시 합격한다고 단정하지 않습니다.').overallPercent > 45)
})

test('unstable or dissatisfied input is not mistaken for a normal-state affirmation', () => {
  const worried = { ...context, concern: '현재 직장이 불안정하고 대우에 불만족합니다.' }
  assert.ok(quality(good, worried).overallPercent <= 45)
  assert.match(evidence(good, worried), /실제 우려를 지우/)
})

test('easy explanations are preferable to unexplained Hanja and jargon', () => {
  const bare = good + '\n\n身弱 用神 通關 格局을 함께 봅니다.'
  const explained = good + '\n\n용신(用神, 명식의 균형을 위해 중요하게 보는 기운)은 결과를 보장하는 값이 아닙니다. 명식은 태어난 때를 기호로 나타낸 구조입니다.'
  assert.ok(quality(explained).toneGroundingPercent > quality(bare).toneGroundingPercent)
  assert.match(evidence(bare), /한자의 쉬운 풀이 필요/)
})

test('paragraph structure, concrete criteria and actions affect the score', () => {
  assert.ok(quality(good.replace(/\n\n/g, ' ')).overallPercent < quality().overallPercent)
  const vague = goodParagraphs.slice(0, 2).concat(['당신의 흐름은 자연스럽게 이어집니다.', '상황은 저마다 다르게 나타납니다.', '앞으로도 마음을 편히 가지면 좋겠습니다.', '좋은 기운을 생각하며 지내면 됩니다.']).join('\n\n')
  assert.ok(quality(vague).overallPercent < quality().overallPercent)
  assert.match(evidence(vague), /생활 사례·판단 조건·실행/)
  assert.ok(quality('짧습니다.').overallPercent <= 15)
})

test('repeated paragraphs, cross-chapter copying and known grammar errors lose points', () => {
  const repeated = Array(8).fill(goodParagraphs[0]).join('\n\n')
  assert.ok(quality(repeated).overallPercent <= 55)
  assert.match(evidence(repeated), /같은 문장·문단의 반복/)
  const copied = report()
  copied.sections.push(section(good, 'second-copy'))
  assert.ok(evaluateReportQuality(copied, analysis, context).overallPercent < quality().overallPercent)
  const broken = good + '\n\n당신로 결를 적었요. 편재이 들었다고 보았요. concept: internal_only'
  assert.ok(quality(broken).overallPercent < quality().overallPercent)
  assert.match(evidence(broken), /조사·종결어미 오타/)
  assert.match(evidence(broken), /내부 필드명/)
})

test('specialized actual section IDs are covered once and empty reports receive no confidence', () => {
  const result = quality()
  assert.deepEqual(result.categories.flatMap((item) => item.sectionIds), ['specialized-only'])
  const master = report()
  master.sections = [section(good, 'useful-god-eokbu'), section(goodParagraphs.slice().reverse().join('\n\n'), 'long-report-depth')]
  const legacy = evaluateReportQuality(master, analysis, { ...context, serviceKey: 'saju_master' })
  assert.ok(legacy.categories.some((item) => item.id === 'useful-god'))
  assert.ok(legacy.categories.some((item) => item.id === 'rag-precision'))
  const empty = evaluateReportQuality({ ...report(), sections: [] }, analysis, context)
  assert.equal(empty.overallPercent, 0)
  assert.equal(empty.llmGroundingPercent, 0)
})
