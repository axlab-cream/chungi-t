import { buildTodayFortune } from '../saju/today-fortune.js'
import { analyzeSaju } from '../saju/analyzer.js'
import type { UserBirthProfile } from '../user/profile-store.js'
import type { SajuReport, SajuReportContext } from '../types/index.js'
import { createOrGetReportRecord, createReportId, mutateReportRecord, type ReportOwner, type ReportRecord } from './report-store.js'

/** Daily rules-based readings are snapshots too: an old ID never becomes today's reading. */
export async function savedDailyFortune(profile: UserBirthProfile, owner: ReportOwner, now = new Date()): Promise<ReportRecord> {
  const fortune = buildTodayFortune(profile, now)
  const context: SajuReportContext = {
    serviceKey: 'today', name: profile.name, birthTimeKnown: profile.birthTimeKnown,
    concern: fortune.date.iso,
  }
  const reportId = createReportId(profile.birth, context, 'daily-reading-v2', owner.id)
  const reading = fortune.reading
  const templateReport: SajuReport = {
    title: '오늘의 운세', subtitle: '전통 상징을 활용한 하루 점검. 점수는 예측 확률이 아닙니다.',
    model: 'daily-rules-v2', generatedBy: 'template',
    sections: [{ id: 'daily-reading', order: 1, imageKey: '', imageSrc: '', imageAlt: '',
      category: '하루의 흐름', categoryEn: 'daily', classification: fortune.date.label,
      hook: reading.title, patternKeys: [], ragTopics: [],
      interpretation: [reading.summary, `[일과 활동] ${reading.work}`, `[돈과 선택] ${reading.money}`, `[관계] ${reading.relationship}`, `[확인할 조건] ${reading.caution}`, `[오늘의 행동] ${reading.action}`].join('\n\n'),
    }],
  }
  const { record } = await createOrGetReportRecord({ reportId, birth: profile.birth, context, templateReport, analysis: analyzeSaju(profile.birth), owner })
  if (record.auxiliary?.todayFortune) return record
  const saved = await mutateReportRecord(reportId, owner, (draft) => {
    if (draft.auxiliary?.todayFortune) return false
    draft.auxiliary = { ...draft.auxiliary, todayFortune: fortune }
    draft.status = draft.report.status = 'complete'
    draft.report.model = 'daily-rules-v2'
    draft.report.sections.forEach((section) => { section.status = 'complete'; section.model = 'daily-rules-v2'; section.generatedAt = new Date().toISOString() })
  })
  if (!saved) throw new Error('오늘의 운세를 저장하지 못했습니다.')
  return saved
}
