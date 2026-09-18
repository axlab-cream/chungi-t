export type PaymentProductKey =
  | 'cmdg'
  | 'love_this_year'
  | 'home_pungsu'
  | 'work_move'
  | 'work_job'
  | 'money_save'
  | 'marry_match'
  | 'match_couple'
  | 'love_mind'
  | 'love_again'
  | 'love_spouse'
  | 'pass_angle'
  | 'quit_fortune'
  | 'couple_signal'
  | 'job_choice'
  | 'cat_compatibility'
  | 'lucky_color'
  | 'newyear_flow'
  | 'wedding_day'

export interface PaymentProduct {
  key: PaymentProductKey
  title: string
  eyebrow: string
  amount: number
  returnPath: string
  summary: string
}

const products: Record<PaymentProductKey, PaymentProduct> = {
  cmdg: {
    key: 'cmdg',
    title: '천명사주',
    eyebrow: 'SIGNATURE · 종합사주',
    amount: 49900,
    returnPath: '/cmdg/',
    summary: '기질, 돈, 일, 관계, 큰 흐름을 한 번에 봅니다.',
  },
  love_this_year: {
    key: 'love_this_year',
    title: '올해 연애운',
    eyebrow: 'LOVE · 연애운',
    amount: 12900,
    returnPath: '/love/this-year',
    summary: '도화가 들어오는 시기와 놓치기 쉬운 타이밍을 봅니다.',
  },
  wedding_day: {
    key: 'wedding_day',
    title: '우리 결혼, 이날 해도 될까?',
    eyebrow: 'WEDDING DAY · 결혼택일',
    amount: 24900,
    returnPath: '/day/wedding',
    summary: '후보일마다 두 사람의 명식과 맞물리는 조건을 세어 비교합니다.',
  },
  newyear_flow: {
    key: 'newyear_flow',
    title: '내 2027년, 풀릴 각이야?',
    eyebrow: '2027 · 신년운세',
    amount: 19900,
    returnPath: '/flow/newyear',
    summary: '입춘 전환과 세운, 열두 달 월운으로 2027년 한 해의 결을 봅니다.',
  },
  home_pungsu: {
    key: 'home_pungsu',
    title: '집 풍수',
    eyebrow: 'PLACE · 집 풍수',
    amount: 19900,
    returnPath: '/place/home',
    summary: '주소와 사주 프로필을 겹쳐 지금 사는 집의 흐름을 봅니다.',
  },
  work_move: {
    key: 'work_move',
    title: '이직운',
    eyebrow: 'WORK · 이직운',
    amount: 14900,
    returnPath: '/work/move',
    summary: '대운, 세운, 관성으로 옮길 시기와 조건을 봅니다.',
  },
  work_job: {
    key: 'work_job',
    title: '직업운',
    eyebrow: 'DEEP · 직업운',
    amount: 14900,
    returnPath: '/work/job',
    summary: '관성, 식상, 적성으로 지금 일과 맞는 방식을 봅니다.',
  },
  quit_fortune: {
    key: 'quit_fortune',
    title: '퇴사운',
    eyebrow: 'WORK · 커리어',
    amount: 14900,
    // Step 04 is where the paid request resumes, so the PG returns straight to it.
    returnPath: '/work/quit/04-step-4-report/index.html',
    summary: '관성, 식상, 대운으로 나갈 흐름과 정리 순서를 봅니다.',
  },
  job_choice: {
    key: 'job_choice',
    title: '직장 선택',
    eyebrow: 'CAREER · 자미두수',
    amount: 9900,
    // Step 04 is where the paid request resumes, so the PG returns straight to it.
    returnPath: '/work/job-choice/04-step-4-report/index.html',
    summary: '관록·재백·노복·천이·복덕궁이 보는 자리를 내 원국에서 읽습니다.',
  },
  cat_compatibility: {
    key: 'cat_compatibility',
    title: '고양이 궁합',
    eyebrow: 'MATCH · 반려묘 궁합',
    amount: 9900,
    // Step 04 is where the paid request resumes, so the PG returns straight to it.
    returnPath: '/match/cat/04-step-4-report/index.html',
    summary: '집사 사주와 고양이 성향을 겹쳐 함께 사는 박자를 봅니다.',
  },
  lucky_color: {
    key: 'lucky_color',
    title: '나한테 운 붙는 색과 물건',
    eyebrow: 'LUCKY · 오행 생활 가이드',
    amount: 4900,
    // Step 04 is where the paid request resumes, so the PG returns straight to it.
    returnPath: '/me/lucky/04-step-4-report/index.html',
    summary: '오행에서 채울 기운과 덜어낼 기운을 색·소재·자리로 옮깁니다.',
  },
  money_save: {
    key: 'money_save',
    title: '소비성향',
    eyebrow: 'PREMIUM · 재물',
    amount: 9900,
    // Step 04 is where the paid request resumes, so the PG returns straight to it.
    returnPath: '/money/save/04-step-4-report/index.html',
    summary: '재성과 비겁으로 돈이 새는 패턴과 남기는 방식을 봅니다.',
  },
  marry_match: {
    key: 'marry_match',
    title: '결혼궁합',
    eyebrow: 'MATCH · 결혼궁합',
    amount: 24900,
    // Step 04 is where the paid request resumes, so the PG returns straight to it.
    returnPath: '/match/marry/04-step-4-report/index.html',
    summary: '배우자궁, 대운, 합충으로 결혼까지의 흐름을 봅니다.',
  },
  match_couple: {
    key: 'match_couple',
    title: '커플궁합',
    eyebrow: 'MATCH · 대표 궁합',
    amount: 19900,
    // Step 04 is where the paid request resumes, so the PG returns straight to it.
    returnPath: '/match/couple/04-step-4-report/index.html',
    summary: '명리궁합, 오행, 일지로 둘의 끌림과 갈등을 봅니다.',
  },
  couple_signal: {
    key: 'couple_signal',
    title: '내 애인 바람필까?',
    eyebrow: 'SECRET · 연애',
    amount: 19900,
    // Step 04 is where the paid request resumes, so the PG returns straight to it.
    returnPath: '/love/signal/04-step-4-report/index.html',
    summary: '도화, 배우자성, 합충으로 지금 관계의 신호를 봅니다.',
  },
  love_mind: {
    key: 'love_mind',
    title: '상대방 마음',
    eyebrow: 'LOVE · 상대방 마음',
    amount: 9900,
    returnPath: '/love/mind',
    summary: '궁합과 관계 흐름으로 지금 확인할 기준을 봅니다.',
  },
  love_again: {
    key: 'love_again',
    title: '재회운',
    eyebrow: 'LOVE · 재회운',
    amount: 12900,
    returnPath: '/love/again',
    summary: '세운, 궁합, 관계 흐름으로 다시 이어질 가능성을 봅니다.',
  },
  love_spouse: {
    key: 'love_spouse',
    title: '배우자운',
    eyebrow: 'LOVE · 배우자운',
    amount: 14900,
    returnPath: '/love/spouse',
    summary: '배우자궁과 자미두수로 만남의 결을 봅니다.',
  },
  pass_angle: {
    key: 'pass_angle',
    title: '나, 붙을 각이야?',
    eyebrow: 'EXAM · 합격운',
    amount: 9900,
    returnPath: '/me/pass-angle',
    summary: '인성, 관성, 세운으로 시험 흐름과 공부 전략을 봅니다.',
  },
}

