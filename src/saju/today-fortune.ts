import type { BirthInput, Element } from '../types/index.js'
import { analyzeSaju, calculateFourPillars, BRANCH_KO, ELEMENT_KO, STEM_ELEMENT, STEM_KO } from './analyzer.js'
import type { UserBirthProfile } from '../user/profile-store.js'

type TodayRelation = 'same' | 'support' | 'output' | 'wealth' | 'pressure' | 'balance'
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
  return 'balance'
}

function relationText(relation: TodayRelation, userName: string, todayElementKo: string): BaseTodayReading {
  const name = userName || '이용자'
  const table: Record<TodayRelation, BaseTodayReading> = {
same: { title: "내 방식을 점검하는 하루", summary: `${name}님, 오늘의 ${todayElementKo} 기운과 일간의 관계는 익숙한 방식이 도움이 되는지 살펴보는 상징입니다. 실제 사건이나 상대 반응을 예측한 결과는 아닙니다.`, work: "이미 익숙한 일이 있다면 그 방법을 재사용해 보세요.", money: "지출 문제가 없다면 현재 예산을 유지해도 좋습니다.", relationship: "함께 결정할 일이 있다면 서로의 의견을 확인하세요.", caution: "실제로 의견이 다를 때만 조정이 필요합니다.", action: "이미 잘되는 일 하나의 방법을 기록해 보세요." },
support: { title: "필요한 도움을 살피는 하루", summary: `${name}님, 오늘의 ${todayElementKo} 기운과 일간의 관계는 정보와 배움을 떠올려 보는 상징입니다. 실제 사건이나 상대 반응을 예측한 결과는 아닙니다.`, work: "막히는 일이 있다면 필요한 자료를 하나 확인하세요.", money: "금액을 결정할 일이 있을 때 조건과 비용을 확인하세요.", relationship: "연락이 허용된 관계에서 필요한 요청을 짧게 말해볼 수 있습니다.", caution: "좋게 들리는 조언도 내 상황에 맞는지는 따로 확인하세요.", action: "오늘 필요한 정보가 있다면 한 가지만 찾아보세요." },
output: { title: "표현을 정리하는 하루", summary: `${name}님, 오늘의 ${todayElementKo} 기운과 일간의 관계는 생각을 밖으로 표현하는 방식을 살피는 상징입니다. 실제 사건이나 상대 반응을 예측한 결과는 아닙니다.`, work: "결과물을 만들어야 한다면 핵심 메시지부터 정리하세요.", money: "사고 싶은 것이 생겼을 때만 필요성과 사용 계획을 비교하세요.", relationship: "전할 말이 있다면 관찰한 사실과 내 요청을 구분해 보세요.", caution: "감정이 격해졌을 때는 전송 전에 다시 읽는 방법이 있습니다.", action: "필요한 말 하나를 짧고 분명하게 적어보세요." },
wealth: { title: "현실 조건을 확인하는 하루", summary: `${name}님, 오늘의 ${todayElementKo} 기운과 일간의 관계는 자원과 결과의 조건을 살피는 상징입니다. 실제 사건이나 상대 반응을 예측한 결과는 아닙니다.`, work: "협의할 일이 있다면 범위와 마감을 확인하세요.", money: "수입이나 지출 일정이 있다면 확정된 조건을 구분하세요.", relationship: "역할을 나눌 일이 있다면 서로 가능한 범위를 이야기하세요.", caution: "성과 때문에 부담이 생긴 경우에만 기대를 조정하세요.", action: "지금 결정할 일이 있다면 필요한 조건을 한 줄로 적으세요." },
pressure: { title: "책임의 범위를 살피는 하루", summary: `${name}님, 오늘의 ${todayElementKo} 기운과 일간의 관계는 규칙과 약속을 돌아보는 상징입니다. 실제 사건이나 상대 반응을 예측한 결과는 아닙니다.`, work: "실제 마감이나 규정이 있다면 필요한 순서를 정하세요.", money: "예정된 납부나 자동결제가 있다면 이미 확인했는지 살펴보세요.", relationship: "요청을 받았다면 가능한 범위와 어려운 점을 구분해 말하세요.", caution: "일이 순조롭다면 압박이나 위기가 있다고 해석할 필요는 없습니다.", action: "오늘 맡은 일이 있다면 완료 기준 한 가지를 확인하세요." },
balance: { title: "현재 균형을 살피는 하루", summary: `${name}님, 오늘의 ${todayElementKo} 기운과 일간의 관계는 속도와 우선순위를 비교하는 상징입니다. 실제 사건이나 상대 반응을 예측한 결과는 아닙니다.`, work: "일정이 겹칠 때만 중요도에 따라 조정하세요.", money: "현재 지출 관리가 잘된다면 불필요하게 더 줄일 필요는 없습니다.", relationship: "서로의 속도가 다를 때는 맞출 수 있는 범위를 확인하세요.", caution: "별다른 불편이 없다면 현재 방식을 유지해도 괜찮습니다.", action: "바꿀 것보다 유지하고 싶은 것 하나를 골라보세요." }
  }
  return table[relation]
}

