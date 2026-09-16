import type { BirthInput, Element } from '../types/index.js'
import { analyzeSaju, calculateFourPillars, BRANCH_KO, ELEMENT_KO, STEM_ELEMENT, STEM_KO } from './analyzer.js'
import type { UserBirthProfile } from '../user/profile-store.js'

type TodayRelation = 'same' | 'support' | 'output' | 'wealth' | 'pressure'
type TodayDetailKey = 'work' | 'money' | 'relationship' | 'caution'

export interface TodayFortuneDetail {
  score: number
  text: string
  caution?: string
  opportunity?: string
}

export interface TodayFortune {
  date: {
    iso: string
    label: string
  }
  profile: {
    name: string
    birth: BirthInput
    birthTimeKnown: boolean
  }
  user: {
    dayMaster: string
    dayMasterKo: string
    dayMasterElement: string
    dayPillar: string
    dayPillarKo: string
  }
  today: {
    pillar: string
    pillarKo: string
    element: string
    relation: TodayRelation
  }
  reading: {
    title: string
    summary: string
    score: {
      total: number
      work: number
      money: number
      relationship: number
      caution: number
    }
    work: string
    money: string
    relationship: string
    caution: string
    action: string
    /** Optional so already-saved v2 snapshots retain their original shape. */
    zodiac?: {
      birthYear: number
      animal: string
      title: string
      text: string
      basis: 'birth-year'
    }
    details: Record<TodayDetailKey, TodayFortuneDetail>
  }
}

type BaseTodayReading = Omit<TodayFortune['reading'], 'score' | 'details'>

const GENERATES: Record<Element, Element> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
}

const CONTROLS: Record<Element, Element> = {
  wood: 'earth',
  fire: 'metal',
  earth: 'water',
  metal: 'wood',
  water: 'fire',
}

function kstDateParts(now: Date): { year: number; month: number; day: number; iso: string; label: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  const year = Number(value('year'))
  const month = Number(value('month'))
  const day = Number(value('day'))
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const label = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(now)
  return { year, month, day, iso, label }
}

function relationFor(userElement: Element, todayElement: Element): TodayRelation {
  if (userElement === todayElement) return 'same'
  if (GENERATES[todayElement] === userElement) return 'support'
  if (GENERATES[userElement] === todayElement) return 'output'
  if (CONTROLS[userElement] === todayElement) return 'wealth'
  if (CONTROLS[todayElement] === userElement) return 'pressure'
  // Five elements have exactly these five relationships; no sixth fallback reading.
  throw new Error('오늘운의 오행 관계를 확인하지 못했습니다.')
}

const ELEMENT_EXPLANATION: Record<Element, string> = {
  wood: '목(木)은 나무가 자라듯 방향을 세우고 이어 가는 힘',
  fire: '화(火)는 불이 밝히듯 생각을 드러내고 교류하는 힘',
  earth: '토(土)는 흙이 받치듯 일을 안정시키고 정리하는 힘',
  metal: '금(金)은 금속을 다듬듯 기준을 세우고 선택하는 힘',
  water: '수(水)는 물이 흐르듯 정보를 받아들이고 유연하게 잇는 힘',
}

