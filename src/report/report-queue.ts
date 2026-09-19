import { randomUUID } from 'node:crypto'
import type { BirthInput, SajuAnalysis, SajuReportContext, SajuReportHighlight, SajuReportSection } from '../types/index.js'
import { analyzeSaju } from '../saju/analyzer.js'
import { OpenAiTruncatedError, isOpenAiConfigured, isOpenAiKeyRejected, isOpenAiQuotaExhausted, isTransientOpenAiFailure, type OpenAiResult } from '../llm/openai-adapter.js'
import { isBlockingIssue } from './tone-v2-review.js'
import { buildOpenAiReportHighlight, buildOpenAiReportSummary, buildOpenAiReportVerdict, buildOpenAiSajuReportSection, getReportModel, parseGeneratedSajuReportSection, reviewGeneratedSajuReportSection } from './report-generator.js'
import { loadHighlightTopics } from './longform-blocks.js'
import { InterpretationQualityError } from './interpretation-validation.js'
import { assertReportOwner, getReportRecord, mutateReportRecord, type ReportOwner, type ReportRecord } from './report-store.js'
import { getCorpusSnapshot, isCorpusSnapshotUsable } from '../rag/corpus-registry.js'
import { isGenerationPaused } from '../admin/ops-queue.js'

interface GenerationParams {
  reportId: string
  analysis: SajuAnalysis
  birth: BirthInput
  context: SajuReportContext
  owner?: ReportOwner
}

/**
 * 실패로 굳은 섹션을 이어서 다시 만들지 여부.
 *
 * 화면에서 부르는 경로는 끈다 — 사용자가 「다시 생성하기」를 누른 것이 아닌데 조용히
 * 다시 태우면 같은 실패를 반복하며 요금만 쓴다. 영속 큐에서 부를 때만 켠다. 큐는
 * attempts·max_attempts 로 횟수를 제한하고 지수 백오프로 물러나므로, 몇 번까지
 * 시도할지는 여기서 또 세지 않는다.
 */
export interface PreGenerationOptions {
  recoverFailed?: boolean
  /**
   * 이 시각(epoch ms) 전에 끝나야 한다. 서버리스 함수는 300초에 강제 종료되는데, 그렇게
   * 죽으면 lease 가 풀리기까지 리포트가 4분 가까이 방치된다. 예산이 남지 않으면 새 칸을
   * 시작하지 않고 깨끗하게 돌아와, 다음 실행이 5초 뒤 바로 이어받게 한다.
   */
  deadlineAt?: number
  /** 예산 때문에 멈췄는지 호출부에 알린다. 실패로 멈춘 것과 구분해야 한다. */
  budget?: { exhausted: boolean }
}

/**
 * 한 칸을 새로 시작하려면 이만큼은 남아 있어야 한다.
 * 첫 시도 중앙값이 34초, 재시도가 붙으면 두 배다. 시작해 놓고 함수가 죽는 것이 가장 나쁘다.
 */
export const SECTION_RESERVE_MS = 75_000

export function canStartAnotherSection(now: number, deadlineAt?: number): boolean {
  if (!deadlineAt) return true
  return now + SECTION_RESERVE_MS <= deadlineAt
}

/**
 * 한 실행에서 건너뛸 수 있는 항목 수.
 *
 * 건너뛰기는 막힌 칸이 뒤를 세우지 않게 하려는 장치이지, 전부 실패하는 중에도 계속
 * 모델을 부르라는 뜻이 아니다. 이 수를 넘기면 같은 이유로 무너지는 중으로 보고 물러난다.
 */
const SKIP_LIMIT_PER_RUN = Math.min(Math.max(Number(process.env.REPORT_SKIP_LIMIT) || 3, 1), 10)
const inFlightReports = new Map<string, Promise<ReportRecord | null>>()
const LEASE_MS = 6 * 60_000

/**
 * 검수는 밀도 네 요소(직접 답·개인 근거·생활 장면·다음 판단 기준)를 각각 정규식으로 본다.
 * 두 번만 쓰게 하면 모델이 지적받은 한 요소를 고치다 다른 요소를 떨어뜨리고 그대로 실패로
 * 굳는다 — 실제로 시도마다 남는 지적이 하나씩 달랐다(2026-09-17). 한 번 더 왕복할 여유를
 * 준다. `maxDuration` 이 300초이므로 이 횟수까지는 요청 안에서 끝난다.
 */
export const SECTION_ATTEMPT_LIMIT = Math.min(Math.max(Number(process.env.REPORT_SECTION_ATTEMPTS) || 4, 2), 6)
/** 실패한 칸을 다시 세우기까지 비워 두는 시간. 화면 새로고침으로 같은 칸을 연속으로 태우지 않게 한다. */
export const FAILED_RETRY_COOLDOWN_MS = Math.max(Number(process.env.REPORT_FAILED_RETRY_COOLDOWN_MS) || 5 * 60 * 1000, 0)

/**
 * 잔액 소진 실패의 시도 기록 문구. 큐(`report-completion-job`)가 이 문구로 "충전 전까지는
 * 어떤 재시도도 같은 답"인 실행을 알아보고 길게 물러선다. 바꾸면 그쪽 판정도 함께 바뀐다.
 */