const DETAIL_HINTS: Record<TodayRelation, Record<TodayDetailKey, Omit<TodayFortuneDetail, 'text'>>> = {
  same: {
    work: { score: 78, opportunity: '밀린 결정을 정리하면 체감 성과가 빠르게 납니다.', caution: '혼자 확정하기 전 확인자를 한 명 두세요.' },
    money: { score: 62, caution: '익숙한 지출이라도 자동 결제와 반복 구매를 다시 보세요.' },
    relationship: { score: 58, caution: '주도권을 세게 잡으면 대화가 막힐 수 있습니다.' },
    caution: { score: 54, caution: '즉흥 약속과 단정적인 답변은 오늘 운을 깎습니다.' },
  },
  support: {
    work: { score: 82, opportunity: '자료와 조언을 모으면 내일 결정의 정확도가 올라갑니다.' },
    money: { score: 70, opportunity: '조건표나 약관에서 비용을 줄일 단서가 보입니다.', caution: '확인되지 않은 추천은 바로 실행하지 마세요.' },
    relationship: { score: 76, opportunity: '짧고 구체적인 부탁은 도움으로 이어질 가능성이 큽니다.' },
    caution: { score: 68, caution: '좋은 말만 듣고 판단하면 기준이 흐려질 수 있습니다.' },
  },
  output: {
    work: { score: 84, opportunity: '제안서, 메시지, 발표처럼 밖으로 보이는 일이 잘 풀립니다.' },
    money: { score: 62, caution: '기분 소비가 먼저 올라올 수 있으니 결제 전 시간을 두세요.' },
    relationship: { score: 74, opportunity: '마음을 짧고 정확하게 전하면 반응이 부드럽습니다.', caution: '말이 길어지면 핵심이 흐려집니다.' },
    caution: { score: 60, caution: '보내기 전 한 번 더 읽는 습관이 필요합니다.' },
  },
  wealth: {
    work: { score: 86, opportunity: '협상, 견적, 일정 확정처럼 숫자로 정리되는 일이 유리합니다.' },
    money: { score: 82, opportunity: '수입과 지출을 함께 보면 남길 수 있는 조건이 보입니다.', caution: '싸다는 이유만으로 구매하지 마세요.' },
    relationship: { score: 68, opportunity: '역할과 기대치를 정리하면 관계 피로가 줄어듭니다.' },
    caution: { score: 60, caution: '이익만 보고 움직이면 사람의 마음을 놓칠 수 있습니다.' },
  },
  pressure: {
    work: { score: 64, opportunity: '부담되는 일을 먼저 처리하면 오후 흐름이 가벼워집니다.', caution: '마감과 규정은 미루지 않는 편이 낫습니다.' },
    money: { score: 58, caution: '납부일, 연체, 자동결제부터 확인하세요.' },
    relationship: { score: 61, caution: '상대 요구에 바로 반박하면 감정이 먼저 커질 수 있습니다.' },
    caution: { score: 52, caution: '못 하는 약속을 하면 일이 커집니다.' },
  },
  balance: {
    work: { score: 72, opportunity: '우선순위를 다시 잡으면 밀린 일이 움직입니다.' },
    money: { score: 66, caution: '큰 판단은 미루고 생활 지출 균형부터 맞추세요.' },
    relationship: { score: 70, opportunity: '속도 차이를 인정하는 말이 관계를 부드럽게 합니다.' },
    caution: { score: 74, caution: '기준 없이 시간을 흘려보내지 마세요.' },
  },
}

function buildReadingDetails(relation: TodayRelation, reading: BaseTodayReading): Record<TodayDetailKey, TodayFortuneDetail> {
  const hints = DETAIL_HINTS[relation]
  return {
    work: { text: reading.work, score: hints.work.score },
    money: { text: reading.money, score: hints.money.score },
    relationship: { text: reading.relationship, score: hints.relationship.score },
    caution: { text: reading.caution, score: hints.caution.score },
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
  const baseReading = relationText(relation, profile.name, ELEMENT_KO[todayElement])
  const details = buildReadingDetails(relation, baseReading)
  const reading: TodayFortune['reading'] = {
    ...baseReading,
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
