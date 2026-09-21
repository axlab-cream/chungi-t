import { closeOpsJobs, deleteOpsJobsForTargets, enqueueOpsJob, listOpsJobRefs, reviveOpsJobByKey, type EnqueueOpsJobResult, type OpsJobRef } from '../admin/ops-queue.js'
import { analyzeSaju } from '../saju/analyzer.js'
import { countGenuineFailures, ensureReportLongform, preGenerateReport, providerOutageOf, sectionHitProviderOutage } from './report-queue.js'
import { getReportRecordAsService, listIncompleteReportRefs, mutateReportRecord, reportProgressOf, type IncompleteReportRef, type ReportRecord } from './report-store.js'
import { ensurePromptOverridesFresh } from '../prompt/prompt-overrides.js'

export type { IncompleteReportRef }
import { listAllPaymentOrders } from '../payment/order-store.js'

/**
 * 결제한 해석을 **사용자가 화면을 떠나도** 끝까지 만들어 두기 위한 작업.
 *
 * 그전에는 `/api/report/prewarm` 이 호출당 한 섹션만 만들었다. 화면이 계속 열려 있어야
 * 다음 섹션이 만들어졌고, 탭을 닫으면 그 자리에서 멈췄다. 목차가 열두 개인 상품은 끝까지
 * 보려면 사용자가 몇 분을 붙들고 있어야 했다.
 *
 * 생성 자체는 원래 있던 `preGenerateReport` 가 한다. 여기서 더하는 것은 **영속성**이다 —
 * 결제가 끝나면 작업을 큐에 넣고, 워커가 다시 집어서 남은 섹션을 이어 만든다. 서버리스
 * 인스턴스가 응답 뒤 얼어도 다음 워커 실행이 이어받는다.
 */
export const REPORT_COMPLETION_JOB_KIND = 'report.sections.complete'

/**
 * 한 리포트당 한 건만 큐에 남긴다. 결제 복귀를 새로고침하거나 PG 가 같은 주문으로 두 번
 * 돌아와도 작업이 복제되지 않는다.
 *
 * 2026-09-18: 예전에는 키에 `revision` 을 넣어 "재생성은 새 작업"으로 봤다. 그런데 revision 은
 * 레코드가 바뀔 때마다 오른다 — 항목이 하나 완성될 때마다 오른다는 뜻이다. cron 은 1분마다
 * 미완성 리포트를 전부 큐에 넣으므로, 생성이 진행되는 내내 같은 리포트가 매분 **다른 키**로
 * 새 작업을 만들었다. 37개짜리 리포트 하나가 30분 돌면 작업이 수십 건 쌓인다. 실제로 대기 작업이
 * 227건까지 불어나 새 리포트가 그 뒤에 줄을 섰다.
 *
 * 이제 리포트당 키는 하나다. 재생성은 `reviveStalledJob` 이 맡는다 — 끝났거나 멈춘 작업을
 * 다시 태우는 것이 그 함수의 일이고, 백필은 애초에 **미완성** 리포트만 넣는다.
 */
export function reportCompletionIdempotencyKey(reportId: string): string {
  return `${REPORT_COMPLETION_JOB_KIND}:${reportId}`
}

const LEGACY_HOME_SECTION_IDS = new Set(['house-energy', 'spatial-fix'])
const LEGACY_HOME_SECTION_ERROR = 'UNKNOWN_HOME_READING_SECTION'

/**
 * 2026-09-21 이전 집궁합은 지금 코퍼스의 `terrain-support`·`reality-action` 대신
 * `house-energy`·`spatial-fix` 를 저장했다. 생성 라우터가 그 옛 ID를 모르던 배포에서 두 항목만
 * 반복 실패해 REPORT_EXHAUSTED 로 고정됐다. 배포된 별칭이 이제 처리할 수 있으므로 이 정확한
 * 코드 결함만 자동으로 한 번 다시 연다. 일반 모델 실패나 다른 서비스는 운영자 진단 대상으로 남긴다.
 */
