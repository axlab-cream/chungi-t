import { astro } from 'iztro'
import { resolveBirthDate } from './calculator.js'
import type { BirthInput, SajuReportSection } from '../types/index.js'

const PALACE_LABELS: Record<string, string> = { 명궁: '나의 성향', 형제: '가까운 동료와 형제', 부처: '연애와 배우자', 자녀: '돌봄과 다음 세대', 재백: '돈과 자원', 질액: '몸과 휴식', 천이: '외부 활동과 이동', 노복: '협력하는 사람들', 관록: '일과 사회적 역할', 전택: '집과 생활 기반', 복덕: '마음의 여유', 부모: '부모와 보호 관계' }
const CHANGES: Record<string, string> = { 록: '기회와 보상이 모이는 주제', 권: '주도권과 책임이 커지는 주제', 과: '신뢰와 평가를 쌓는 주제', 기: '집착과 어려움을 돌아볼 주제' }

export function calculateZiwei(birth: BirthInput, birthTimeKnown?: boolean) {
  if (birthTimeKnown === false || !Number.isInteger(birth.hour) || birth.hour < 0 || birth.hour > 23) return { available: false as const, reason: '태어난 시간을 입력하면 나의 자미두수 명반과 풀이를 볼 수 있습니다.' }
  const solar = resolveBirthDate(birth)
  const previous = astro.getConfig()
  try {
    // iztro uses synchronous global configuration. Restore it before returning to another request.
    const chart = astro.withOptions({ type: 'solar', dateStr: `${solar.solarYear}-${solar.solarMonth}-${solar.solarDay}`, timeIndex: Math.floor((birth.hour + 1) / 2), gender: birth.gender, fixLeap: true, language: 'ko-KR', config: { algorithm: 'default', yearDivide: 'normal', horoscopeDivide: 'normal', ageDivide: 'normal', dayDivide: birth.dayBoundaryRule === 'zi_hour_next_day' ? 'forward' : 'current' } })
    return {
      available: true as const, engine: 'iztro@2.6.1', fiveElementsClass: chart.fiveElementsClass,
      convention: '출생지 현지 시각 입력 · 음력 설 기준 · 윤달 전후반 보정 · ' + (birth.dayBoundaryRule === 'zi_hour_next_day' ? '밤 11시부터 다음 날' : '자정부터 다음 날'),
      palaces: chart.palaces.map(p => ({ name: p.name, label: PALACE_LABELS[p.name] || p.name, branch: p.earthlyBranch, body: p.isBodyPalace, stars: p.majorStars.map(s => ({ name: s.name, brightness: s.brightness || '', change: CHANGES[s.mutagen || ''] || '' })), transformations: [...p.majorStars, ...p.minorStars].filter(s => s.mutagen).map(s => ({ star: s.name, meaning: CHANGES[s.mutagen!] || s.mutagen })) })),
    }
  } finally { astro.config({ algorithm: previous.algorithm, yearDivide: previous.yearDivide, horoscopeDivide: previous.horoscopeDivide, ageDivide: previous.ageDivide, dayDivide: previous.dayDivide }) }
}

export function ziweiSection(birth: BirthInput, birthTimeKnown?: boolean): SajuReportSection | undefined {
  const chart = calculateZiwei(birth, birthTimeKnown)
  if (!chart.available) return undefined
  return { id: 'ziwei', order: 17, category: '자미두수', categoryEn: 'Zi Wei Dou Shu', classification: '자미두수로 보는 나의 성향과 삶의 역할', hook: '', interpretation: JSON.stringify(chart), imageKey: '', imageSrc: '', imageAlt: '', status: 'complete', patternKeys: [], ragTopics: [] }
}