function relationText(relation: TodayRelation, _userName: string, todayElement: Element): BaseTodayReading {
  const table: Record<TodayRelation, BaseTodayReading> = {
    same: {
      title: '잘되는 방식을 내 편으로 만드는 날',
      summary: `오늘은 새 방법을 늘리기보다 이미 잘해 온 방식으로 중요한 일 하나를 마무리하는 데 무게를 둬. ${ELEMENT_EXPLANATION[todayElement]}을 뜻하고, 태어난 날의 중심 기운과 같은 결이라서 자기 기준을 점검하는 흐름으로 풀이해.`,
      work: '오늘 일의 방향은 새로운 시도보다 익숙한 강점을 제대로 쓰는 쪽이야. 최근 수월하게 끝낸 일의 순서를 하나 가져와 가장 중요한 작업부터 마무리해. 함께하는 일이라면 최종 기준만 먼저 맞추고, 잘 진행되는 부분까지 바꿀 필요는 없어.',
      money: '돈에서는 더 큰 이익을 찾기보다 이미 세운 기준을 지키는 데 초점을 둬. 구매할 일이 있다면 가격뿐 아니라 실제로 쓸 횟수까지 따져 예산 안에서 골라. 현재 지출이 안정적이라면 무리한 절약 계획을 새로 세우지 않아도 돼.',
      relationship: '관계에서는 내 생각을 분명히 말하되, 상대가 선택할 여지를 남기는 게 오늘의 방향이야. 함께 정할 일이 있다면 내가 원하는 점 한 가지를 말하고 상대의 기준도 한 가지 물어봐. 평온하게 지내고 있다면 익숙한 안부와 작은 고마움을 이어 가면 충분해.',
      caution: '오늘 조심할 지점은 익숙하다는 이유로 확인을 생략하는 순간이야. 의견이 다르거나 조건이 바뀐 일이 있을 때만 잠깐 멈춰 새로 확인해. 이미 합의했고 순조로운 일까지 의심하며 다시 점검할 필요는 없어.',
      action: '오늘의 결론은 잘되는 방식을 지키며 중요한 일 하나를 끝내는 거야. 내 기준은 분명히 세우고, 함께하는 일의 마지막 결정만 한 번 더 맞춰.',
    },
    support: {
      title: '좋은 정보를 내 판단으로 바꾸는 날',
      summary: `오늘은 급하게 답을 내기보다 필요한 근거 하나를 더 챙긴 뒤 움직이는 데 무게를 둬. ${ELEMENT_EXPLANATION[todayElement]}을 뜻하고, 태어난 날의 중심 기운을 돕는 관계라서 배움과 준비를 살리는 흐름으로 풀이해.`,
      work: '오늘 일의 방향은 막연히 더 노력하기보다 필요한 정보를 정확히 찾는 쪽이야. 막힌 일이 있다면 질문을 한 문장으로 좁혀 자료나 경험자의 답을 확인해. 이미 방법을 아는 일은 검색을 더 늘리지 말고 정한 순서대로 진행하면 돼.',
      money: '돈과 관련한 선택에서는 추천의 강도보다 조건이 얼마나 분명한지를 먼저 봐. 계약이나 구매를 앞두었다면 총비용과 취소 조건을 함께 확인하고, 이해되지 않는 항목은 질문한 뒤 결정해. 오늘 결정할 지출이 없다면 기존 계획을 그대로 유지해도 좋아.',
      relationship: '관계에서는 혼자 추측하기보다 필요한 말을 구체적으로 나누는 쪽에 힘을 줘. 도움을 구할 일이 있다면 상황과 원하는 도움을 짧게 말하고 상대가 가능한 범위를 물어봐. 특별한 부탁이 없다면 최근 받았던 배려 한 가지에 고마움을 전해도 좋아.',
      caution: '오늘 조심할 지점은 정보를 많이 모으고도 결정을 계속 미루는 순간이야. 선택에 꼭 필요한 조건만 남기고 확인되면 다음 단계로 옮겨. 조언이 서로 다를 때는 모두 따르기보다 내 시간과 여건에 맞는 기준을 골라.',
      action: '오늘의 결론은 필요한 근거를 확인한 뒤 내 판단으로 움직이는 거야. 답을 찾는 데서 멈추지 말고, 확인한 내용으로 작은 실행 하나까지 마쳐.',
    },
    output: {
      title: '생각을 눈에 보이는 한 가지로 만드는 날',
      summary: `오늘은 머릿속에서 고치기만 하던 생각을 짧은 말이나 작은 결과물로 꺼내 봐. ${ELEMENT_EXPLANATION[todayElement]}을 뜻하고, 태어난 날의 중심 기운이 밖으로 이어지는 관계라서 표현과 실행을 살리는 흐름으로 풀이해.`,
      work: '오늘 일의 방향은 완벽한 구상보다 확인할 수 있는 결과물 하나를 만드는 쪽이야. 제안이나 정리할 일이 있다면 핵심 한 문장을 먼저 쓰고 필요한 근거를 두 가지만 붙여. 이미 초안이 있다면 처음부터 다시 만들기보다 전달에 꼭 필요한 부분부터 다듬어.',
      money: '돈에서는 갖고 싶은 마음을 실제 사용 계획으로 바꾸어 살펴봐. 구매를 고려 중이라면 언제 어디에 쓸지 한 번 적고, 이미 가진 것으로 가능한지도 비교해. 쓰임이 분명하고 정한 예산 안이라면 필요한 소비까지 막연히 죄책감으로 대할 필요는 없어.',
      relationship: '관계에서는 길게 설명하기보다 마음과 요청을 알아듣기 쉽게 전하는 데 초점을 둬. 전할 말이 있다면 실제 있었던 일과 내가 바라는 점을 나누어 말해. 좋은 관계라면 거창한 대화를 만들기보다 고마웠던 장면을 구체적으로 짚어 주면 돼.',
      caution: '오늘 조심할 지점은 생각이 정리되기 전에 말이나 약속이 먼저 나가는 순간이야. 중요한 메시지는 상대에게 원하는 행동이 무엇인지 확인하고 전송해. 감정이 높아졌다면 잠시 두었다 다시 읽되, 평소의 편안한 대화까지 검열할 필요는 없어.',
      action: '오늘의 결론은 생각 하나를 끝까지 표현해 남기는 거야. 짧은 초안이든 분명한 한마디든 완성하고, 보내기 전 핵심과 약속의 범위만 확인해.',
    },
    wealth: {
      title: '막연한 기대를 분명한 조건으로 바꾸는 날',
      summary: `오늘은 얼마나 많이 얻을지보다 무엇을 남기고 어디까지 맡을지를 구체적으로 정해 봐. ${ELEMENT_EXPLANATION[todayElement]}을 뜻하고, 태어난 날의 중심 기운이 다루는 관계라서 자원과 결과의 조건을 살리는 흐름으로 풀이해.`,
      work: '오늘 일의 방향은 바쁘게 움직이는 양보다 끝났다고 판단할 기준을 분명히 하는 쪽이야. 협의할 일이 있다면 작업 범위와 마감, 누가 확인할지를 짧게 남겨 둬. 이미 합의된 조건이 잘 지켜진다면 목표를 무리하게 키우기보다 약속한 결과를 마무리해.',
      money: '돈에서는 들어올 것으로 기대하는 금액과 이미 확정된 금액을 구분해 봐. 지출을 결정할 때는 지금 쓸 수 있는 예산을 기준으로 삼고 할인보다 총액과 필요성을 함께 따져. 별도의 거래가 없는 날이라면 큰 기회를 찾기보다 정해 둔 생활비 기준을 지키면 돼.',
      relationship: '관계에서는 호의와 책임의 범위를 함께 챙기는 게 오늘의 방향이야. 시간이나 비용을 나눌 일이 있다면 각자 편하게 감당할 수 있는 정도를 먼저 이야기해. 합의가 잘되어 있다면 더 계산적으로 바꾸기보다 약속을 지키고 배려에 감사하는 쪽을 택해.',
      caution: '오늘 조심할 지점은 눈앞의 성과만 보고 시간과 수고를 빠뜨리는 순간이야. 새 제안을 받을 때는 얻는 것 옆에 드는 시간과 추가 책임도 적어 비교해. 부담이 크지 않고 조건이 명확하다면 막연한 불안 때문에 결정을 계속 미룰 필요는 없어.',
      action: '오늘의 결론은 기대를 키우기 전에 조건을 분명히 정하는 거야. 금액과 시간, 맡을 범위를 확인하고 내가 감당할 수 있는 선택 하나를 확정해.',
    },
    pressure: {
      title: '해야 할 일을 정하고 내 여유를 지키는 날',
      summary: `오늘은 해야 할 일을 모두 끌어안기보다 우선순위와 책임의 끝을 분명히 해 봐. ${ELEMENT_EXPLANATION[todayElement]}을 뜻하고, 태어난 날의 중심 기운에 기준을 세우는 관계라서 약속과 순서를 정돈하는 흐름으로 풀이해.`,
      work: '오늘 일의 방향은 더 많은 일을 맡는 것보다 약속한 일을 순서 있게 끝내는 쪽이야. 마감이 있는 작업 중 먼저 끝낼 것 하나를 고르고 완료 기준과 필요한 시간을 확인해. 일정에 여유가 있다면 일을 억지로 추가하지 말고 마친 뒤 쉴 시간까지 남겨 둬.',
      money: '돈에서는 큰 판단보다 이미 정해진 납부와 지출 일정을 먼저 정리해. 가까운 결제일이 있다면 금액과 처리 여부를 한 번 확인하고, 추가 구매는 남은 예산을 본 뒤 결정해. 이미 확인했고 변동도 없다면 같은 항목을 반복해서 걱정할 필요는 없어.',
      relationship: '관계에서는 상대의 요청을 듣는 일과 모두 들어주는 일을 구분해 봐. 부탁을 받았다면 가능한 범위와 시간을 분명히 말하고, 어려운 부분은 짧게 이유를 전해. 특별한 부담 없이 지내는 관계라면 거리부터 두기보다 지금의 편안한 약속을 이어 가면 돼.',
      caution: '오늘 조심할 지점은 책임감 때문에 필요 이상으로 약속을 늘리는 순간이야. 새 일을 맡기 전에는 기존 일정에 실제로 들어갈 자리가 있는지 확인해. 모든 일이 순조롭다면 숨은 문제를 찾기보다 정한 만큼 마무리하고 쉬는 게 좋아.',
      action: '오늘의 결론은 약속한 일을 끝내되 내 몫을 넘는 부담까지 가져오지 않는 거야. 먼저 마칠 일 하나와 오늘 하지 않을 일 하나를 정해 시간을 지켜.',
    },
  }
  return table[relation]
}

