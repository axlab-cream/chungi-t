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
  /*
   * Content changes get a new identity; a saved v2 UUID must never be rewritten.
   *
   * v4(2026-09-18): 오늘운이 십성과 내 기둥의 지지 관계를 함께 보도록 바뀌었다. 저장된 하루는
   * 다시 만들지 않으므로(아래 auxiliary 검사), 판을 올리지 않으면 이미 저장된 날짜는 영영 옛
   * 글로 남는다 — 어제와 오늘이 똑같아 보이던 이유가 이것이다. 판을 올려 날짜마다 새 신분을
   * 주면 옛 기록은 그대로 보존되고 새로 여는 날부터 새 로직으로 만들어진다.
   */
  const reportId = createReportId(profile.birth, context, 'daily-reading-v4', owner.id)
  const reading = fortune.reading
  const templateReport: SajuReport = {
    title: '오늘 나한테 들어온 운', subtitle: '내 사주와 오늘의 흐름으로 정하는 하루의 방향',
    model: 'daily-rules-v4', generatedBy: 'template',
    sections: [{ id: 'daily-reading', order: 1, imageKey: '', imageSrc: '', imageAlt: '',
      category: '하루의 흐름', categoryEn: 'daily', classification: fortune.date.label,
      hook: reading.title, patternKeys: [], ragTopics: [],
      interpretation: [reading.summary, ...(reading.zodiac ? [`[${reading.zodiac.title}] ${reading.zodiac.text}`] : []), `[일과 활동] ${reading.work}`, `[돈과 선택] ${reading.money}`, `[관계] ${reading.relationship}`, `[오늘 조심할 점] ${reading.caution}`, `[오늘의 결론] ${reading.action}`].join('\n\n'),
    }],
  }
  const { record } = await createOrGetReportRecord({ reportId, birth: profile.birth, context, templateReport, analysis: analyzeSaju(profile.birth), owner })
  if (record.auxiliary?.todayFortune) return record
  const saved = await mutateReportRecord(reportId, owner, (draft) => {
    if (draft.auxiliary?.todayFortune) return false
    draft.auxiliary = { ...draft.auxiliary, todayFortune: fortune }
    draft.status = draft.report.status = 'complete'
    draft.report.model = 'daily-rules-v4'
    draft.report.sections.forEach((section) => {
      const calculated = templateReport.sections.find(item => item.id === section.id)
      if (!calculated) throw new Error('DAILY_READING_SECTION_MISSING')
      section.hook = calculated.hook
      section.interpretation = calculated.interpretation
      section.status = 'complete'
      section.model = 'daily-rules-v4'
      section.generatedAt = new Date().toISOString()
    })
  })
  if (!saved) throw new Error('오늘의 운세를 저장하지 못했습니다.')
  return saved
}
