import { enqueueOpsJob, type EnqueueOpsJobResult } from '../admin/ops-queue.js'
import { analyzeSaju } from '../saju/analyzer.js'
import { preGenerateReport } from './report-queue.js'
import { findReportRecord, type ReportRecord } from './report-store.js'

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
  return enqueueOpsJob({
    kind: REPORT_COMPLETION_JOB_KIND,
    targetId: params.reportId,
    idempotencyKey: reportCompletionIdempotencyKey(params.reportId, params.revision),
    payload: { reportId: params.reportId, revision: params.revision ?? 0 },
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
export async function runReportCompletionJob(reportId: string): Promise<ReportCompletionOutcome> {
  const record = await findReportRecord(reportId)
  if (!record) throw new Error('REPORT_NOT_FOUND')
  if (record.status === 'complete') return progressOf(record)

  await preGenerateReport({
    reportId: record.reportId,
    birth: record.birth,
    context: record.context,
    analysis: record.analysis ?? analyzeSaju(record.birth),
    owner: record.owner,
  })

  const latest = await findReportRecord(reportId)
  return progressOf(latest ?? record)
}
