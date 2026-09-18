import { enqueueOpsJob, type EnqueueOpsJobResult } from '../admin/ops-queue.js'
import { analyzeSaju } from '../saju/analyzer.js'
import { ensureReportLongform, preGenerateReport } from './report-queue.js'
import { getReportRecordAsService, listIncompleteReportRefs, type IncompleteReportRef, type ReportRecord } from './report-store.js'

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
 * 돌아와도 작업이 복제되지 않는다. `revision` 이 오르면(재생성) 새 작업으로 본다.
 */
export function reportCompletionIdempotencyKey(reportId: string, revision?: number): string {
  return `${REPORT_COMPLETION_JOB_KIND}:${reportId}:${revision ?? 0}`
}

export async function enqueueReportCompletion(params: {
  reportId: string
  revision?: number
}): Promise<EnqueueOpsJobResult> {
  if (!params.reportId) return 'unavailable'
  const record = await getReportRecordAsService(params.reportId).catch(() => null)
  const reportId = record?.reportId || params.reportId
  const revision = params.revision ?? record?.revision ?? 0
  return enqueueOpsJob({
    kind: REPORT_COMPLETION_JOB_KIND,
    targetId: reportId,
    idempotencyKey: reportCompletionIdempotencyKey(reportId, revision),
    payload: { reportId, revision },
  })
}

export interface ReportCompletionOutcome {
  complete: number
  total: number
  done: boolean
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
  if (stalled && hasFailedSection) throw new Error('REPORT_SECTION_FAILED')

  return after
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
  if (paid === null) {
    return [...candidates]
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt) || a.reportId.localeCompare(b.reportId))
      .map((ref) => ref.reportId)
  }
  const latestByOwnerService = new Map<string, IncompleteReportRef>()
  const selected: IncompleteReportRef[] = []
  const taken = new Set<string>()
  const isPaid = (ref: IncompleteReportRef) => (
    paid.has(ref.reportId)
    || Boolean(ref.resultId && paid.has(ref.resultId))
    || Boolean(ref.publicId && paid.has(ref.publicId))
  )
  for (const ref of candidates) {
    if (isPaid(ref) || ref.adminAcquiredAt) {
      if (taken.has(ref.reportId)) continue
      selected.push(ref)
      taken.add(ref.reportId)
      continue
    }
    const key = `${ref.ownerId ?? ''}:${ref.serviceKey ?? ''}`
    const current = latestByOwnerService.get(key)
    if (!current || ref.updatedAt > current.updatedAt) latestByOwnerService.set(key, ref)
  }
  for (const ref of latestByOwnerService.values()) {
    if (taken.has(ref.reportId)) continue
    selected.push(ref)
    taken.add(ref.reportId)
  }
  selected.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt) || a.reportId.localeCompare(b.reportId))
  return selected.map((ref) => ref.reportId)
}

export async function backfillReportCompletions(limit = 200): Promise<BackfillOutcome> {
  const candidates = await listIncompleteReportRefs(limit)
  const paid = await paidReportIds().catch(() => null)
  const ids = selectBackfillReportIds(candidates, paid)

  const outcome: BackfillOutcome = { scanned: candidates.length, queued: 0, requeued: 0, duplicate: 0, unavailable: 0 }
  for (const reportId of ids) {
    const result = await enqueueReportCompletion({ reportId })
    if (result === 'queued') outcome.queued += 1
    else if (result === 'requeued') outcome.requeued += 1
    else if (result === 'duplicate') outcome.duplicate += 1
    else outcome.unavailable += 1
  }
  return outcome
}