export const OPENAI_QUOTA_EXHAUSTED_MESSAGE = 'OpenAI 잔액이 소진되어 생성할 수 없습니다. 크레딧을 충전하면 큐가 이어서 완성합니다.'
/** 키가 폐기·거절된 실패의 시도 기록 문구. 환경변수를 고치고 재배포해야 풀린다. */
export const OPENAI_KEY_REJECTED_MESSAGE = 'OpenAI API 키가 거절되었습니다(401/403). 환경변수의 키를 확인하고 재배포하면 큐가 이어서 완성합니다.'

/** 공급자 쪽 사정으로 끝난 실패. 재시도로 풀리지 않고 리포트의 잘못도 아니다. */
export type ProviderOutage = 'quota' | 'key'

export function providerOutageOf(attempt: { status: string; error?: string } | undefined): ProviderOutage | null {
  if (!attempt || attempt.status !== 'failed') return null
  if (attempt.error === OPENAI_QUOTA_EXHAUSTED_MESSAGE) return 'quota'
  if (attempt.error === OPENAI_KEY_REJECTED_MESSAGE) return 'key'
  return null
}

/** 이 항목의 마지막 시도가 공급자 사정(잔액 소진·키 거절)으로 끝났는가. `since` 이후 시작한 시도만 본다. */
export function sectionHitProviderOutage(section: Pick<SajuReportSection, 'attempts'>, since = 0): ProviderOutage | null {
  const last = section.attempts?.at(-1)
  const outage = providerOutageOf(last)
  if (!outage || !last || Date.parse(last.startedAt) < since) return null
  return outage
}

/** 예전 이름. 잔액 소진만 묻는 호출부가 남아 있어 유지한다. */
export function sectionHitQuotaExhaustion(section: Pick<SajuReportSection, 'attempts'>, since = 0): boolean {
  return sectionHitProviderOutage(section, since) === 'quota'
}

/**
 * 한 항목에서 공급자 사정(잔액 소진·키 거절)을 뺀 실패 시도 수. 리포트를 포기할지(REPORT_EXHAUSTED)
 * 셀 때 쓴다 — 바깥 사정으로 실패한 시도를 세면 크레딧이 끊긴 사이에 정상 리포트가 포기된다.
 */
export function countGenuineFailures(section: Pick<SajuReportSection, 'attempts' | 'retryFloorAt'>): number {
  // 운영자가 수동 재시작했으면 그 시각 이전의 실패는 상한에서 빼고 다시 센다. 기록은 남는다.
  const floor = section.retryFloorAt ? Date.parse(section.retryFloorAt) : Number.NaN
  return (section.attempts ?? []).filter((attempt) => (
    attempt.status === 'failed'
    && !providerOutageOf(attempt)
    && !(Number.isFinite(floor) && Date.parse(attempt.startedAt) < floor)
  )).length
}

/**
 * 한 리포트 안에서 나란히 만드는 항목 수.
 *
 * 시간 ≈ 출력 토큰 ÷ 초당 토큰 ÷ 동시 수. 항목 하나가 21~63초인데 48개를 한 줄로 세우면
 * 30분이고, 여섯씩 나란히면 5~6분이다(2026-09-17 퇴사운 실측). 순서 규칙은 이렇다 —
 *  - **첫 항목은 혼자 먼저.** 독자가 처음 읽는 글이자 뒤 항목들이 참고할 뼈대다
 *  - 그 뒤로는 아직 안 끝난 첫 칸(head)부터 이 수만큼의 창(window) 안에서 나란히 돈다.
 *    창 밖의 항목은 기다린다 — 그래야 앞뒤 형제 글이 지나치게 멀어지지 않는다
 *  - 실패로 남은 칸은 창을 막지 않는다(예전 규칙 그대로)
 * 같은 창 안의 항목은 서로의 본문을 보지 못한다. 대신 앞 창까지의 완성 글을 모두 보고,
 * 검수가 형제 글과의 반복을 잡는다. 모델 호출 한도(429)가 보이면 여기를 먼저 낮춘다.
 */
export const SECTION_PARALLELISM = Math.min(Math.max(Number(process.env.REPORT_SECTION_PARALLELISM) || 6, 1), 12)

/** 지금 이 항목을 시작해도 되는가. 첫 항목이 끝나기 전엔 창이 1(순차)이다. */
export function canStartSection(sections: SajuReportSection[], position: number, parallelism = SECTION_PARALLELISM): boolean {
  const unfinished = (item: SajuReportSection) => item.status === 'pending' || item.status === 'generating'
  const head = sections.findIndex(unfinished)
  if (head < 0 || head >= position) return true
  const window = sections[0]?.status === 'complete' ? parallelism : 1
  if (position - head >= window) return false
  return sections.filter((item) => item.status === 'generating').length < window
}

/**
 * 생성 중이던 인스턴스가 사라지면 항목은 `generating` 인데 리스가 없는 잔해로 남는다. 뒤이은
 * 순서 규칙이 “뒤 항목이 손대지지 않았을 때만” 앞의 실패 항목을 다시 부르게 하므로, 이 잔해는
 * 앞 항목의 재시도를 영구히 막는다. 앞도 뒤도 못 움직이는 교착이다.
 *
 * 운영 보관함의 6개 리포트가 실제로 이 상태였다(2026-09-17). 0번은 `failed`, 1번부터는
 * 리스 없는 `generating`. 살아 있는 리스가 없는 `generating` 은 진행이 아니라 잔해이므로
 * 미완성으로 되돌린다. 저장된 초안과 시도 기록은 그대로 두고 완성 해석은 건드리지 않는다.
 */
