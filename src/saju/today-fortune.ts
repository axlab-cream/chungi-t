import type { BirthInput, EarthlyBranch, Element, HeavenlyStem } from '../types/index.js'
import { analyzeSaju, calculateFourPillars, BRANCH_KO, ELEMENT_KO, STEM_ELEMENT, STEM_KO } from './analyzer.js'
import { BRANCH_ELEMENT } from './analyzer-helpers.js'
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

/*
 * 하루의 결은 천간(오행 관계) 하나로 끝나지 않는다. 2026-09-17 갑오(甲午)일과 09-18 을미(乙未)일은
 * 둘 다 목(木)이라 위 표만 쓰면 제목부터 본문까지 글자 하나 다르지 않았다("어제와 오늘이 왜
 * 같아?"). 그래서 두 축을 더 본다 —
 *  - 천간의 음양: 양(甲丙戊庚壬)은 밖으로 뻗는 날, 음(乙丁己辛癸)은 안으로 다듬는 날. 제목과 요약이
 *    갈린다.
 *  - 지지(12): 그날의 장면을 정한다. 네 본문의 둘째 문장과 결론의 둘째 문장을 지지가 바꾼다.
 *  점수도 지지의 오행이 태어난 날의 중심 기운과 맺는 관계로 조금씩 움직인다.
 * 사흘 연속 같은 오행이 와도 음양·지지가 함께 겹칠 일은 없으므로 매일 다른 글이 된다.
 */
type StemPolarity = '양' | '음'
const STEM_POLARITY: Record<HeavenlyStem, StemPolarity> = {
  '甲': '양', '乙': '음', '丙': '양', '丁': '음', '戊': '양', '己': '음', '庚': '양', '辛': '음', '壬': '양', '癸': '음',
}
const POLARITY_PHRASE: Record<StemPolarity, string> = {
  양: '기운이 밖으로 뻗는 날이라',
  음: '기운이 안으로 고이는 날이라',
}
const TITLE_BY_POLARITY: Record<TodayRelation, Record<StemPolarity, string>> = {
  same: { 양: '잘되는 방식을 내 편으로 만드는 날', 음: '익숙한 방식을 조용히 다듬는 날' },
  support: { 양: '좋은 정보를 내 판단으로 바꾸는 날', 음: '들은 이야기를 내 것으로 삭이는 날' },
  output: { 양: '생각을 눈에 보이는 한 가지로 만드는 날', 음: '만들어 둔 것을 한 번 더 손보는 날' },
  wealth: { 양: '막연한 기대를 분명한 조건으로 바꾸는 날', 음: '가진 것의 쓰임을 다시 세어 보는 날' },
  pressure: { 양: '해야 할 일을 정하고 내 여유를 지키는 날', 음: '맡은 일의 끝을 정하고 숨을 고르는 날' },
}

/**
 * 지지별 장면. 각 본문의 둘째 문장(구체 장면)과 결론의 둘째 문장을 갈아 끼운다. 첫 문장(방향)과
 * 셋째 문장(평온할 때의 기준)은 오행 관계 표의 것을 그대로 쓴다 — 셋째 문장이 "괜찮은 날엔
 * 괜찮다"는 안전장치라서 지지가 건드리지 않는다.
 */
