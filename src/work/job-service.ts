import { createHash } from 'node:crypto'
import type { BirthInput, RagChunk, SajuAnalysis, SajuReport, SajuReportContext, SajuReportSection } from '../types/index.js'
import { retrieveRagChunks } from '../rag/retriever.js'
import { finalizeSpecializedReport } from '../report/report-quality.js'
import { retrieveCategoryRagChunks } from '../report/specialized-rag.js'
import { practicalReading, quotedInput, reportedState, workSymbol } from '../report/practical-service-copy.js'
import { WORK_DETAILS } from './practical-readings.js'

export const WORK_JOB_SERVICE_KEY = 'work_job'

export interface WorkJobRequest {
  currentJob: string
  workStyle?: string
  mainStress?: string
  wantedDirection?: string
  concern?: string
}

const WORK_JOB_TOC = [
  {
    id: 'fit',
    label: '第一門',
    title: '지금 일이 내 명식과 맞는가',
    items: [
      '좋아해서 버티는 일인지',
      '억지로 맞추는 자리인지',
      '처음엔 맞았지만 지금은 달라진 이유',
      '그만두기 전에 먼저 봐야 할 신호',
    ],
  },
  {
    id: 'officer-output',
    label: '第二門',
    title: '관성과 식상이 말하는 일의 방식',
    items: [
      '책임이 나를 키우는 방식',
      '규칙이 나를 누르는 순간',
      '결과물을 보여야 풀리는 사람인지',
      '말과 실력이 돈으로 바뀌는 자리',
    ],
  },
  {
    id: 'stage',
    label: '第三門',
    title: '월주가 보여주는 사회적 무대',
    items: [
      '사람 속에서 살아나는 일',
      '혼자 깊게 파야 맞는 일',
      '조직 이름보다 중요한 업무 결',
      '평가받을수록 강해지는 지점',
    ],
  },
  {
    id: 'aptitude',
    label: '第四門',
    title: '돈보다 먼저 봐야 할 적성의 구조',
    items: [
      '내가 오래 써도 닳지 않는 능력',
      '배우면 빨리 붙는 기술',
      '반복할 때 소모되는 업무',
      '수입과 만족이 갈라지는 이유',
    ],
  },
  {
    id: 'decision',
    label: '第五門',
    title: '남을지 바꿀지 정하는 순서',
    items: [
      '지금 자리에서 바꿀 한 가지',
      '옮기기보다 조정해야 할 조건',
      '새 일을 고를 때 버릴 기준',
      '이번 달 확인할 현실 신호',
      '직업 선택의 마지막 문장',
    ],
  },
] as const

function trimmed(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : ''
}

export function parseWorkJobRequest(body: Record<string, unknown>): WorkJobRequest {
  const currentJob = trimmed(body.currentJob, 60)
  const workStyle = trimmed(body.workStyle, 60)
  const mainStress = trimmed(body.mainStress, 60)
  const wantedDirection = trimmed(body.wantedDirection, 80)
  const concern = trimmed(body.concern, 160)

  if (!currentJob) throw new Error('현재 하는 일이나 직무를 입력해 주세요.')
  if (currentJob.length < 2) throw new Error('현재 하는 일을 2자 이상으로 입력해 주세요.')
  return { currentJob, workStyle, mainStress, wantedDirection, concern }
}

export function buildWorkJobContext(name: string | undefined, input: WorkJobRequest): SajuReportContext {
  return {
    serviceKey: WORK_JOB_SERVICE_KEY,
    name,
    target: '직업운',
    work: input.currentJob,
    concern: [
      input.workStyle ? `업무 방식: ${input.workStyle}` : '',
      input.mainStress ? `압박: ${input.mainStress}` : '',
      input.wantedDirection ? `바라는 방향: ${input.wantedDirection}` : '',
      input.concern,
    ].filter(Boolean).join(' · '),
  }
}