function releaseAbandonedSections(record: ReportRecord): Set<string> {
  const released = new Set<string>()
  for (const section of record.report.sections) {
    if (section.status !== 'generating') continue
    const expiry = section.generationLease ? Date.parse(section.generationLease.expiresAt) : Number.NaN
    if (Number.isFinite(expiry) && expiry > Date.now()) continue
    section.status = 'pending'
    section.error = undefined
    delete section.generationLease
    released.add(section.id)
  }
  return released
}

/**
 * 앞선 실패 항목을 되살리려면 뒤 항목이 손대지지 않은 상태여야 한다. 방금 잔해로 판정해
 * 되돌린 항목은 진행으로 세지 않는다 — 시도 기록은 증거로 남으므로 상태만으로 판단할 수 없다.
 * 브랜치의 인라인 검사는 released 를 몰라서, 되돌린 항목이 있으면 복구를 영영 막았다.
 */
function laterSectionsUntouched(sections: SajuReportSection[], released: Set<string>): boolean {
  return sections.every((item) =>
    released.has(item.id) || (item.status === 'pending' && (item.attempts?.length ?? 0) === 0),
  )
}

/**
 * Promote a previously rejected section only when its last persisted raw response
 * passes today's production review. The attempt remains immutable historical evidence.
 */
export async function recoverReportSectionFromLatestAttempt(params: {
  reportId: string
  sectionId: string
  owner?: ReportOwner
}): Promise<SajuReportSection> {
  const record = await mutateReportRecord(params.reportId, params.owner, (current) => {
    const section = current.report.sections.find((item) => item.id === params.sectionId)
    if (!section) throw new Error('리포트 섹션을 찾지 못했습니다.')
    if (section.status === 'complete') return false
    const released = releaseAbandonedSections(current)
    if (section.status !== 'failed') throw new Error('복구할 실패 항목이 아닙니다.')
    if (section.generationLease) {
      const leaseExpiry = Date.parse(section.generationLease.expiresAt)
      if (!Number.isFinite(leaseExpiry) || leaseExpiry > Date.now()) {
        throw new Error('현재 생성 중인 항목은 복구할 수 없습니다.')
      }
    }
    const position = current.report.sections.indexOf(section)
    if (current.report.sections.slice(0, position).some((item) => item.status !== 'complete')) {
      throw new Error('선행 항목이 완료되지 않아 복구할 수 없습니다.')
    }
    if (!laterSectionsUntouched(current.report.sections.slice(position + 1), released)) {
      throw new Error('후속 항목이 이미 변경되어 이전 실패 항목을 안전하게 복구할 수 없습니다.')
    }
    const attempt = [...(section.attempts ?? [])]
      .reverse()
      .find((item) => item.status === 'failed' && Boolean(item.raw))
    if (!attempt || !attempt.raw) {
      throw new Error('복구할 마지막 실패 시도의 저장 원문이 없습니다.')
    }
    if (!current.analysis) throw new Error('저장된 계산 근거가 없어 복구할 수 없습니다.')

    const parsed = parseGeneratedSajuReportSection(attempt.raw, section.id)
    const review = reviewGeneratedSajuReportSection({
      analysis: current.analysis,
      birth: current.birth,
      context: current.context,
      section,
      hook: parsed.hook,
      interpretation: parsed.interpretation,
      siblings: current.report.sections.slice(0, position).filter((item) => item.status === 'complete'),
      corpusSnapshot: current.corpus,
      verdict: current.report.verdict,
    })
    if (!review.passed) throw new InterpretationQualityError(review)

    section.hook = parsed.hook
    section.interpretation = parsed.interpretation
    section.generatedAt = attempt.finishedAt ?? current.updatedAt
    section.tokenUsage = attempt.tokenUsage
    section.generatedBy = 'openai'
    section.model = attempt.model
    section.status = 'complete'
    delete section.generationLease
    delete section.error

    const complete = current.report.sections.filter((item) => item.status === 'complete').length
    current.report.progress = { complete, total: current.report.sections.length }
    current.status = current.report.status = complete === current.report.sections.length
      ? 'complete'
      : current.report.sections.some((item) => item.status === 'failed') ? 'failed' : 'generating'
    if (current.status !== 'failed') delete current.error
    if (complete === current.report.sections.length) {
      current.report.generatedBy = 'openai'
      current.report.model = attempt.model
    }
  })
  const section = record?.report.sections.find((item) => item.id === params.sectionId)
  if (!section) throw new Error('리포트 섹션을 찾지 못했습니다.')
  return section
}

const inFlightLongform = new Map<string, Promise<ReportRecord | null>>()