export function needsLegacyHomeSectionRestart(record: ReportRecord): boolean {
  if (record.context?.serviceKey !== 'home_fit' || record.status === 'complete') return false
  const incomplete = (record.report?.sections ?? []).filter((section) => section.status !== 'complete')
  if (incomplete.length !== LEGACY_HOME_SECTION_IDS.size || !incomplete.every((section) => LEGACY_HOME_SECTION_IDS.has(section.id) && !section.retryFloorAt)) return false
  return incomplete.every((section) => (section.attempts ?? []).some(
    (attempt) => attempt.status === 'failed' && String(attempt.error ?? '').includes(LEGACY_HOME_SECTION_ERROR),
  ))
}

async function recoverLegacyHomeSectionFailure(record: ReportRecord, paid = false): Promise<EnqueueOpsJobResult> {
  // cron 은 worker 실행 뒤 백필을 수행한다. 먼저 기존 정식 작업을 되살려도 다음 cron 전까지
  // claim 되지 않으므로, 이어지는 retryFloorAt 저장과 경쟁하지 않는다. 저장이 잠시 실패하면
  // 다음 백필이 다시 시도할 수 있도록 floor 가 없는 상태도 그대로 남는다.
  const revivedJobs = await reviveOpsJobByKey(reportCompletionIdempotencyKey(record.reportId))
  const now = new Date().toISOString()
  await mutateReportRecord(record.reportId, record.owner, (current) => {
    if (!needsLegacyHomeSectionRestart(current)) return false
    for (const section of current.report.sections) {
      if (section.status !== 'complete' && LEGACY_HOME_SECTION_IDS.has(section.id)) section.retryFloorAt = now
    }
    return true
  })
  if (revivedJobs > 0) return 'requeued'
  return enqueueOpsJob({
    kind: REPORT_COMPLETION_JOB_KIND,
    targetId: record.reportId,
    idempotencyKey: reportCompletionIdempotencyKey(record.reportId),
    payload: { reportId: record.reportId, revision: record.revision ?? 0, ...(record.owner?.id ? { ownerId: record.owner.id } : {}), ...(paid ? { paid: true } : {}) },
  })
}

export async function enqueueReportCompletion(params: {
  reportId: string
  revision?: number
  /** 결제로 열린 해석인지. 워커가 차선을 나눌 때 결제분을 먼저 태운다. */
  paid?: boolean
  ownerId?: string
}): Promise<EnqueueOpsJobResult> {
  if (!params.reportId) return 'unavailable'
  const record = await getReportRecordAsService(params.reportId).catch(() => null)
  const reportId = record?.reportId || params.reportId
  const revision = params.revision ?? record?.revision ?? 0
  const ownerId = params.ownerId ?? record?.owner?.id
  if (record && needsLegacyHomeSectionRestart(record)) return recoverLegacyHomeSectionFailure(record, params.paid)
  return enqueueOpsJob({
    kind: REPORT_COMPLETION_JOB_KIND,
    targetId: reportId,
    idempotencyKey: reportCompletionIdempotencyKey(reportId),
    // 워커가 공정하게 나누는 데 필요한 것만 싣는다 — 소유자 식별자와 결제 여부.
    // 이름·생년월일 같은 개인 정보는 작업 표에 두지 않는다.
    payload: { reportId, revision, ...(ownerId ? { ownerId } : {}), ...(params.paid ? { paid: true } : {}) },
  })
}

export interface ReportCompletionOutcome {
  complete: number
  total: number
  done: boolean
}

/**
 * 작업이 던지는 코드. 워커는 코드마다 다르게 물러선다(`planFinalize`).
 * - QUOTA: 잔액 소진. 충전 전까지 같은 답이므로 길게 물러서고 시도 횟수를 세지 않는다.
 * - KEY: 키 거절(401/403). 환경변수 교체·재배포 전까지 같은 답이다. 잔액 소진과 같은 길.
 * - EXHAUSTED: 남은 항목 전부가 진짜 실패를 상한까지 겹쳐 쌓았다. 되살려도 같은 비용만 든다 —
 *   dead 로 고정하고 운영자가 진단(reviewNotes·attempts)을 보고 손을 쓴다.
 * - SECTION_FAILED: 이번 실행에서 한 칸도 못 나아갔고 실패 항목이 있다. 보통 백오프.
 */