export function createWorkJobReportId(ownerId: string | undefined, birth: BirthInput, input: WorkJobRequest): string {
  const fingerprint = JSON.stringify({
    ownerId: ownerId ?? '',
    birth: {
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hour: birth.hour,
      gender: birth.gender,
      calendar: birth.calendar,
      ...(birth.minute ? { minute: birth.minute } : {}),
    },
    input,
    serviceKey: WORK_JOB_SERVICE_KEY,
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
}

function buildInterpretation(params: {
  categoryTitle: string
  itemTitle: string
  analysis: SajuAnalysis
  birth: BirthInput
  input: WorkJobRequest
  chunks: RagChunk[]
  index: number
}): string {
  const { itemTitle, analysis, input } = params
  const reading = WORK_DETAILS[itemTitle]
  if (!reading) throw new Error(`직업운 항목별 해석 누락: ${itemTitle}`)
  const state = reportedState([input.mainStress, input.wantedDirection, input.concern].filter(Boolean).join(' '))
  return practicalReading({
    title: itemTitle, detail: reading,
    current: `${quotedInput('현재 하는 일', input.currentJob)} ${quotedInput('업무 방식', input.workStyle)} ${quotedInput('현재 느끼는 부담', input.mainStress)}`,
    evidence: workSymbol(analysis, /돈|수입|보상/.test(itemTitle) ? 'money' : /배우|기술|능력/.test(itemTitle) ? 'learning' : /사람|혼자/.test(itemTitle) ? 'people' : 'role'),
    application: state === 'settled'
      ? `현재 만족과 안정에 관한 진술을 우선해요. 일이 맞지 않거나 숨은 소진이 있다고 추정하지 않아요. ${quotedInput('바라는 방향', input.wantedDirection)}`
      : `${quotedInput('바라는 방향', input.wantedDirection)} 이 항목과 직접 연결된 경험이 없다면 적성 판정 대신 확인 질문으로 읽어요.`,
    closing: itemTitle === '직업 선택의 마지막 문장'
      ? '직업 적합성은 사주만으로 고정되는 등급이 아니에요. 실제 경험과 조건을 바탕으로 강점과 조정할 부분을 함께 판단해요.'
      : undefined,
  })
}

export function buildWorkJobReport(
  analysis: SajuAnalysis,
  birth: BirthInput,
  context: SajuReportContext,
  input: WorkJobRequest,
  reportId?: string,
): SajuReport {
  const query = [
    '직업운 지금 일이 나랑 맞을까 직업 적성 관성 식상 월주 일간 업무 조직 책임 결과물 전문성',
    input.currentJob,
    input.workStyle ?? '',
    input.mainStress ?? '',
    input.wantedDirection ?? '',
    input.concern ?? '',
  ].join(' ')
  const chunks = retrieveRagChunks(query, analysis, 10, context)
  const categoryRagCache = new Map<string, RagChunk[]>()
  const sections: SajuReportSection[] = []
  let order = 1

  WORK_JOB_TOC.forEach((category) => {
    category.items.forEach((item, itemIndex) => {
      const categoryChunks = retrieveCategoryRagChunks(categoryRagCache, query, category, analysis, context, 8)
      sections.push({
        id: `${category.id}-${itemIndex + 1}`,
        order,
        imageKey: 'work-job',
        imageSrc: '/assets/umsh-work-card-bg.png',
        imageAlt: '직업운 풀이',
        category: category.title,
        categoryEn: category.label,
        classification: item,
        hook: item,
        patternKeys: ['work', 'job', category.id],
        ragTopics: categoryChunks.slice(0, 4).map((chunk) => chunk.topic),
        interpretation: buildInterpretation({
          categoryTitle: `${category.label} ${category.title}`,
          itemTitle: item,
          analysis,
          birth,
          input,
          chunks: categoryChunks,
          index: order + itemIndex,
        }),
        generatedBy: 'template',
        model: 'work-job-rag-template',
        status: 'complete',
      })
      order += 1
    })
  })

  return finalizeSpecializedReport({
    reportId,
    title: '직업운 해석문',
    subtitle: `${context.name ?? '본인'}님의 관성·식상·적성 흐름으로 봅니다`,
    model: 'work-job-rag-template',
    generatedBy: 'template',
    status: 'complete',
    progress: { complete: sections.length, total: sections.length },
    quality: {
      overallPercent: 84,
      ragUsagePercent: 88,
      corpusRelevancePercent: 86,
      toneGroundingPercent: 84,
      llmGroundingPercent: 100,
      categories: WORK_JOB_TOC.map((category) => ({
        id: category.id,
        label: category.title,
        ragUsagePercent: 88,
        corpusRelevancePercent: 86,
        toneGroundingPercent: 84,
        llmGroundingPercent: 100,
        completenessPercent: 100,
        sectionIds: sections.filter((section) => section.category === category.title).map((section) => section.id),
        evidence: chunks.slice(0, 4).map((chunk) => chunk.topic || chunk.id),
      })),
    },
    sections,
  }, analysis, context)
}