/**
 * 결론 · 한눈에 보기 · 하이라이트를 만든다. 목차 본문과 **독립**이다.
 *
 * 예전에는 이 셋이 `generateReportSectionNow` 안, 첫 항목 생성 바로 앞에 줄줄이 있었다.
 * 그래서 (1) 독자가 기다리는 첫 항목이 LLM 호출 다섯 번 뒤에야 시작했고, (2) 목차가 이미
 * 다 끝난 리포트는 이 코드에 영영 닿지 못해 결론이 비었다 — 운영의 완료 리포트 전부가
 * `verdict: null` 이라 화면은 설정에 적어 둔 축 문구("옮길 자리와 남을 자리 먼저 정리합니다.")와
 * "준비하고 있어요" 골격만 보여 줬다. 그것이 목업처럼 보인 정체다(2026-09-18).
 *
 * 이제 따로 돌린다. 결론 하나만 먼저(뒤 둘의 판단 기준이라 순서를 지킨다), 그다음 요약과
 * 하이라이트 셋을 **나란히** — 왕복이 5회에서 2회로 준다. 각각 끝나는 대로 저장하므로
 * 화면은 폴링하며 빈자리를 하나씩 채운다. 실패는 그 블록만 접고 본문 읽기를 막지 않는다.
 */
export async function ensureReportLongform(params: { reportId: string; owner?: ReportOwner }): Promise<ReportRecord | null> {
  const running = inFlightLongform.get(params.reportId)
  if (running) return running
  const run = (async () => {
    try {
      const record = await getReportRecord(params.reportId, params.owner)
      if (!record) return null
      assertReportOwner(record, params.owner)
      if (!isOpenAiConfigured()) return record
      // 운영자가 멈춰 두었으면 모델을 부르지 않는다. 화면은 빈자리를 그대로 두고 폴링한다.
      if (await isGenerationPaused()) return record
      const analysis = record.analysis ?? analyzeSaju(record.birth)
      /*
       * 서비스 키는 화면이 쓰는 것과 같은 순서로 찾는다. 천명사주 레코드에는 `context.serviceKey`
       * 가 비어 있는데(옛 기록), 화면은 `report.serviceKey`(기본 saju_master)로 설정을 찾아
       * 하이라이트 카드 세 장을 그렸다. 서버만 undefined 로 읽어 주제를 못 찾으니 아무것도
       * 저장되지 않았고, 카드가 영영 "준비하고 있어요" 골격으로 남았다(2026-09-18).
       */
      const serviceKey = record.context.serviceKey ?? record.report.serviceKey ?? 'saju_master'
      const topics = loadHighlightTopics(serviceKey)
      const saved = record.report.highlights ?? []
      const needsVerdict = !record.report.verdict?.statement
      const needsSummary = record.report.summary?.status !== 'complete'
      const pendingTopics = (topics ?? []).filter((_, index) => saved[index]?.status !== 'complete')
      if (!needsVerdict && !needsSummary && !pendingTopics.length) return record

      let verdict = record.report.verdict
      if (needsVerdict) {
        try {
          verdict = await buildOpenAiReportVerdict(analysis, record.birth, record.context)
          const stored = await mutateReportRecord(params.reportId, params.owner, (current) => {
            if (current.report.verdict?.statement) return false
            current.report.verdict = verdict
          })
          verdict = stored?.report.verdict ?? verdict
        } catch {
          // 결론이 없어도 요약·하이라이트는 만든다. 일관성 검사만 건너뛴다.
        }
      }

      await Promise.all([
        ...(needsSummary ? [(async () => {
          try {
            const summary = await buildOpenAiReportSummary(analysis, record.birth, record.context, verdict)
            await mutateReportRecord(params.reportId, params.owner, (current) => {
              if (current.report.summary?.status === 'complete') return false
              current.report.summary = summary
            })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'summary generation failed'
            await mutateReportRecord(params.reportId, params.owner, (current) => {
              if (current.report.summary?.status === 'complete') return false
              current.report.summary = { text: '', status: 'failed', error: message }
            }).catch(() => null)
          }
        })()] : []),
        ...(topics ?? []).map((topic, index) => async () => {
          if (saved[index]?.status === 'complete') return
          let result: SajuReportHighlight
          try {
            result = await buildOpenAiReportHighlight(analysis, record.birth, record.context, topic, verdict)
          } catch (error) {
            const message = error instanceof Error ? error.message : 'highlight generation failed'
            result = { title: topic.title, text: '', status: 'failed', error: message }
          }
          // 자리(index)를 지켜 저장한다. 나란히 끝나므로 순서대로 밀어 넣으면 카드가 뒤섞인다.
          await mutateReportRecord(params.reportId, params.owner, (current) => {
            const list = current.report.highlights ?? (topics ?? []).map((item) => ({ title: item.title, text: '', status: 'pending' as const }))
            if (list[index]?.status === 'complete') return false
            list[index] = result
            current.report.highlights = list
          }).catch(() => null)
        }).map((task) => task()),
      ])
      return await getReportRecord(params.reportId, params.owner)
    } finally {
      inFlightLongform.delete(params.reportId)
    }
  })()
  inFlightLongform.set(params.reportId, run)
  return run
}

/** 화면 요청에서 부른다. 응답을 막지 않고 뒤에서 돈다. */
export function startReportLongform(params: { reportId: string; owner?: ReportOwner }): void {
  void ensureReportLongform(params).catch(() => undefined)
}

