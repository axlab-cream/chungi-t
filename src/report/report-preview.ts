import type { SajuReport, SajuReportContext } from '../types/index.js'
import { relationshipState } from '../love/reading-content.js'
import type { ToneReview } from './tone-v2-review.js'

export interface ReportPreview {
  title: string
  headline: string
  summary: string
  insights: string[]
  signals: string[]
  paidValue: string
}

export interface TeaserReviewInput {
  preview: ReportPreview
  sourceEvidence: string
}

function excerpt(value: string, limit = 320): string {
  const text = value.replace(/^\[[^\]]+\]\s*/, '').trim()
  const sentences = text.match(/[^.!?。]+(?:[.!?。]+|$)/g) ?? []
  let result = ''
  for (const sentence of sentences) {
    if (result && (result + sentence).length > limit) break
    if (!result && sentence.length > limit) return '입력한 상황과 확인할 조건을 구분해 살펴봅니다.'
    result += sentence
  }
  return result.trim()
}

/** 문장 단위로 나눈다. 마침표가 없는 짧은 훅도 한 문장으로 본다. */
function splitSentences(value: string): string[] {
  return (value.match(/[^.!?。]+(?:[.!?。]+|$)/g) ?? [value])
    .map((part) => part.trim())
    .filter((part) => part.length > 1)
}

/** 같은 문장인지 볼 때 공백과 문장부호 차이는 무시한다. */
function normalizeForCompare(value: string): string {
  return value.replace(/\s+/g, '').replace(/[.,!?·。]/g, '')
}