export function getPaymentProduct(value: unknown): PaymentProduct | undefined {
  const key = canonicalPaymentProductKey(value)
  return key ? products[key] : undefined
}

export function listPaymentProducts(): PaymentProduct[] {
  return Object.values(products)
}

export function publicPaymentProduct(product: PaymentProduct): Omit<PaymentProduct, 'key'> & { key: PaymentProductKey } {
  return { ...product }
}

/**
 * HTML 시드·구 주소가 카탈로그 키와 다른 이름으로 결제창에 들어온다.
 * 조회는 여기서만 정규화한다. 페이지마다 키를 고치면 세션 저장 이름과 어긋난다.
 */
export const PAYMENT_PRODUCT_ALIASES: Record<string, PaymentProductKey> = {
  save: 'money_save',
  money: 'money_save',
  couple_match: 'match_couple',
  couple: 'match_couple',
  love_thisyear: 'love_this_year',
  thisyear: 'love_this_year',
  marriage_compatibility: 'marry_match',
  marry: 'marry_match',
  home_fit: 'home_pungsu',
  home: 'home_pungsu',
  pass_angle_exam: 'pass_angle',
  saju_master: 'cmdg',
  cheongi: 'cmdg',
  quit: 'quit_fortune',
  cat: 'cat_compatibility',
  signal: 'couple_signal',
  love_signal: 'couple_signal',
  jobchoice: 'job_choice',
  'job-choice': 'job_choice',
}

export const PAYMENT_PATH_PREFIXES: Array<[string, PaymentProductKey]> = [
  ['/money/save', 'money_save'],
  ['/match/couple', 'match_couple'],
  ['/match/marry', 'marry_match'],
  ['/match/cat', 'cat_compatibility'],
  ['/love/this-year', 'love_this_year'],
  ['/love/signal', 'couple_signal'],
  ['/love/mind', 'love_mind'],
  ['/love/again', 'love_again'],
  ['/love/spouse', 'love_spouse'],
  ['/work/job-choice', 'job_choice'],
  ['/work/quit', 'quit_fortune'],
  ['/work/move', 'work_move'],
  ['/work/job', 'work_job'],
  ['/place/home', 'home_pungsu'],
  ['/me/lucky', 'lucky_color'],
  ['/me/pass-angle', 'pass_angle'],
  ['/flow/newyear', 'newyear_flow'],
  ['/day/wedding', 'wedding_day'],
  ['/cmdg', 'cmdg'],
]

export function canonicalPaymentProductKey(value: unknown): PaymentProductKey | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed in products) return trimmed as PaymentProductKey
  return PAYMENT_PRODUCT_ALIASES[trimmed]
}

export function paymentProductKeyFromPath(path: unknown): PaymentProductKey | undefined {
  if (typeof path !== 'string' || !path) return undefined
  let pathname = path
  try {
    pathname = path.startsWith('http') ? new URL(path).pathname : path.split('?')[0]
  } catch {
    pathname = path.split('?')[0]
  }
  return PAYMENT_PATH_PREFIXES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1]
}
