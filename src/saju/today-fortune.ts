import type { BirthInput, Element } from '../types/index.js'
import { analyzeSaju, calculateFourPillars, BRANCH_KO, ELEMENT_KO, STEM_ELEMENT, STEM_KO } from './analyzer.js'
import type { UserBirthProfile } from '../user/profile-store.js'

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
    relation: 'same' | 'support' | 'output' | 'wealth' | 'pressure' | 'balance'
  }
  reading: {
    title: string
    summary: string
    work: string
    money: string
    relationship: string
    caution: string
    action: string
  }
}

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

function relationFor(userElement: Element, todayElement: Element): TodayFortune['today']['relation'] {
  if (userElement === todayElement) return 'same'
  if (GENERATES[todayElement] === userElement) return 'support'
  if (GENERATES[userElement] === todayElement) return 'output'
  if (CONTROLS[userElement] === todayElement) return 'wealth'
  if (CONTROLS[todayElement] === userElement) return 'pressure'
  return 'balance'
}

function relationText(relation: TodayFortune['today']['relation'], userName: string, todayElementKo: string) {
  const name = userName || '자네'
  const table: Record<TodayFortune['today']['relation'], TodayFortune['reading']> = {
    same: {
      title: '내 페이스가 강하게 올라오는 날',
      summary: `${name}님 안의 기운과 오늘의 ${todayElementKo} 기운이 같은 방향으로 겹칩니다. 자신감은 좋지만, 혼자 결론을 너무 빨리 내리면 주변과 박자가 어긋날 수 있습니다.`,
      work: '이미 알고 있던 일을 밀어붙이기 좋습니다. 새 업무보다 보류된 결정, 정리, 확인에 힘을 쓰는 편이 낫습니다.',
      money: '큰 지출보다 기존 결제와 고정비를 점검하세요. 익숙한 소비 패턴에서 새는 구멍이 보일 수 있습니다.',
      relationship: '말을 아끼면 안정되고, 주도권을 세게 잡으면 부딪힙니다. 먼저 듣고 마지막에 정리하는 방식이 좋습니다.',
      caution: '확신이 강한 만큼 고집도 강해집니다. 오늘은 단정적인 약속과 즉흥 결정을 피하세요.',
      action: '오전에는 정리, 오후에는 실행. 할 일은 세 개 이하로 좁히세요.',
    },
    support: {
      title: '도움과 정보가 들어오는 날',
      summary: `오늘의 ${todayElementKo} 기운이 ${name}님을 받쳐주는 흐름입니다. 혼자 버티기보다 필요한 자료, 조언, 사람을 끌어오는 쪽이 유리합니다.`,
      work: '문서 검토, 학습, 기준 세우기에 좋습니다. 어려운 일은 바로 처리하기보다 근거를 모은 뒤 움직이세요.',
      money: '무리한 투자보다 정보 확인이 먼저입니다. 조건표, 약관, 수수료처럼 작은 글자를 보는 날입니다.',
      relationship: '연락을 먼저 열면 반응이 부드럽습니다. 부탁은 짧고 구체적으로 말하는 편이 좋습니다.',
      caution: '좋은 말만 듣고 판단하면 흐려집니다. 확인되지 않은 조언을 그대로 믿지 마세요.',
      action: '오늘 들어온 정보 하나를 기록하고, 내일 결정할 항목과 분리하세요.',
    },
    output: {
      title: '표현과 결과물이 드러나는 날',
      summary: `${name}님 안의 기운이 오늘의 ${todayElementKo} 흐름으로 새어 나옵니다. 말, 글, 제안, 발표처럼 밖으로 꺼내는 일이 운을 엽니다.`,
      work: '기획안, 메시지, 콘텐츠, 보고처럼 보이는 결과물을 만드는 데 힘이 붙습니다.',
      money: '수입보다 지출 충동이 먼저 올라올 수 있습니다. 필요한 소비와 기분 소비를 분리하세요.',
      relationship: '마음을 표현하기 좋지만 말이 길어지면 핵심이 흐려집니다. 짧게, 정확히 전하세요.',
      caution: '감정적으로 반응하면 말실수가 남습니다. 보내기 전 한 번 더 읽는 습관이 필요합니다.',
      action: '오늘 해야 할 말은 문장으로 먼저 적고, 그중 절반만 밖으로 꺼내세요.',
    },
    wealth: {
      title: '현실 감각과 성과를 잡는 날',
      summary: `${name}님이 오늘의 ${todayElementKo} 기운을 다루는 구조입니다. 돈, 조건, 결과처럼 현실적인 주제가 앞으로 나옵니다.`,
      work: '협상, 견적, 일정 확정, 업무 범위 정리에 좋습니다. 말보다 숫자와 기준표가 힘을 냅니다.',
      money: '수입 기회와 지출 판단이 함께 옵니다. 싸다고 사지 말고, 오래 쓸지부터 보세요.',
      relationship: '관계에서도 기대와 역할을 정리해야 합니다. 애매한 배려보다 선명한 합의가 낫습니다.',
      caution: '성과 욕심이 과하면 사람의 마음을 놓칠 수 있습니다. 이익만 보고 움직이지 마세요.',
      action: '금액, 시간, 책임 범위를 숫자로 적어 확인하세요.',
    },
    pressure: {
      title: '책임과 규칙이 강하게 들어오는 날',
      summary: `오늘의 ${todayElementKo} 기운이 ${name}님을 누르며 기준을 요구합니다. 답답해도 무너지는 날이 아니라 자세를 바로잡는 날입니다.`,
      work: '상사, 계약, 규정, 마감처럼 외부 기준을 맞추는 일이 중요합니다. 피하기보다 순서를 정해 처리하세요.',
      money: '충동 지출은 줄이고 납부일, 연체, 자동결제를 확인하세요. 돈보다 신뢰 관리가 먼저입니다.',
      relationship: '상대의 요구가 크게 느껴질 수 있습니다. 바로 반박하지 말고 요구의 핵심을 확인하세요.',
      caution: '압박을 피하려고 거짓 약속을 하면 일이 커집니다. 못 하는 것은 못 한다고 말해야 합니다.',
      action: '오늘 가장 부담되는 일 하나를 20분만 먼저 처리하세요.',
    },
    balance: {
      title: '균형을 다시 맞추는 날',
      summary: `${name}님과 오늘의 ${todayElementKo} 기운이 직접 부딪히기보다 옆에서 방향을 조정합니다. 속도보다 균형이 중요합니다.`,
      work: '새 시작보다 일정 조율과 우선순위 정리에 유리합니다. 밀린 연락을 정리하면 흐름이 풀립니다.',
      money: '큰 판단은 미루고 생활 지출의 균형을 맞추세요. 작은 절제가 오늘의 운을 살립니다.',
      relationship: '상대와 나의 속도가 다를 수 있습니다. 맞추려 애쓰기보다 차이를 인정하는 말이 좋습니다.',
      caution: '이도 저도 아닌 상태로 시간을 흘려보내기 쉽습니다. 기준 하나는 정해야 합니다.',
      action: '해야 할 일, 미룰 일, 버릴 일을 한 줄씩 나누세요.',
    },
  }
  return table[relation]
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
  const reading = relationText(relation, profile.name, ELEMENT_KO[todayElement])

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