// Persisted display weights summarize the symbolic daily flow. They are neither
// measured outcomes nor probabilities; renderers must preserve these saved values.
const LEGACY_DISPLAY_WEIGHTS: Record<TodayRelation, Record<TodayDetailKey, number>> = {
  same: { work: 78, money: 62, relationship: 58, caution: 54 },
  support: { work: 82, money: 70, relationship: 76, caution: 68 },
  output: { work: 84, money: 62, relationship: 74, caution: 60 },
  wealth: { work: 86, money: 82, relationship: 68, caution: 60 },
  pressure: { work: 64, money: 58, relationship: 61, caution: 52 },
}

function buildReadingDetails(relation: TodayRelation, reading: BaseTodayReading): Record<TodayDetailKey, TodayFortuneDetail> {
  const weights = LEGACY_DISPLAY_WEIGHTS[relation]
  return {
    work: { text: reading.work, score: weights.work },
    money: { text: reading.money, score: weights.money },
    relationship: { text: reading.relationship, score: weights.relationship },
    caution: { text: reading.caution, score: weights.caution },
  }
}

const ZODIAC_ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'] as const
const ZODIAC_GUIDES = [
  '실행하기 전 필요한 정보 하나만 더 확인하고, 이미 정한 목표는 불필요하게 늘리지 마.',
  '진행 중인 일의 끝을 먼저 정하고, 익숙한 순서로 한 단계씩 마무리해 봐.',
  '시작할 일과 끝낼 일을 하나씩 고른 뒤, 함께하는 사람이 있다면 맡을 범위를 먼저 맞춰.',
  '함께 보내는 시간과 혼자 정리할 시간을 나누고, 전할 말은 짧고 다정하게 꺼내 봐.',
  '크게 그리고 있는 계획이 있다면 오늘 끝낼 수 있는 크기로 나누어 한 조각부터 남겨 봐.',
  '결정할 일이 있다면 판단 근거를 한 줄로 적고, 확인되지 않은 추측은 결정 기준에서 빼.',
  '움직이기 전 오늘의 우선순위를 하나 고르고, 일정 사이에 잠깐 숨을 고를 여유를 남겨 둬.',
  '누군가를 배려할 일이 있더라도 내 시간과 여건을 함께 살피고, 가능한 만큼을 분명히 말해.',
  '새로운 방법이 떠오르면 작은 범위에서 먼저 시험하고, 기존에 잘되던 방법과 차이를 비교해.',
  '마무리할 일의 기준을 미리 정한 뒤, 꼭 필요한 확인을 마쳤다면 다음 일정으로 넘어가.',
  '약속이 있다면 지킬 수 있는 범위를 먼저 확인하고, 상대의 몫까지 혼자 떠맡지는 마.',
  '오늘 누리고 싶은 즐거움 하나를 정하고, 시간과 예산 안에서 편안하게 즐길 자리를 남겨 둬.',
] as const
const RELATION_FOCUS: Record<TodayRelation, string> = {
  same: '잘되는 방식 유지', support: '확인한 뒤 실행', output: '생각을 결과로 표현',
  wealth: '조건을 분명히 정하기', pressure: '약속과 여유 함께 지키기',
}