/** Complete interpretations are immutable; pending work has a persisted cross-instance lease. */
export async function generateReportSectionNow(params: GenerationParams & { sectionId: string; retry?: boolean }): Promise<SajuReportSection> {
  /*
   * 운영자가 생성을 멈춰 두었으면 리스도 잡지 않고 시도 기록도 남기지 않는다. 항목은 pending 그대로,
   * 화면은 "준비 중"을 보이며 폴링한다. 해제되면 다음 호출이 그 자리에서 이어간다.
   */
  if (await isGenerationPaused()) {
    const paused = await getReportRecord(params.reportId, params.owner)
    const section = paused?.report.sections.find((item) => item.id === params.sectionId)
    if (!section) throw new Error('리포트 섹션을 찾지 못했습니다.')
    return section
  }
  const leaseId = randomUUID()
  let claimed = false
  const record = await mutateReportRecord(params.reportId, params.owner, (current) => {
    claimed = false
    const section = current.report.sections.find((item) => item.id === params.sectionId)
    if (!section) throw new Error('리포트 섹션을 찾지 못했습니다.')
    if (current.status === 'complete' || section.status === 'complete' || (section.status === 'failed' && !params.retry)) return false
    /*
     * 실패한 칸을 너무 자주 다시 세우지 않는다. 화면을 열 때마다 재시작을 보내므로(읽는 사람이
     * 가장 확실한 신호다) 새로고침을 반복하면 같은 칸에 모델을 네 번씩 태우게 된다. 결과는 같고
     * 비용만 는다. 규칙을 고쳐 배포한 뒤에는 이 창이 이미 지나 있어 회복을 막지 않는다.
     */
    if (section.status === 'failed' && params.retry) {
      const lastFinished = [...(section.attempts ?? [])].reverse().find((item) => item.finishedAt)?.finishedAt
      const finishedAt = lastFinished ? Date.parse(lastFinished) : Number.NaN
      if (Number.isFinite(finishedAt) && Date.now() - finishedAt < FAILED_RETRY_COOLDOWN_MS) return false
    }
    // 부수효과가 목적이다 — 리스 없는 generating 잔해를 pending 으로 되돌려 창을 푼다.
    // 생성 경로는 released 목록 자체를 쓰지 않는다(되살리기를 뒤 칸으로 막지 않기 때문).
    releaseAbandonedSections(current)
    const position = current.report.sections.indexOf(section)
    /*
     * 창(window) 규칙 — SECTION_PARALLELISM 참고. 첫 항목은 혼자 먼저, 그 뒤는 head 부터
     * 창 안에서 나란히. 앞 칸이 이미 **실패로 남은** 경우는 기다릴 이유가 없다. 그 한 칸을
     * 기다리다 뒤의 수십 개가 영영 멈췄다(2026-09-17 관계 신호 0/70).
     */
    if (!canStartSection(current.report.sections, position)) return false
    // 되살리기는 뒤 칸이 이미 시작했더라도 막지 않는다. 막으면 건너뛴 칸을 영영 회수할 수 없다.
    if (section.generationLease && Date.parse(section.generationLease.expiresAt) > Date.now()) return false
    section.generationId ??= randomUUID()
    section.generationLease = { id: leaseId, expiresAt: new Date(Date.now() + LEASE_MS).toISOString() }
    section.status = 'generating'
    section.error = undefined
    current.status = current.report.status = 'generating'
    claimed = true
  })
  const storedSection = record?.report.sections.find((item) => item.id === params.sectionId)
  if (!record || !storedSection) throw new Error('리포트 섹션을 찾지 못했습니다.')
  if (!claimed) return storedSection

  const editClaim = async (edit: (section: SajuReportSection, current: ReportRecord) => void) => mutateReportRecord(params.reportId, params.owner, (current) => {
    const section = current.report.sections.find((item) => item.id === params.sectionId)
    if (!section || section.status === 'complete' || section.generationLease?.id !== leaseId) return false
    edit(section, current)
  })
  // 박아 둔 스냅샷이 이 배포에서 재현되지 않으면(코퍼스 개정 뒤) 활성 스냅샷으로 만든다.
  // 그대로 두면 retrieveRagChunks 가 첫 줄에서 던져 이 항목은 영영 완성되지 않는다.
  const pinnedSnapshot = record.corpus
  const corpusSnapshot = isCorpusSnapshotUsable(pinnedSnapshot) ? pinnedSnapshot : getCorpusSnapshot()
  const corpusUpgraded = corpusSnapshot !== pinnedSnapshot
  const priorFailure = params.retry
    ? [...(storedSection.attempts ?? [])].reverse().find((attempt) => attempt.status === 'failed' && attempt.error)?.error
    : undefined
  let issues: string[] = params.retry ? [priorFailure ?? '이전 검수 실패를 다시 확인하세요.'] : []
  // 직전 시도가 빈 응답/잘림이었으면 예산을 키운다. 같은 프롬프트가 같은 예산으로 다시
  // 돌면 추론이 또 예산을 다 쓰고 본문을 못 낼 가능성이 크다(love_mind 항목이 열 몇 번을
  // 같은 이유로 반복해서 실패했다, 2026-09-17). 매 시도 50%씩, 최대 2배까지 늘린다.
  let tokenBudget: number | undefined
  const analysis = record.analysis ?? params.analysis
  const siblings = record.report.sections.filter((item) => item.id !== params.sectionId && item.status === 'complete')
  const openAttempt = async (): Promise<string> => {
    const attemptId = randomUUID()
    await editClaim((section) => {
      section.attempts ??= []
      section.attempts.push({ id: attemptId, startedAt: new Date().toISOString(), model: getReportModel(), status: 'generating' })
      section.generationLease = { id: leaseId, expiresAt: new Date(Date.now() + LEASE_MS).toISOString() }
    })
    return attemptId
  }
  const recordResponse = (attemptId: string) => (result: OpenAiResult) => editClaim((section) => {
    const attempt = section.attempts?.find((item) => item.id === attemptId)
    if (attempt) { attempt.raw = result.text; attempt.finishReason = result.finishReason; attempt.tokenUsage = result.usage; attempt.model = result.model; attempt.finishedAt = new Date().toISOString() }
  }).then(() => undefined)
  const failAttempt = (attemptId: string, diagnosis: string) => editClaim((section) => {
    const attempt = section.attempts?.find((item) => item.id === attemptId)
    if (attempt) { attempt.status = 'failed'; attempt.error = diagnosis; attempt.finishedAt = new Date().toISOString() }
  })
  const saveComplete = async (
    generated: Pick<SajuReportSection, 'hook' | 'interpretation' | 'generatedAt' | 'tokenUsage' | 'model'>,
    attemptId: string | undefined,
    verdictOfReview: Pick<SajuReportSection, 'reviewMode' | 'reviewNotes'>,
  ) => editClaim((section, current) => {
    const attempt = attemptId ? section.attempts?.find((item) => item.id === attemptId) : undefined
    if (attempt) { attempt.status = 'complete'; attempt.finishedAt = new Date().toISOString() }
    section.hook = generated.hook
    section.interpretation = generated.interpretation
    section.generatedAt = generated.generatedAt
    section.tokenUsage = generated.tokenUsage
    section.generatedBy = 'openai'
    section.model = generated.model ?? getReportModel()
    section.status = 'complete'
    if (verdictOfReview.reviewMode && verdictOfReview.reviewMode !== 'strict') {
      section.reviewMode = verdictOfReview.reviewMode
      if (verdictOfReview.reviewNotes?.length) section.reviewNotes = verdictOfReview.reviewNotes
    }
    delete section.generationLease
    delete section.error
    // 이 항목은 활성 스냅샷으로 만들어졌다. 레코드에도 그 스냅샷을 박아 다음 항목·검수가 같은 근거를 본다.
    if (corpusUpgraded) current.corpus = corpusSnapshot
    const complete = current.report.sections.filter((item) => item.status === 'complete').length
    current.report.progress = { complete, total: current.report.sections.length }
    current.status = current.report.status = complete === current.report.sections.length ? 'complete' : 'generating'
    if (complete === current.report.sections.length) { current.report.generatedBy = 'openai'; current.report.model = generated.model ?? getReportModel() }
  })
  const markFailed = () => editClaim((section, current) => {
    section.status = 'failed'
    section.error = '완성 해석의 검수가 끝나지 않았습니다. 저장된 초안은 유지되며 재시도할 수 있습니다.'
    delete section.generationLease
    current.status = current.report.status = 'failed'
  })

  let needsRescue = false
  for (let index = 0; index < SECTION_ATTEMPT_LIMIT; index += 1) {
    const attemptId = await openAttempt()
    try {
      if (!isOpenAiConfigured()) throw new Error('GENERATION_UNAVAILABLE')
      const generated = await buildOpenAiSajuReportSection(
        analysis, record.birth, params.sectionId, record.context, storedSection,
        {
          siblings,
          repairIssues: issues,
          corpusSnapshot,
          verdict: record.report.verdict,
          maxTokens: tokenBudget,
          onResponse: recordResponse(attemptId),
        },
      )
      const saved = await saveComplete(generated, attemptId, { reviewMode: 'strict' })
      return saved?.report.sections.find((item) => item.id === params.sectionId) ?? storedSection
    } catch (error) {
      const truncated = error instanceof OpenAiTruncatedError
      // 트래픽 문제(429·5xx·연결 끊김)는 콘텐츠 문제가 아니다. 워커 3차선 × 리포트 안
      // 6병렬로 한 실행에서 최대 18개 동시 호출이 나갈 수 있어(2026-09-17), 이 경우를
      // 구분하지 않으면 한 번 걸린 항목이 그대로 굳는다.
      const transient = isTransientOpenAiFailure(error)
      // 잘림은 내용 지적이 아니다. 재작성 지시문을 붙이면 프롬프트가 더 길어져 예산을 더 깎으므로
      // 같은 프롬프트로 다시 부른다. 진단은 시도 기록에만 남긴다.
      issues = error instanceof InterpretationQualityError ? error.review.issues : []
      if (truncated) {
        // 같은 예산으로 다시 부르면 추론이 또 예산을 다 쓰고 빈 응답으로 끝날 수 있다.
        const base = tokenBudget ?? (Number(process.env.REPORT_SECTION_MAX_TOKENS) || 9000)
        tokenBudget = Math.min(Math.round(base * 1.5), 18_000)
      }
      const diagnosis = error instanceof InterpretationQualityError
        ? error.review.issues.join(' ')
        : truncated
          ? error.message
          : transient
            // 429 는 분당 한도(rate limit)와 잔액 소진(insufficient_quota)이 같은 코드다. 문구로 갈라 봐야 한다.
            ? `요청이 일시적으로 거절되었습니다(status=${error.status ?? '없음'}): ${String(error.message ?? '').slice(0, 140)}`
            : isOpenAiQuotaExhausted(error)
              // 운영자가 한눈에 알아보는 문구로. 충전 전까지 재시도해도 같은 답이다.
              ? OPENAI_QUOTA_EXHAUSTED_MESSAGE
              : isOpenAiKeyRejected(error)
                ? OPENAI_KEY_REJECTED_MESSAGE
              // 원인을 함께 남긴다. 뭉뚱그린 한 줄만 남아 스냅샷 불일치를 사흘 동안 못 봤다(2026-09-18).
              : `해석 생성 또는 저장이 완료되지 않았습니다. (${error instanceof Error ? `${error.name}: ${error.message}` : String(error)})`.slice(0, 240)
      const retryable = (error instanceof InterpretationQualityError || truncated || transient) && index < SECTION_ATTEMPT_LIMIT - 1
      // 429·5xx 는 곧바로 다시 보내면 같은 이유로 또 걸리기 쉽다. 짧게 물러선다
      // (1초·2초·4초) — 리포트 전체를 막는 것도 아니고 워커 예산(200초)에 비해 미미하다.
      if (transient && retryable) await new Promise((resolve) => setTimeout(resolve, 1_000 * 2 ** index))
      await failAttempt(attemptId, diagnosis)
      if (retryable) continue
      // 1차(엄격 검수)가 검수 사유로 끝났으면 실패로 굳히지 않고 아래 2·3차에 넘긴다.
      // 잔액·연결 같은 바깥 사정은 초안이 없으니 넘길 것도 없다 — 예전처럼 실패로 남긴다.
      if (error instanceof InterpretationQualityError) needsRescue = true
      else await markFailed()
      break
    }
  }

  /*
   * 2·3차 재검증 — 1차 미완성은 여기서 끝을 낸다(2026-09-18).
   *
   * 1차는 같은 항목을 네 번 새로 쓴다. 매번 다른 지적(장면 → 한자 설명 → 숫자)에 걸려 끝내
   * 실패로 남는 항목이 실제로 있었다. 그러면 큐가 같은 작업을 되살려 또 네 번 새로 쓰고, 고객은
   * "미완성"만 본다.
   *
   * 2차: 저장된 초안 가운데 지적이 가장 적은 것을 골라 **그 초안에서 지적만 고치는** 편집 호출을
   *      한 번 한다. 통째로 다시 쓰지 않으니 통과했던 요소가 다시 빠지지 않는다. 엄격 검수 통과면
   *      reviewMode='repaired' 로 완성.
   * 3차: 그래도 남으면 초안들(2차 결과 포함, 최신부터)을 안전 검수만으로 다시 본다. 없는 사실
   *      단정·확정 예언·건강 판단·내부 노출·근거 없는 숫자 같은 안전 지적이 하나도 없으면 채택하고,
   *      남은 문체 지적은 reviewNotes 로 운영자에게 남긴다(reviewMode='lenient').
   * 안전 지적이 남는 초안은 어떤 경우에도 채택하지 않는다 — 그때만 실패로 남는다.
   */
  type SavedAttempt = NonNullable<SajuReportSection['attempts']>[number]
  interface Draft { attempt: SavedAttempt; raw: string; hook: string; interpretation: string; issues: string[] }
  const rescueSectionFromDrafts = async (): Promise<boolean> => {
    const strictReview = (raw: string): Omit<Draft, 'attempt' | 'raw'> | null => {
      try {
        const parsed = parseGeneratedSajuReportSection(raw, params.sectionId)
        const review = reviewGeneratedSajuReportSection({
          analysis, birth: record.birth, context: record.context, section: storedSection,
          hook: parsed.hook, interpretation: parsed.interpretation, siblings, corpusSnapshot, verdict: record.report.verdict,
        })
        return { hook: parsed.hook, interpretation: parsed.interpretation, issues: review.issues }
      } catch { return null }
    }
    const loadDrafts = async (): Promise<Draft[]> => {
      const fresh = await getReportRecord(params.reportId, params.owner)
      const section = fresh?.report.sections.find((item) => item.id === params.sectionId)
      const drafts: Draft[] = []
      for (const attempt of section?.attempts ?? []) {
        if (attempt.status !== 'failed' || typeof attempt.raw !== 'string' || !attempt.raw.trim()) continue
        const reviewed = strictReview(attempt.raw)
        if (reviewed) drafts.push({ attempt, raw: attempt.raw, ...reviewed })
      }
      return drafts
    }

    // 2차 — 문체 지적만 남은 초안 가운데 지적이 가장 적은 것을 편집한다. 안전·구조 지적이
    // 남은 초안은 편집으로 고칠 것이 아니므로(없는 사실을 지운다고 글이 되지 않는다) 건너뛴다.
    const drafts = await loadDrafts()
    const best = drafts
      .filter((draft) => !draft.issues.some(isBlockingIssue))
      .sort((a, b) => a.issues.length - b.issues.length)[0]
    if (best && isOpenAiConfigured()) {
      const attemptId = await openAttempt()
      try {
        const generated = await buildOpenAiSajuReportSection(
          analysis, record.birth, params.sectionId, record.context, storedSection,
          {
            siblings, repairIssues: best.issues, repairDraft: best.raw, corpusSnapshot,
            verdict: record.report.verdict, maxTokens: tokenBudget, onResponse: recordResponse(attemptId),
          },
        )
        await saveComplete(generated, attemptId, { reviewMode: 'repaired' })
        return true
      } catch (error) {
        const reason = error instanceof InterpretationQualityError ? error.review.issues.join(' ') : (error instanceof Error ? `${error.name}: ${error.message}` : String(error))
        await failAttempt(attemptId, `2차 편집 검수: ${reason}`.slice(0, 240))
      }
    }

    // 3차 — 안전·구조 지적이 없는 초안을 채택한다. 최신 초안부터.
    for (const draft of (await loadDrafts()).reverse()) {
      if (draft.issues.some(isBlockingIssue)) continue
      await saveComplete(
        { hook: draft.hook, interpretation: draft.interpretation, generatedAt: draft.attempt.finishedAt ?? new Date().toISOString(), tokenUsage: draft.attempt.tokenUsage, model: draft.attempt.model },
        undefined,
        { reviewMode: 'lenient', reviewNotes: draft.issues },
      )
      return true
    }
    return false
  }

  if (needsRescue) {
    const rescued = await rescueSectionFromDrafts().catch(() => false)
    if (!rescued) await markFailed()
  }
  const latest = await getReportRecord(params.reportId, params.owner)
  return latest?.report.sections.find((item) => item.id === params.sectionId) ?? storedSection
}