const TEASER_SCENE_PATTERN = /(?:예를\s*들(?:어|면)|가령|만약|출근|퇴근|회의|답장|연락|약속|일정|업무|시험|문제|오답|공부|책상|침대|현관|식사|산책|결제|지출|면접|계약|통근|후보|결혼식|하루|주말)/
const TEASER_OPERATIONS_PATTERN = /(?:로그인[·\s]*(?:상태|여부)|결제[·\s]*상태|서버\s*권한|해석\s*준비\s*중|내부\s*생성\s*상태|측정\s*전|자료\s*없음|previewOnly|generationId|entitlement)/i
const TEASER_FAKE_QUOTE_PATTERN = /(?:잠긴|유료|전체)\s*(?:본문|해석)[^.!?。\n]{0,30}[“「"][^”」"\n]+[”」"]/
const TEASER_PRESSURE_PATTERN = /(?:결제|구매|지금\s*열|전체\s*해석)[^.!?。\n]{0,35}(?:안\s*하면|않으면|놓치|손해|후회|망하|위험)|(?:놓치|손해|후회|망하|위험)[^.!?。\n]{0,35}(?:결제|구매|열어)/
const TEASER_CERTAIN_EVENT_PATTERN = /(?:반드시|무조건|확실히|100%)[^.!?。\n]{0,30}(?:합격|불합격|재회|이별|결혼|채용|수익|외도|질병|사고|파산|이혼|퇴사|이직)|(?:합격|불합격|재회|이별|결혼|채용|수익|외도|질병|사고|파산|이혼|퇴사|이직)[^.!?。\n]{0,30}(?:합니다|됩니다|확정입니다|예정입니다)/

/** Deterministic §9 lower-bound review for a newly assembled saved teaser. */
export function reviewTeaser(input: TeaserReviewInput): ToneReview {
  const { preview } = input
  const issues: string[] = []
  const headline = preview.headline.trim()
  const grounds = preview.insights.map(line => line.trim()).filter(Boolean)
  const interpretation = [headline, preview.summary, ...grounds].join('\n')
  const allCopy = [interpretation, preview.paidValue].join('\n')

  if (!headline || headline.includes('\n') || splitSentences(headline).length !== 1) {
    issues.push('티저 첫 판정은 한 줄로 작성하세요.')
  }
  if (!normalizeForCompare(input.sourceEvidence).includes(normalizeForCompare(headline))) {
    issues.push('티저 첫 판정은 저장된 계산·해석 근거에서 가져오세요.')
  }
  if (grounds.length < 1 || grounds.length > 2) {
    issues.push('티저에는 판정의 대표 근거를 한두 개만 보여주세요.')
  }
  if (!TEASER_SCENE_PATTERN.test([preview.summary, ...grounds].join(' '))) {
    issues.push('티저에는 독자가 일상에서 알아볼 수 있는 대표 장면을 하나 넣으세요.')
  }
  if (!/전체\s*해석/.test(preview.paidValue)
    || !/(?:항목|대분류|중분류|목차|근거|사례|조건|기준|월운|비교)/.test(preview.paidValue)) {
    issues.push('유료 전체 해석이 구체적으로 무엇을 비교하거나 해결하는지 밝히세요.')
  }
  if (/(?:결제|구매|잠금|권한)/.test(interpretation)) {
    issues.push('티저 해석을 결제·권한 안내로 대신하지 마세요.')
  }
  if (TEASER_OPERATIONS_PATTERN.test(allCopy)) {
    issues.push('로그인·결제·서버·생성 상태 같은 운영 문구를 티저에 노출하지 마세요.')
  }
  if (TEASER_FAKE_QUOTE_PATTERN.test(allCopy)) {
    issues.push('잠긴 본문의 가짜 인용으로 결제를 유도하지 마세요.')
  }
  if (TEASER_PRESSURE_PATTERN.test(allCopy)) {
    issues.push('공포나 손실 회피 문구로 결제를 압박하지 마세요.')
  }
  if (TEASER_CERTAIN_EVENT_PATTERN.test(interpretation)) {
    issues.push('근거 없는 개인 예언으로 결제를 유도하지 마세요.')
  }

  return { passed: issues.length === 0, issues }
}

function enforceSafeTeaser(preview: ReportPreview, sourceEvidence: string): ReportPreview {
  const review = reviewTeaser({ preview, sourceEvidence })
  const unsafe = review.issues.filter(issue => /결제·권한|운영 문구|가짜 인용|공포|개인 예언/.test(issue))
  if (unsafe.length > 0) throw new Error(`저장 티저 안전 검수를 통과하지 못했습니다: ${unsafe.join(' ')}`)
  return preview
}

/** A small complete insight, frozen with the record; never expose paid paragraphs. */
export function guardPreview(preview: ReportPreview, context: SajuReportContext = {}): ReportPreview {
  let guarded = preview
  if (/love|couple|marry|match/.test(context.serviceKey ?? '')) {
    const state = relationshipState({ concern: context.concern, relationship: context.relationship, signals: { partner: context.partner?.relationship } })
    if (state === 'boundary' || state === 'unsafe') {
      const summary = state === 'boundary'
        ? '상대가 연락을 원하지 않는다는 의사를 밝혔으므로, 지금의 기준은 새 메시지를 보내는 것이 아니라 그 경계를 존중하는 데 있습니다. 마음을 추측하지 않고 내 일상을 회복할 선택부터 살펴보세요.'
        : '말씀하신 안전 문제는 관계를 되돌리는 방법보다 안전한 거리와 도움을 먼저 확인해야 할 상황입니다. 운세를 이유로 불편한 접촉이나 강요를 감수할 필요는 없습니다.'
      guarded = { ...preview, headline: state === 'boundary' ? '연락하지 않고 마음을 정리할 기준' : '관계보다 먼저 지켜야 할 나의 안전', summary, insights: [summary], signals: [summary], paidValue: '전체 해석에서도 재접촉을 권하거나 상대 마음을 단정하지 않습니다. 감정을 정리하고 내 선택과 경계를 지키는 기준을 자세히 설명합니다. 결제는 연락이나 안전 문제를 해결하는 조건이 아닙니다.' }
    }
  }
  return enforceSafeTeaser(guarded, guarded.headline)
}

export function createSavedPreview(report: SajuReport, context: SajuReportContext = {}): ReportPreview {
  const reportEvidence = [report.title, ...report.sections.flatMap(section => [section.hook, section.interpretation])].join('\n')
  if (context.serviceKey === 'wedding_day' && context.wedding?.teaser) {
    const { headline, lines } = context.wedding.teaser
    const insights = lines.slice(1, 3)
    return guardPreview(enforceSafeTeaser({
      title: report.title,
      headline,
      summary: lines[0] ?? headline,
      insights,
      signals: insights,
      paidValue: `길일·흉일을 선고하지 않습니다. 전체 해석에서는 6개 대분류 · ${report.sections.length}개 중분류로 후보일 조건을 비교합니다.`,
    }, [headline, ...lines].join('\n')), context)
  }
  if (context.serviceKey === 'newyear_flow' && context.newyear?.teaser) {
    const { headline, lines } = context.newyear.teaser
    const insights = lines.slice(1, 3)
    return guardPreview(enforceSafeTeaser({
      title: report.title, headline, summary: lines[0] ?? headline,
      insights, signals: insights,
      paidValue: `전체 해석에서는 ${context.newyear.targetYear}년 입춘 전환과 열두 달 월운, 일·돈·관계의 선택 기준을 10개 대분류 · ${report.sections.length}개 항목으로 자세히 확인합니다.`,
    }, [headline, ...lines].join('\n')), context)
  }
  /**
   * summary 에 insights[0] 을 그대로 넣고 insights 를 함께 내보내면 같은 문장이 티저에서
   * 두 번, 첫 섹션의 hook 이 그 문단의 첫 문장과 같으면 세 번 보인다. 실측에서 천명사주·
   * 이직운·붙을 각·운 붙는 색이 45자 넘는 문장을 그대로 반복하고 있었다. 겹치는 것을
   * 걷어 내 헤드라인·요약·통찰이 서로 다른 문장을 말하게 한다.
   */
  const paragraphs = report.sections.slice(0, 3).map((section) => excerpt(section.interpretation.split(/\n\s*\n/)[0] ?? section.hook)).filter(Boolean)
  const headline = report.sections[0]?.hook || report.title
  // headline 은 첫 섹션의 hook 이고 summary 는 그 섹션의 첫 문단이다. 문단의 첫 문장이
  // 대개 hook 과 같아서, 덜어 내지 않으면 티저가 같은 줄로 두 번 시작한다.
  const headlineParts = new Set(splitSentences(headline).map(normalizeForCompare))
  const opening = paragraphs[0] ?? '입력한 내용을 바탕으로 먼저 확인할 기준을 정리합니다.'
  const trimmedOpening = splitSentences(opening).filter((part) => !headlineParts.has(normalizeForCompare(part)))
  const summary = trimmedOpening.length > 0 ? trimmedOpening.join(' ').trim() : opening
  const spoken = new Set<string>()
  for (const line of [headline, summary]) for (const part of splitSentences(line)) spoken.add(normalizeForCompare(part))
  const insights: string[] = []
  for (const paragraph of paragraphs.slice(1)) {
    // 섹션마다 같은 마무리 안내가 붙어, 문단은 달라도 뒤 문장이 겹친다. 이미 말한
    // 문장은 덜어 내고 남은 것만 통찰로 쓴다.
    const fresh = splitSentences(paragraph).filter((part) => !spoken.has(normalizeForCompare(part)))
    if (fresh.length === 0) continue
    for (const part of fresh) spoken.add(normalizeForCompare(part))
    insights.push(fresh.join(' ').trim())
  }
  return guardPreview(enforceSafeTeaser({
    title: report.title, headline, summary,
    insights, signals: insights,
    paidValue: `전체 해석에서는 ${report.sections.length}개 항목의 근거와 생활 사례, 지금 상황에 맞는 판단 기준을 확인할 수 있습니다.`,
  }, reportEvidence), context)
}
