import { backfillMissingReportServiceKey, getReportRecordAsService } from './report-store.js'

/**
 * 2026-09-19: 2026-08-31~09-14 에 만들어졌지만 완성되지 못한 채 방치되다가 09-18 대량
 * 백필 때 비로소 이어서 완성된 리포트들에는 `context.serviceKey` 자체가 저장되어 있지
 * 않았다(그 시절에는 이 필드를 남기지 않았다). 실제로 어떤 서비스였는지는 값이 아니라
 * 항목 구성으로만 알 수 있다.
 *
 * 아래 6개는 saju_master(cmdg) 전용 명리 용어라 다른 어떤 서비스의 페르소나 항목에도
 * 나타나지 않는다(각 서비스는 서로 다른 어휘의 전용 항목 집합을 쓴다 — service-system.ts,
 * tone-v2/generated/services/*.md). 목차는 시기별로 개정되어 지금의 outline 과 정확히
 * 같지는 않을 수 있어(예: day-master-strength) 정확 일치가 아니라 겹침 개수로 판단한다.
 */
const CMDG_FINGERPRINT_SECTION_IDS = [
  'day-master-strength', 'ten-gods-overview', 'ten-gods-position',
  'useful-god-eokbu', 'useful-god-johu', 'daewoon-detail', 'sewoon-detail',
] as const
const CMDG_FINGERPRINT_MIN_MATCHES = 3

export interface ServiceKeyBackfillResult {
  reportId: string
  outcome: 'filled' | 'already_set' | 'not_found' | 'fingerprint_mismatch'
  matchedSectionIds?: string[]
}

/**
 * 서비스 키가 비어 있고, 항목 구성이 cmdg 지문과 최소 겹침 수(CMDG_FINGERPRINT_MIN_MATCHES) 이상 겹칠 때만
 * 채운다. 이미 값이 있거나(다른 서비스로 확인됨) 지문이 안 맞으면 손대지 않는다 — 확신이
 * 없으면 "기록 없음"으로 정직하게 남기는 편이 지어내는 것보다 낫다(ADR-0002).
 */
export async function backfillCmdgServiceKeyIfMatching(reportId: string): Promise<ServiceKeyBackfillResult> {
  const record = await getReportRecordAsService(reportId)
  if (!record) return { reportId, outcome: 'not_found' }
  if (record.context?.serviceKey) return { reportId, outcome: 'already_set' }
  const sectionIds = new Set((record.report?.sections ?? []).map((section) => section.id))
  const matched = CMDG_FINGERPRINT_SECTION_IDS.filter((id) => sectionIds.has(id))
  if (matched.length < CMDG_FINGERPRINT_MIN_MATCHES) return { reportId, outcome: 'fingerprint_mismatch', matchedSectionIds: matched }
  const outcome = await backfillMissingReportServiceKey(reportId, 'cmdg')
  return { reportId, outcome, matchedSectionIds: matched }
}