export const REPORT_JOB_CODES = {
  quota: 'OPENAI_QUOTA_EXHAUSTED',
  key: 'OPENAI_KEY_REJECTED',
  exhausted: 'REPORT_EXHAUSTED',
  sectionFailed: 'REPORT_SECTION_FAILED',
} as const

/** 공급자 사정 코드. 워커는 이 코드들을 15분 백오프·시도 미소모로 다룬다. */
export const PROVIDER_OUTAGE_CODES: readonly string[] = [REPORT_JOB_CODES.quota, REPORT_JOB_CODES.key]

/**
 * 한 항목이 이 수만큼 **진짜** 실패(잔액 소진 제외)를 쌓으면 더 부르지 않는다. 한 실행이 최대
 * 4번(SECTION_ATTEMPT_LIMIT) + 2·3차 구조 시도를 하므로 12 는 세 번의 온전한 실행이다.
 */
export const REPORT_GIVE_UP_FAILURES = Math.min(Math.max(Number(process.env.REPORT_GIVE_UP_FAILURES) || 12, 4), 40)

/**
 * 이번 실행이 어떻게 끝났는지 시도 기록으로 판정한다. 순수 함수라 저장소 없이 시험한다.
 * 잔액 소진이 하나라도 이 실행 안에 찍혔으면 그것이 우선이다 — 다른 실패도 대개 같은 뿌리다.
 */
export function classifyRun(record: ReportRecord, runStartedAt: number): 'quota' | 'key' | 'exhausted' | null {
  const sections = record.report?.sections ?? []
  const remaining = sections.filter((section) => section.status !== 'complete')
  if (!remaining.length) return null
  const outages = remaining.map((section) => sectionHitProviderOutage(section, runStartedAt)).filter(Boolean)
  // 키 거절이 하나라도 있으면 그것이 우선이다 — 잔액이 있어도 키가 죽었으면 아무것도 안 된다.
  if (outages.includes('key')) return 'key'
  if (outages.includes('quota')) return 'quota'
  if (remaining.every((section) => countGenuineFailures(section) >= REPORT_GIVE_UP_FAILURES)) return 'exhausted'
  return null
}

function progressOf(record: ReportRecord): ReportCompletionOutcome {
  const sections = record.report?.sections ?? []
  const total = sections.length
  const complete = record.status === 'complete'
    ? total
    : sections.filter((section) => section.status === 'complete').length
  return { complete, total, done: total > 0 && complete >= total }
}

/**
 * 워커가 부른다. 남은 섹션을 이어서 만들고 현재 진행을 돌려준다.
 *
 * 한 번에 다 못 끝내도 실패가 아니다 — 워커의 lease 안에서 만들 수 있는 만큼 만들고,
 * 남으면 `done: false` 로 돌려 다음 실행이 이어받게 한다. 그래서 호출부는 이 결과를 보고
 * 작업을 succeeded 로 닫을지 retry 로 되돌릴지 정한다.
 */