function zodiacReading(birthYear: number, relation: TodayRelation): NonNullable<TodayFortune['reading']['zodiac']> {
  // Calendar-year label as in newspaper birth-year fortunes, NOT the saju year
  // pillar (which changes at 입춘). Do not silently assign January births last year's 띠.
  const index = ((birthYear - 4) % 12 + 12) % 12
  const animal = ZODIAC_ANIMALS[index]
  return {
    birthYear, animal, basis: 'birth-year',
    title: `${birthYear}년생 ${animal}띠 · 출생연도 기준`,
    text: `${birthYear}년생 ${animal}띠의 오늘 키워드는 ‘${RELATION_FOCUS[relation]}’야. ${ZODIAC_GUIDES[index]}`,
  }
}

function totalScore(details: Record<TodayDetailKey, TodayFortuneDetail>): number {
  return Math.round(
    details.work.score * 0.3
    + details.money.score * 0.25
    + details.relationship.score * 0.2
    + details.caution.score * 0.25,
  )
}

export function buildTodayFortune(profile: UserBirthProfile, now = new Date()): TodayFortune {
  const analysis = analyzeSaju(profile.birth)
  const kst = kstDateParts(now)
  const todayBirth: BirthInput = {
    year: kst.year,
    month: kst.month,
    day: kst.day,
    hour: 12,
    minute: 0,
    gender: profile.birth.gender,
    calendar: 'solar',
  }
  const todayPillars = calculateFourPillars(todayBirth)
  const todayStem = todayPillars.day.stem
  const todayBranch = todayPillars.day.branch
  const todayElement = STEM_ELEMENT[todayStem]
  const relation = relationFor(analysis.dayMasterElement, todayElement)
  const baseReading = relationText(relation, profile.name, todayElement)
  const details = buildReadingDetails(relation, baseReading)
  const reading: TodayFortune['reading'] = {
    ...baseReading,
    zodiac: zodiacReading(profile.birth.year, relation),
    score: {
      total: totalScore(details),
      work: details.work.score,
      money: details.money.score,
      relationship: details.relationship.score,
      caution: details.caution.score,
    },
    details,
  }

  return {
    date: {
      iso: kst.iso,
      label: kst.label,
    },
    profile: {
      name: profile.name,
      birth: profile.birth,
      birthTimeKnown: profile.birthTimeKnown,
    },
    user: {
      dayMaster: analysis.dayMaster,
      dayMasterKo: STEM_KO[analysis.dayMaster],
      dayMasterElement: ELEMENT_KO[analysis.dayMasterElement],
      dayPillar: `${analysis.fourPillars.day.stem}${analysis.fourPillars.day.branch}`,
      dayPillarKo: `${STEM_KO[analysis.fourPillars.day.stem]}${BRANCH_KO[analysis.fourPillars.day.branch]}`,
    },
    today: {
      pillar: `${todayStem}${todayBranch}`,
      pillarKo: `${STEM_KO[todayStem]}${BRANCH_KO[todayBranch]}`,
      element: ELEMENT_KO[todayElement],
      relation,
    },
    reading,
  }
}
