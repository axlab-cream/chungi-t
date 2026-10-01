import { astro } from 'iztro'
import { resolveBirthDate } from './calculator.js'
import type { BirthInput, SajuReportSection } from '../types/index.js'

// Traditional symbolic meanings; plain labels do not replace or change the calculated chart.
// Reference: https://docs.iztro.com/learn/major-star
const PALACE_LABELS: Record<string, string> = { 명궁: '내 성격과 행동', 형제: '형제·친구와 지내는 모습', 부처: '연애와 결혼 생활', 자녀: '아이와 후배를 돌보는 모습', 재백: '돈을 벌고 쓰는 습관', 질액: '몸을 돌보고 쉬는 방법', 천이: '낯선 곳에서 사람을 만날 때', 노복: '친구·동료와 힘을 합칠 때', 관록: '일할 때 드러나는 모습', 전택: '집과 함께 사는 생활', 복덕: '마음이 편해지는 방법', 부모: '부모·어른과 지내는 모습' }
const PALACE_QUESTIONS: Record<string, string> = { 명궁: '나는 어떤 일을 만나면 내 방식대로 움직일까요?', 형제: '가까운 사람과 서로 도울 때 무엇이 중요할까요?', 부처: '함께 지내면서 어떤 약속을 중요하게 여길까요?', 자녀: '누군가를 챙길 때 어디까지 도와주는 편일까요?', 재백: '돈을 얻는 일과 지키는 일 중 어디에 더 힘을 쓸까요?', 질액: '피곤할 때 어떤 생활 습관부터 돌아보면 좋을까요?', 천이: '새로운 모임이나 낯선 장소에서 어떻게 행동할까요?', 노복: '누군가와 함께 일할 때 어떤 역할을 맡을까요?', 관록: '일을 맡으면 무엇부터 신경 쓰는 편일까요?', 전택: '내가 편하게 지낼 집에는 무엇이 필요할까요?', 복덕: '어떤 시간을 보내야 마음의 긴장이 풀릴까요?', 부모: '도움을 받거나 기대에 답할 때 무엇이 중요할까요?' }
export const ZIWEI_STAR_MEANINGS: Record<string,string> = {
 자미:'앞장서서 일을 정하고 책임지는 모습', 천기:'여러 방법을 생각하고 상황에 맞게 바꾸는 모습', 태양:'사람을 돕고 생각을 밖으로 표현하는 모습', 무곡:'목표를 정하고 돈과 일을 꼼꼼히 챙기는 모습', 천동:'편안한 관계와 즐거운 생활을 바라는 모습', 염정:'좋고 싫음이 분명하고 관계에서 약속을 중요하게 여기는 모습', 천부:'이미 가진 것을 잘 관리하고 안정감을 지키는 모습', 태음:'작은 변화를 살피고 조용히 준비하는 모습', 탐랑:'새로운 경험과 사람에게 관심을 넓히는 모습', 거문:'궁금한 점을 묻고 말로 문제를 풀어가는 모습', 천상:'서로의 입장을 듣고 공평하게 조율하는 모습', 천량:'도움이 필요한 사람을 챙기고 옳다고 생각한 일을 지키는 모습', 칠살:'어려운 일에서도 결단하고 직접 움직이는 모습', 파군:'익숙한 방식을 바꾸고 새로 시작하는 모습', 녹존:'가진 자원을 아껴 오래 유지하려는 모습', 천마:'이동하거나 환경을 바꾸며 활동하는 모습', 문창:'생각을 글과 말로 정리하는 모습', 문곡:'느낌을 섬세하게 표현하는 모습', 좌보:'다른 사람의 일을 함께 돕는 모습', 우필:'곁에서 일을 거들고 협력하는 모습'
}
const CHANGES: Record<string, string> = { 록: '도움이나 보상을 얻는 데 눈길이 갑니다.', 권: '스스로 결정하고 책임지려는 마음이 커집니다.', 과: '실력을 인정받고 믿음을 쌓는 일이 중요해집니다.', 기: '마음이 오래 쓰이거나 부담을 느끼는 부분을 돌아봅니다.' }
export function ziweiPalaceReading(name: string, stars: Array<{name:string}>) {
 const meanings = stars.map(s => ZIWEI_STAR_MEANINGS[s.name]).filter(Boolean)
 return { question: PALACE_QUESTIONS[name] || '이 생활에서는 어떤 모습이 드러날까요?', points: meanings, summary: meanings.length ? '이 부분에서는 ' + meanings.join(', ') + '을 함께 살펴봅니다.' : '이 부분은 한 가지 성향으로 정하지 않고, 다른 생활 영역과 함께 살펴봅니다.' }
}

export function calculateZiwei(birth: BirthInput, birthTimeKnown?: boolean) {
  if (birthTimeKnown === false || !Number.isInteger(birth.hour) || birth.hour < 0 || birth.hour > 23) return { available: false as const, reason: '태어난 시간을 입력하면 태어난 때를 바탕으로 한 자미두수 풀이를 볼 수 있습니다.' }
  const solar = resolveBirthDate(birth)
  const previous = astro.getConfig()
  try {
    // iztro uses synchronous global configuration. Restore it before returning to another request.
    const chart = astro.withOptions({ type: 'solar', dateStr: `${solar.solarYear}-${solar.solarMonth}-${solar.solarDay}`, timeIndex: Math.floor((birth.hour + 1) / 2), gender: birth.gender, fixLeap: true, language: 'ko-KR', config: { algorithm: 'default', yearDivide: 'normal', horoscopeDivide: 'normal', ageDivide: 'normal', dayDivide: birth.dayBoundaryRule === 'zi_hour_next_day' ? 'forward' : 'current' } })
    return {
      available: true as const, engine: 'iztro@2.6.1', fiveElementsClass: chart.fiveElementsClass,
      convention: '출생지 현지 시각 입력 · 음력 설 기준 · 윤달 전후반 보정 · ' + (birth.dayBoundaryRule === 'zi_hour_next_day' ? '밤 11시부터 다음 날' : '자정부터 다음 날'),
      palaces: chart.palaces.map(p => ({ name: p.name, label: PALACE_LABELS[p.name] || p.name, branch: p.earthlyBranch, body: p.isBodyPalace, reading: ziweiPalaceReading(p.name, p.majorStars), stars: p.majorStars.map(s => ({ name: s.name, meaning: ZIWEI_STAR_MEANINGS[s.name] || '', brightness: s.brightness || '', change: CHANGES[s.mutagen || ''] || '' })), transformations: [...p.majorStars, ...p.minorStars].filter(s => s.mutagen).map(s => ({ star: s.name, starMeaning: ZIWEI_STAR_MEANINGS[s.name] || '', meaning: CHANGES[s.mutagen!] || s.mutagen })) })),
    }
  } finally { astro.config({ algorithm: previous.algorithm, yearDivide: previous.yearDivide, horoscopeDivide: previous.horoscopeDivide, ageDivide: previous.ageDivide, dayDivide: previous.dayDivide }) }
}

export function ziweiSection(birth: BirthInput, birthTimeKnown?: boolean): SajuReportSection | undefined {
  const chart = calculateZiwei(birth, birthTimeKnown)
  if (!chart.available) return undefined
  return { id: 'ziwei', order: 17, category: '자미두수', categoryEn: 'Zi Wei Dou Shu', classification: '자미두수로 보는 나의 성향과 삶의 역할', hook: '', interpretation: JSON.stringify(chart), imageKey: '', imageSrc: '', imageAlt: '', status: 'complete', patternKeys: [], ragTopics: [] }
}