export async function runReportCompletionJob(
  reportId: string,
  options: { deadlineAt?: number } = {},
): Promise<ReportCompletionOutcome> {
  // 워커에는 요청도 토큰도 없다. 서버 키로 읽고, 레코드에 실린 소유자로 이후 생성·저장을 검증한다.
  // 소유자 검증이 있는 조회를 쓰면 Supabase 모드에서 여기서 REPORT_ACCESS_DENIED 로 죽는다.
  const record = await getReportRecordAsService(reportId)
  if (!record) throw new Error('REPORT_NOT_FOUND')
  if (record.status === 'complete') return progressOf(record)

  const before = progressOf(record)
  const runStartedAt = Date.now()
  // 이미 상한에 닿은 리포트는 모델을 부르지 않는다. 되살아난 작업이 첫 실행에서 또 네 번 쓰는 일을 막는다.
  if (classifyRun(record, 0) === 'exhausted') throw new Error(REPORT_JOB_CODES.exhausted)
  // 관리자가 발행한 프롬프트 개정을 이 실행의 첫 항목부터 쓴다(T30). 실패해도 파일 폴백.
  await ensurePromptOverridesFresh()
  const budget = { exhausted: false }
  // 결론·요약·하이라이트는 목차와 나란히 만든다. 앞에 세우면 독자가 기다리는 첫 항목이
  // LLM 왕복 다섯 번 뒤로 밀린다. 실패해도 목차 생성을 막지 않는다.
  const longform = ensureReportLongform({ reportId: record.reportId, owner: record.owner }).catch(() => null)
  await preGenerateReport({
    reportId: record.reportId,
    birth: record.birth,
    context: record.context,
    analysis: record.analysis ?? analyzeSaju(record.birth),
    owner: record.owner,
  }, { recoverFailed: true, deadlineAt: options.deadlineAt, budget })
  await longform

  const latest = await getReportRecordAsService(reportId)
  const after = progressOf(latest ?? record)
  if (after.done) return after
  // 잔액 소진·상한 도달은 다음 분에 다시 태워도 같은 답이다. 코드로 던져 워커가 길게 물러서거나 고정하게 한다.
  const verdict = classifyRun(latest ?? record, runStartedAt)
  if (verdict === 'quota') throw new Error(REPORT_JOB_CODES.quota)
  if (verdict === 'key') throw new Error(REPORT_JOB_CODES.key)
  if (verdict === 'exhausted') throw new Error(REPORT_JOB_CODES.exhausted)
  // 시간 예산으로 멈춘 것은 실패가 아니다. 그대로 돌려 다음 실행이 5초 뒤 이어받는다.
  if (budget.exhausted) return after

  /*
   * 위에서 실패한 섹션을 한 번 다시 시도했는데도 한 칸도 못 나아갔다면, 이 실행으로는
   * 풀 수 없는 상태다(입력이 잘못됐거나 모델이 같은 이유로 계속 거절당하는 경우).
   *
   * 그대로 "아직 안 끝났다"만 돌려주면 워커가 5초 뒤 같은 작업을 다시 집어 아무 일도
   * 못 하고 attempts 만 태운다. 사유를 남기고 던져서 지수 백오프로 물러나게 하고,
   * max_attempts 에 닿으면 dead-letter 로 보낸다 — 몇 번까지 시도할지는 큐가 센다.
   * 운영자가 /api/admin/v1/jobs 에서 사유와 함께 보고 손을 쓸 수 있어야 한다.
   */
  const stalled = after.complete <= before.complete
  const hasFailedSection = (latest ?? record).report?.sections?.some((section) => section.status === 'failed')
  if (stalled && hasFailedSection) throw new Error(REPORT_JOB_CODES.sectionFailed)

  return after
}

export interface ReportCompletionDiagnostics {
  reportId: string
  serviceKey?: string
  status: string
  progress: { complete: number; total: number }
  /** 지금 다시 태우면 어떻게 판정되는가. exhausted 면 재시작 없이는 모델을 부르지 않는다. */
  verdict: 'quota' | 'key' | 'exhausted' | null
  giveUpThreshold: number
  sections: Array<{
    id: string
    order: number
    classification: string
    status: string
    genuineFailures: number
    totalAttempts: number
    retryFloorAt?: string
    lastError?: string
    lastFailedAt?: string
    reviewMode?: string
    reviewNotes?: string[]
  }>
}

/**
 * 운영자용 진단. 원문(raw)은 싣지 않는다 — 실패 사유·시도 수·상한 판정만. 어느 항목이 왜 막혔고
 * 재시작하면 모델이 다시 불릴지(비용) 를 사람이 판단하는 데 필요한 것만 싣는다.
 */