export async function preGenerateReport(params: GenerationParams, options: PreGenerationOptions = {}): Promise<ReportRecord | null> {
  const record = await getReportRecord(params.reportId, params.owner)
  if (!record) return null
  assertReportOwner(record, params.owner)
  if (record.status === 'complete') return record
  const running = inFlightReports.get(params.reportId)
  if (running) return running
  const run = (async () => {
    try {
      /*
       * 막힌 한 칸이 나머지 전부를 세우지 않게 한다.
       *
       * 예전에는 실패한 항목에서 루프를 끊었다. 항목이 70개인 서비스에서 첫 칸이 막히면
       * 나머지 69개가 영영 시작되지 않았다 — 2026-09-17 운영에서 관계 신호 0/70,
       * 고양이 궁합 0/50 이 정확히 그 상태였다.
       *
       * 이제 큐가 부른 실행에서는 한 번 되살려 보고, 그래도 안 되면 **건너뛰고 다음 칸으로**
       * 간다. 건너뛴 칸은 실패로 남아 다음 실행이 다시 집는다. 그때는 앞뒤 형제 글이 더
       * 쌓여 있어 성공할 여지가 커진다.
       */
      const skipped = new Set<string>()
      let latest: ReportRecord | null = record
      // 파도(wave) 단위로 돈다. 한 파도는 창 안에서 지금 시작할 수 있는 항목들을 나란히 만든다.
      for (;;) {
        if (!latest || latest.status === 'complete') break
        const sections = latest.report.sections
        const firstFailed = sections.findIndex((item) => item.status === 'failed')
        const wave = sections
          .map((item, position) => ({ item, position }))
          .filter(({ item, position }) => {
            if (item.status === 'complete' || skipped.has(item.id)) return false
            // 되살리기 없는 실행은 실패한 칸에서 멈춘다(예전 규칙). 그 뒤 칸도 시작하지 않는다.
            if (!options.recoverFailed && firstFailed >= 0 && position >= firstFailed) return false
            return canStartSection(sections, position)
          })
          .slice(0, SECTION_PARALLELISM)
        if (!wave.length) break
        // 시간 조각 안에서만 만든다. 남은 예산으로 한 파도를 못 끝내면 여기서 멈추고
        // 다음 실행에 넘긴다 — 함수가 도중에 죽는 것보다 훨씬 빨리 이어진다.
        if (!canStartAnotherSection(Date.now(), options.deadlineAt)) {
          if (options.budget) options.budget.exhausted = true
          break
        }
        const results = await Promise.all(wave.map(({ item }) => generateReportSectionNow({
          ...params,
          sectionId: item.id,
          ...(item.status === 'failed' ? { retry: true } : {}),
        })))
        let stop = false
        for (const [index, result] of results.entries()) {
          if (result.status === 'complete') continue
          // 잔액 소진·키 거절은 이 실행으로 풀리지 않는다. 다음 파도를 시작하면 같은 답만 여섯 번 더 받는다.
          if (sectionHitProviderOutage(result)) { stop = true; break }
          if (!options.recoverFailed) { stop = true; break }
          skipped.add(wave[index].item.id)
          // 한 실행에서 너무 많이 건너뛰면 같은 이유로 전부 실패하는 중일 가능성이 크다.
          // 모델 호출만 태우지 말고 물러나서 다음 실행에 맡긴다.
          if (skipped.size >= SKIP_LIMIT_PER_RUN) { stop = true; break }
        }
        if (stop) break
        // 한 파도에서 한 칸도 못 나아갔으면(다른 인스턴스가 잡고 있거나 전부 건너뜀) 돌지 않는다.
        if (!results.some((result) => result.status === 'complete')) break
        latest = await getReportRecord(params.reportId, params.owner)
      }
      return await getReportRecord(params.reportId, params.owner)
    } finally { inFlightReports.delete(params.reportId) }
  })()
  inFlightReports.set(params.reportId, run)
  return run
}

export function startReportPreGeneration(params: GenerationParams): void {
  void preGenerateReport(params).catch(() => undefined)
}