interface BranchScene { work: string; money: string; relationship: string; caution: string; action: string }
const BRANCH_SCENES: Record<EarthlyBranch, BranchScene> = {
  '子': {
    work: '오늘은 늦은 시간에 정신이 맑아지는 날이니, 낮에 흩어진 메모를 저녁에 한 장으로 모아 내일 첫 일을 정해 둬.',
    money: '가계부나 결제 내역을 열어 이번 주에 빠져나간 돈을 한 번 훑고, 잊고 있던 자동 결제가 있는지만 확인해.',
    relationship: '길게 이어진 대화 창이 있다면 오늘은 답을 급히 보내기보다 상대 말을 한 번 더 읽고 짧게 답해.',
    caution: '밤에 내리는 결정은 아침에 한 번 더 읽어 볼 것으로 두고, 오늘은 결론을 기록만 해 둬.',
    action: '잠들기 전 내일 첫 일 하나를 적어 두면 오늘 흐름은 충분히 마무리돼.',
  },
  '丑': {
    work: '쌓아 둔 자료나 파일 가운데 오늘 쓸 것 하나만 꺼내 정리하고, 나머지는 자리만 표시해 둬.',
    money: '통장이나 앱에 남은 잔액을 확인하고, 이달 남은 고정 지출을 한 줄로 적어 두면 충분해.',
    relationship: '오래 미룬 연락 하나가 있다면 긴 설명 대신 안부 한 줄로 시작해 봐.',
    caution: '한 번에 다 치우려는 마음이 들면 서랍 하나만큼으로 범위를 줄여 오늘 몫만 끝내.',
    action: '정리할 것 가운데 하나를 골라 끝까지 치우고 나머지는 내일로 넘겨.',
  },
  '寅': {
    work: '아침 첫 시간에 가장 어려운 일을 먼저 열고, 시작만 해 두면 오후는 이어 가기가 쉬워져.',
    money: '새로 시작할 소비나 구독이 있다면 첫 달 비용과 해지 조건을 오늘 안에 적어 둬.',
    relationship: '먼저 인사를 건네야 하는 자리가 있다면 오늘 아침에 짧게 시작해 봐.',
    caution: '의욕이 앞서 일을 여러 개 동시에 열지 말고, 시작한 일 하나가 자리 잡는지 먼저 봐.',
    action: '가장 미루던 일의 첫 단계를 오늘 오전에 열어 두면 이 날의 결론은 지켜져.',
  },
  '卯': {
    work: '큰 그림보다 세부 항목을 다듬는 날이니, 문서나 작업물의 오탈자와 빠진 칸을 한 번 훑어.',
    money: '작은 지출이 자주 나가는 날이니, 오늘 산 것을 저녁에 세 줄로만 적어 봐.',
    relationship: '상대의 짧은 말이나 표정에서 놓친 신호가 있었는지 오늘은 한 번 되짚어 봐.',
    caution: '작은 일을 붙잡고 오래 고치다 큰 마감을 놓치지 않게, 손볼 시간을 미리 정해 둬.',
    action: '눈에 띈 작은 빈틈 하나를 오늘 안에 채우고 그 자리에서 손을 멈춰.',
  },
  '辰': {
    work: '사람들과 맞춰야 하는 일이 있다면 오늘 회의나 대화에서 결정할 항목을 세 개 안으로 줄여 가.',
    money: '함께 쓰는 돈이나 나눠 낼 비용이 있다면 오늘 누가 얼마를 내는지 문장으로 정해 둬.',
    relationship: '여러 사람이 얽힌 약속이 있다면 시간과 장소를 먼저 확정하고 세부는 뒤에 맞춰.',
    caution: '의견이 갈릴 때 중간에서 모두 맞추려다 결정을 미루지 말고, 오늘 정할 것 하나만 정해.',
    action: '함께 정할 일 가운데 하나를 오늘 확정 문장으로 남겨 두면 이어지는 일이 가벼워져.',
  },
  '巳': {
    work: '말로 설명해야 하는 일이 있다면 핵심 한 줄을 먼저 쓰고, 그 문장으로 대화를 시작해.',
    money: '광고나 추천에 눈이 가는 날이니, 사고 싶은 것이 생기면 장바구니에 하루 두고 내일 다시 봐.',
    relationship: '표현이 잘 나오는 날이니, 고마운 사람에게 이유를 붙여 한 줄 전해 봐.',
    caution: '말이 앞서기 쉬운 날이니, 중요한 메시지는 보내기 전에 소리 내어 한 번 읽어 봐.',
    action: '전하려던 말 하나를 핵심 한 줄로 다듬어 오늘 안에 보내면 결론이 지켜져.',
  },
  '午': {
    work: '한낮에 집중이 가장 잘 되는 날이니, 점심 전후 두 시간에 가장 중요한 작업을 몰아 둬.',
    money: '점심이나 모임 비용처럼 낮에 나가는 돈이 많은 날이니, 예산 한도를 정해 두고 움직여.',
    relationship: '대화가 활발한 날이니, 함께 있는 자리에서는 듣는 시간을 말하는 시간만큼 남겨.',
    caution: '열기가 오르면 결정이 빨라지니, 오후에 정한 일은 저녁에 한 번 다시 읽어 봐.',
    action: '가장 밝은 시간대에 중요한 일 하나를 끝내고, 저녁에는 그 결과만 확인해.',
  },
  '未': {
    work: '마무리에 힘이 붙는 날이니, 거의 끝난 일의 마지막 한 단계를 오늘 닫아.',
    money: '이달 지출을 정리하기 좋은 날이니, 남은 예산으로 월말까지 버틸 수 있는지 한 번 계산해.',
    relationship: '오래 함께한 사람과의 관계에서는 새 약속보다 지켜 온 약속 하나를 챙겨.',
    caution: '마무리하려다 서둘러 빠뜨리는 것이 없게, 끝낼 일의 확인 항목을 세 개만 적어 둬.',
    action: '거의 끝난 일 하나를 완전히 닫고 그 결과를 기록해 두면 오늘은 충분해.',
  },
  '申': {
    work: '기준을 세우기 좋은 날이니, 진행 중인 일의 완료 조건을 문장으로 적어 팀이나 자신에게 공유해.',
    money: '지출 기준을 손보는 날이니, 카드 한도나 저축 비율처럼 숫자 하나를 오늘 정해 둬.',
    relationship: '부탁을 받거나 할 일이 있다면 가능한 범위를 먼저 정한 뒤 말해.',
    caution: '기준이 분명해지는 날이라 남의 방식이 거슬릴 수 있으니, 내 기준은 내 일에만 적용해.',
    action: '오늘 세운 기준 하나를 문장으로 적어 두고 그 기준대로 한 가지를 결정해.',
  },
  '酉': {
    work: '검토가 잘 되는 날이니, 보내기 전 자료를 다른 사람 눈으로 읽듯 한 번 훑어 고쳐.',
    money: '지난 결제 가운데 잘못 나간 것이 없는지 영수증이나 내역을 한 번 대조해 봐.',
    relationship: '오해가 생겼던 대화가 있다면 오늘은 사실 확인 질문 하나로 매듭을 풀어.',
    caution: '고칠 곳이 잘 보이는 날이라 지적이 늘 수 있으니, 말하기 전에 꼭 필요한 것인지 골라.',
    action: '보낼 것 하나를 다시 읽고 고친 뒤 내보내면 오늘의 결론은 지켜져.',
  },
  '戌': {
    work: '지키는 힘이 강한 날이니, 이미 정한 일정과 약속을 흔들지 말고 순서대로 소화해.',
    money: '비상금이나 예비 예산이 제자리에 있는지 확인하고, 없다면 첫 금액만 정해 둬.',
    relationship: '믿는 사람과의 약속 하나를 챙기고, 새로운 관계는 서두르지 않아도 돼.',
    caution: '지키려는 마음이 고집으로 굳지 않게, 바뀐 조건이 있으면 그 부분만 열어 다시 봐.',
    action: '정해 둔 약속 하나를 그대로 지켜 내면 오늘 흐름은 제 몫을 한 거야.',
  },
  '亥': {
    work: '정보가 잘 들어오는 날이니, 막힌 일에 필요한 자료 하나를 찾아 읽고 요점만 남겨.',
    money: '돈 흐름을 넓게 보는 날이니, 이번 달 들어온 돈과 나간 돈을 한 줄씩 나란히 적어 봐.',
    relationship: '상대의 사정을 짐작하기보다 오늘은 물어보는 쪽을 택해 봐.',
    caution: '정보가 많아지면 결정이 흐려지니, 오늘 알게 된 것 가운데 결정에 필요한 것만 남겨.',
    action: '찾은 정보 가운데 하나를 실제 행동으로 옮겨 두면 오늘은 정리돼.',
  },
}

