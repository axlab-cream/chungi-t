import { closeOpsJobs, deleteOpsJobsForTargets, enqueueOpsJob, listOpsJobRefs, type EnqueueOpsJobResult, type OpsJobRef } from '../admin/ops-queue.js'
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