export async function describeReportCompletion(reportId: string): Promise<ReportCompletionDiagnostics | null> {
  const record = await getReportRecordAsService(reportId)
  if (!record) return null
  const progress = reportProgressOf(record)
  return {
    reportId: record.reportId,
    serviceKey: record.context?.serviceKey,
    status: progress.status,
    progress: { complete: progress.complete, total: progress.total },
    verdict: record.status === 'complete' ? null : classifyRun(record, 0),
    giveUpThreshold: REPORT_GIVE_UP_FAILURES,
    sections: (record.report?.sections ?? [])
      .filter((section) => section.status !== 'complete' || (section.attempts ?? []).some((attempt) => attempt.status === 'failed'))
      .map((section) => {
        const failed = (section.attempts ?? []).filter((attempt) => attempt.status === 'failed')
        const last = failed.at(-1)
        return {
          id: section.id,
          order: section.order,
          classification: section.classification,
          status: section.status ?? 'pending',
          genuineFailures: countGenuineFailures(section),
          totalAttempts: section.attempts?.length ?? 0,
          retryFloorAt: section.retryFloorAt,
          lastError: last?.error ? `${providerOutageOf(last) ? '[공급자 사정] ' : ''}${last.error}`.slice(0, 240) : undefined,
          lastFailedAt: last?.finishedAt ?? last?.startedAt,
          reviewMode: section.reviewMode,
          reviewNotes: section.reviewNotes,
        }
      }),
  }
}

export interface ReportRestartOutcome {
  reportId: string
  /** 상한 계산에서 제외한 옛 실패 시도 수. 기록 자체는 남는다. */
  forgivenFailures: number
  /** 상한을 다시 연 미완성 항목 수. */
  reopenedSections: number
  /** 되살린 기존 작업 수(dead·succeeded). 0 이면 새 작업을 넣었다. */
  revivedJobs: number
  enqueue: EnqueueOpsJobResult | 'skipped'
}

/**
 * 운영자의 수동 재시작. 세 가지를 한 번에 한다.
 *   1. 미완성 항목의 `retryFloorAt` 을 지금으로 — 옛 실패는 REPORT_EXHAUSTED 상한에서 빠진다.
 *      시도 기록은 지우지 않는다(로그 메뉴·진단에 그대로 남는다).
 *   2. REPORT_EXHAUSTED 로 고정된 작업까지 되살린다(백필은 이 코드를 피하므로 여기서만 된다).
 *   3. 작업이 없으면 새로 넣는다.
 * 완료된 리포트는 건드리지 않는다 — mutateReportRecord 의 완료 불변식이 어차피 막는다.
 */
export async function restartReportCompletion(reportId: string): Promise<ReportRestartOutcome> {
  const record = await getReportRecordAsService(reportId)
  if (!record) throw new Error('REPORT_NOT_FOUND')
  if (record.status === 'complete') throw new Error('REPORT_ALREADY_COMPLETE')

  const now = new Date().toISOString()
  let forgivenFailures = 0
  let reopenedSections = 0
  await mutateReportRecord(record.reportId, record.owner, (current) => {
    for (const section of current.report.sections) {
      if (section.status === 'complete') continue
      forgivenFailures += countGenuineFailures(section)
      section.retryFloorAt = now
      reopenedSections += 1
    }
    return reopenedSections > 0
  })

  // 정식 키 한 행만. 옛 쌍둥이(다른 키)는 건드리지 않는다.
  const revivedJobs = await reviveOpsJobByKey(reportCompletionIdempotencyKey(record.reportId))
  const enqueue = revivedJobs > 0
    ? 'skipped' as const
    : await enqueueReportCompletion({ reportId: record.reportId, ownerId: record.owner?.id, paid: true })
  return { reportId: record.reportId, forgivenFailures, reopenedSections, revivedJobs, enqueue }
}

export interface BackfillOutcome {
  /** 미완성으로 찾은 전체 건수. */
  scanned: number
  /** 그중 실제로 큐에 넣은 건수(결제분 + 서비스당 최신 하나). */
  queued: number
  requeued: number
  duplicate: number
  unavailable: number
}

