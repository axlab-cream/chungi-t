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
    returnPath: '/match/couple',
    summary: '명리궁합, 오행, 일지로 둘의 끌림과 갈등을 봅니다.',
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
  if (typeof value !== 'string') return undefined
  return products[value.trim() as PaymentProductKey]
}

export function listPaymentProducts(): PaymentProduct[] {
  return Object.values(products)
}

export function publicPaymentProduct(product: PaymentProduct): Omit<PaymentProduct, 'key'> & { key: PaymentProductKey } {
  return { ...product }
}