/** 문장을 마침표 단위로 나눈다. 본문은 세 문장, 결론은 두 문장으로 고정돼 있다. */
function sentencesOf(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean)
}

function withScene(text: string, scene: string, index: number): string {
  const parts = sentencesOf(text)
  if (parts.length <= index) return text
  parts[index] = scene
  return parts.join(' ')
}

function composeReading(
  base: BaseTodayReading,
  relation: TodayRelation,
  stem: HeavenlyStem,
  branch: EarthlyBranch,
  pillarKo: string,
  pillar: string,
): BaseTodayReading {
  const polarity = STEM_POLARITY[stem]
  const scene = BRANCH_SCENES[branch]
  const summaryParts = sentencesOf(base.summary)
  summaryParts[0] = `${pillarKo}(${pillar})일, ${polarity}의 ${ELEMENT_KO[STEM_ELEMENT[stem]]} ${POLARITY_PHRASE[polarity]} ${summaryParts[0].replace(/^오늘은 /, '')}`
  return {
    title: TITLE_BY_POLARITY[relation][polarity],
    summary: summaryParts.join(' '),
    work: withScene(base.work, scene.work, 1),
    money: withScene(base.money, scene.money, 1),
    relationship: withScene(base.relationship, scene.relationship, 1),
    caution: withScene(base.caution, scene.caution, 1),
    action: withScene(base.action, scene.action, 1),
  }
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

/** 지지의 오행이 중심 기운과 맺는 관계로 무게를 조금 움직인다. 상징 표시일 뿐 측정값이 아니다. */
const BRANCH_RELATION_SHIFT: Record<TodayRelation, Partial<Record<TodayDetailKey, number>>> = {
  same: { work: 3, relationship: 2 },
  support: { relationship: 4, caution: 3 },
  output: { work: 4, caution: -3 },
  wealth: { money: 5 },
  pressure: { caution: -4, work: -2 },
}

function clampScore(value: number): number {
  return Math.min(95, Math.max(35, value))
}

function buildReadingDetails(
  relation: TodayRelation,
  reading: BaseTodayReading,
  branchRelation: TodayRelation,
  polarity: StemPolarity,
): Record<TodayDetailKey, TodayFortuneDetail> {
  const weights = LEGACY_DISPLAY_WEIGHTS[relation]
  const shift = BRANCH_RELATION_SHIFT[branchRelation]
  const score = (key: TodayDetailKey) => clampScore(
    weights[key] + (shift[key] ?? 0) + (polarity === '양' && key === 'work' ? 1 : 0) + (polarity === '음' && key === 'caution' ? 1 : 0),
  )
  return {
    work: { text: reading.work, score: score('work') },
    money: { text: reading.money, score: score('money') },
    relationship: { text: reading.relationship, score: score('relationship') },
    caution: { text: reading.caution, score: score('caution') },
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
  const branchRelation = relationFor(analysis.dayMasterElement, BRANCH_ELEMENT[todayBranch])
  const baseReading = composeReading(
    relationText(relation, profile.name, todayElement),
    relation, todayStem, todayBranch,
    `${STEM_KO[todayStem]}${BRANCH_KO[todayBranch]}`, `${todayStem}${todayBranch}`,
  )
  const details = buildReadingDetails(relation, baseReading, branchRelation, STEM_POLARITY[todayStem])
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