/**
 * 결제로 열린 리포트의 식별자. 주문 저장소를 한 번만 훑어 만든다.
 *
 * 결제분은 무조건 만들어야 하므로 먼저 골라 둔다. 결제되지 않은 것은 아래에서 보관함과
 * 같은 기준(서비스당 최신 하나)으로 추린다.
 */
async function paidReportIds(): Promise<Set<string>> {
  const paid = new Set<string>()
  let cursor: string | undefined
  for (let page = 0; page < 20; page += 1) {
    const result = await listAllPaymentOrders({ limit: 200, ...(cursor ? { cursor } : {}) })
    for (const order of result.orders) {
      // 결제가 확정된 뒤의 상태만 센다. ready·approving 은 아직 돈이 오지 않았다.
      if (order.reportId && (order.status === 'paid' || order.status === 'viewed')) paid.add(order.reportId)
    }
    if (!result.nextCursor) break
    cursor = result.nextCursor
  }
  return paid
}

/**
 * Waiting and failed readings that should keep moving.
 *
 * Paid (and admin-acquired) reports all stay in the list — many sequential
 * purchases must not drop earlier buyers. Unpaid teasers stay one per
 * owner+service. Oldest updatedAt first so the queue walks in purchase order.
 * If paid lookup fails, keep every incomplete row rather than skipping buyers.
 */
export function selectBackfillReportIds(
  candidates: IncompleteReportRef[],
  paid: Set<string> | null,
): string[] {
  return selectBackfillReports(candidates, paid).map((ref) => ref.reportId)
}

export interface BackfillTarget {
  reportId: string
  ownerId?: string
  /** 결제 확인분 또는 관리자가 연 해석. 워커가 먼저 태운다. 결제 조회가 죽었으면 알 수 없어 false. */
  paid: boolean
}

export function selectBackfillReports(
  candidates: IncompleteReportRef[],
  paid: Set<string> | null,
): BackfillTarget[] {
  const byAge = (a: IncompleteReportRef, b: IncompleteReportRef) =>
    a.updatedAt.localeCompare(b.updatedAt) || a.reportId.localeCompare(b.reportId)
  if (paid === null) {
    return [...candidates].sort(byAge).map((ref) => ({ reportId: ref.reportId, ownerId: ref.ownerId, paid: false }))
  }
  const latestByOwnerService = new Map<string, IncompleteReportRef>()
  const selected: Array<IncompleteReportRef & { paid: boolean }> = []
  const taken = new Set<string>()
  const isPaid = (ref: IncompleteReportRef) => (
    paid.has(ref.reportId)
    || Boolean(ref.resultId && paid.has(ref.resultId))
    || Boolean(ref.publicId && paid.has(ref.publicId))
  )
  for (const ref of candidates) {
    if (isPaid(ref) || ref.adminAcquiredAt) {
      if (taken.has(ref.reportId)) continue
      selected.push({ ...ref, paid: true })
      taken.add(ref.reportId)
      continue
    }
    const key = `${ref.ownerId ?? ''}:${ref.serviceKey ?? ''}`
    const current = latestByOwnerService.get(key)
    if (!current || ref.updatedAt > current.updatedAt) latestByOwnerService.set(key, ref)
  }
  for (const ref of latestByOwnerService.values()) {
    if (taken.has(ref.reportId)) continue
    selected.push({ ...ref, paid: false })
    taken.add(ref.reportId)
  }
  selected.sort(byAge)
  return selected.map((ref) => ({ reportId: ref.reportId, ownerId: ref.ownerId, paid: ref.paid }))
}

export interface SweepOutcome {
  /** 훑은 대기·재시도 작업 수. */
  scanned: number
  /** 같은 대상을 가리키는 쌍둥이 중 닫은 수. */
  duplicates: number
  /** 대상 리포트가 이미 끝나 있어 닫은 수. */
  completeTargets: number
  /** 대상 리포트가 지워져 닫은 수. */
  goneTargets: number
}

/** 같은 대상의 여러 작업 중 살릴 하나. 정식 키(리포트당 하나)가 있으면 그것, 없으면 가장 새것. */
export function pickSurvivor(jobs: OpsJobRef[]): OpsJobRef {
  const canonical = jobs.find((job) => job.idempotency_key === reportCompletionIdempotencyKey(job.target_id))
  if (canonical) return canonical
  return [...jobs].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0]
}

/**
 * 큐의 자가 치유. cron 이 매분 부른다.
 *
 * 세 종류의 "할 일 없는 작업"을 처리기 없이 닫는다 — 같은 리포트를 가리키는 쌍둥이, 이미
 * 끝난 리포트의 작업, 지워진 리포트의 작업. 어느 경로가 앞으로 중복을 만들어도 1분 안에
 * 여기서 걷힌다. 그래서 2026-09-18 처럼 대기 200건이 결제 고객 앞에 서는 일은 다시 생기지 않는다.
 *
 * `incompleteIds` 는 백필이 이미 읽은 미완성 목록이다. 거기 없는 대상만 레코드를 다시 읽어
 * 확인하므로, 목록이 잘렸어도(limit) 미완성 리포트의 작업을 잘못 닫지 않는다.
 */
export async function sweepReportCompletionJobs(incompleteIds: Set<string>): Promise<SweepOutcome> {
  const outcome: SweepOutcome = { scanned: 0, duplicates: 0, completeTargets: 0, goneTargets: 0 }
  const jobs = await listOpsJobRefs({ kind: REPORT_COMPLETION_JOB_KIND, states: ['queued', 'retry'], limit: 5000 })
  outcome.scanned = jobs.length
  if (!jobs.length) return outcome

  const byTarget = new Map<string, OpsJobRef[]>()
  for (const job of jobs) byTarget.set(job.target_id, [...(byTarget.get(job.target_id) ?? []), job])

  const twins: string[] = []
  const survivors: OpsJobRef[] = []
  for (const group of byTarget.values()) {
    const survivor = pickSurvivor(group)
    survivors.push(survivor)
    for (const job of group) if (job.id !== survivor.id) twins.push(job.id)
  }
  if (twins.length) outcome.duplicates = await closeOpsJobs(twins, 'OPS_DUPLICATE_TARGET')

  const complete: string[] = []
  const gone: string[] = []
  for (const job of survivors) {
    if (incompleteIds.has(job.target_id)) continue
    const record = await getReportRecordAsService(job.target_id).catch(() => undefined)
    // 읽기 자체가 실패(undefined)한 것은 판단하지 않는다. 다음 분에 다시 본다.
    if (record === undefined) continue
    if (record === null) gone.push(job.id)
    else if (record.status === 'complete') complete.push(job.id)
  }
  if (complete.length) outcome.completeTargets = await closeOpsJobs(complete, 'OPS_TARGET_COMPLETE')
  if (gone.length) outcome.goneTargets = await closeOpsJobs(gone, 'OPS_TARGET_GONE')
  return outcome
}

export interface PurgeOutcome {
  /** 걷어내기 전에 큐에 있던 이 종류의 작업 수(모든 회원). */
  scannedJobs: number
  /** 이 회원의 것으로 확인된 리포트. 미완성인 것은 다음 분 백필이 **한 건씩** 다시 넣는다. */
  reports: Array<{ reportId: string; serviceKey?: string; status: string; jobs: number }>
  deleted: number
}

/** 운영자가 지울 수 있는 상태. running 은 워커가 들고 있으므로 제외한다. */
export const PURGEABLE_JOB_STATES = ['queued', 'retry', 'dead'] as const

/**
 * 한 회원의 리포트를 가리키는 작업을 큐에서 걷어낸다.
 *
 * 작업 행에는 소유자가 없다. 대상(리포트)을 서버 키로 읽어 소유자를 맞춘다 — 그래서 남의
 * 리포트 작업은 건드리지 않는다. 지운 뒤에도 미완성 리포트는 다음 분 백필이 새 키로 한 건씩
 * 다시 넣는다. 즉 이 함수가 하는 일은 "중복을 지우는 것"이지 "생성을 멈추는 것"이 아니다.
 * 생성 자체를 멈추려면 리포트를 지워야 한다.
 */
export async function purgeReportCompletionJobsForOwner(
  ownerId: string,
  states: readonly string[] = PURGEABLE_JOB_STATES,
): Promise<PurgeOutcome> {
  const allowed = states.filter((state): state is typeof PURGEABLE_JOB_STATES[number] =>
    (PURGEABLE_JOB_STATES as readonly string[]).includes(state))
  const jobs = await listOpsJobRefs({ kind: REPORT_COMPLETION_JOB_KIND, states: allowed, limit: 5000 })
  const jobsByTarget = new Map<string, number>()
  for (const job of jobs) jobsByTarget.set(job.target_id, (jobsByTarget.get(job.target_id) ?? 0) + 1)

  const reports: PurgeOutcome['reports'] = []
  for (const [reportId, count] of jobsByTarget) {
    const record = await getReportRecordAsService(reportId).catch(() => null)
    if (!record || record.owner?.id !== ownerId) continue
    reports.push({ reportId: record.reportId, serviceKey: record.context?.serviceKey, status: record.status, jobs: count })
  }
  const deleted = reports.length
    ? await deleteOpsJobsForTargets(reports.map((report) => report.reportId), allowed, REPORT_COMPLETION_JOB_KIND)
    : 0
  return { scannedJobs: jobs.length, reports, deleted }
}

/**
 * 결제 식별자 집합은 5분 동안 재사용한다.
 *
 * 매분 주문 저장소를 최대 20페이지 훑는 것은 LLM 비용은 아니지만 저장소 부하다. 결제는
 * 결제 시점에 `paid: true` 로 바로 큐에 들어가므로, 백필이 결제 여부를 5분 늦게 알아도
 * 손해는 우선순위 5분뿐이다.
 */
const PAID_CACHE_MS = 5 * 60_000
let paidCache: { at: number; ids: Set<string> } | null = null

async function cachedPaidReportIds(): Promise<Set<string> | null> {
  if (paidCache && Date.now() - paidCache.at < PAID_CACHE_MS) return paidCache.ids
  const ids = await paidReportIds().catch(() => null)
  if (ids) paidCache = { at: Date.now(), ids }
  return ids
}

/** 테스트와 운영 점검에서 캐시를 비운다. */
export function resetPaidReportIdCache(): void { paidCache = null }

export async function backfillReportCompletions(limit = 200): Promise<BackfillOutcome> {
  const { backfill } = await maintainReportCompletionQueue(limit)
  return backfill
}

/**
 * cron 한 번에 하는 큐 정비 — 자가 치유(sweep)와 백필을 한 번 읽은 미완성 목록으로 함께 한다.
 * 백필이 먼저 들어가면 그 결과로 생긴 쌍둥이(있다면)를 같은 분에 sweep 이 걷는다.
 */
export async function maintainReportCompletionQueue(limit = 200): Promise<{ backfill: BackfillOutcome; sweep: SweepOutcome | null }> {
  const candidates = await listIncompleteReportRefs(limit)
  const paid = await cachedPaidReportIds()
  const targets = selectBackfillReports(candidates, paid)

  const backfill: BackfillOutcome = { scanned: candidates.length, queued: 0, requeued: 0, duplicate: 0, unavailable: 0 }
  for (const target of targets) {
    const result = await enqueueReportCompletion({ reportId: target.reportId, ownerId: target.ownerId, paid: target.paid })
    if (result === 'queued') backfill.queued += 1
    else if (result === 'requeued') backfill.requeued += 1
    else if (result === 'duplicate') backfill.duplicate += 1
    else backfill.unavailable += 1
  }
  // 정비가 실패해도 백필 결과는 돌려준다. 다음 분에 다시 시도한다.
  const sweep = await sweepReportCompletionJobs(new Set(candidates.map((ref) => ref.reportId))).catch(() => null)
  return { backfill, sweep }
}
