import { getPaymentProduct, type PaymentProductKey } from '../payment/catalog.js'

/**
 * The list the 검색 page renders, and the map the 보관함 uses to send a saved reading
 * back to the service it came from.
 *
 * The catalog owns the title and the price; a product's `returnPath` points at the step
 * the PG comes back to, which is not where a visitor should start. So the entry path,
 * the thumbnail and the one-line copy live here, next to each other, and everything else
 * is read from the catalog so the two can never disagree on price.
 */
export interface ServiceDirectoryEntry {
  key: PaymentProductKey
  title: string
  tagline: string
  category: string
  href: string
  image: string
  amount: number
}

interface DirectorySeed {
  key: PaymentProductKey
  tagline: string
  category: string
  href: string
  image: string
  /** A service that is built but deliberately not listed yet. */
  hidden?: boolean
}

const SEEDS: DirectorySeed[] = [
  { key: 'cmdg', tagline: '내 인생, 원래 이런 팔자야?', category: '종합', href: '/cmdg/', image: '/assets/umsh-cmdg-card-bg.webp' },
  { key: 'love_this_year', tagline: '도화가 들어오는 달과 놓치는 타이밍', category: '연애', href: '/love/this-year', image: '/assets/umsh-thisyear-card-bg.webp' },
  { key: 'job_choice', tagline: '관록·재백궁으로 보는 이 회사와 나의 결', category: '직업', href: '/work/job-choice', image: '/assets/umsh-jobchoice-card-bg.webp' },
  { key: 'cat_compatibility', tagline: '집사 사주와 고양이 성향을 겹쳐서', category: '궁합', href: '/match/cat', image: '/assets/umsh-petmatch-card-bg.webp' },
  { key: 'lucky_color', tagline: '채울 색과 덜어낼 색, 지니면 좋은 것까지', category: '흐름', href: '/me/lucky', image: '/assets/umsh-luckycolor-card-bg.webp' },
  { key: 'match_couple', tagline: '끌림, 갈등, 오래 가는 방식까지', category: '궁합', href: '/match/couple', image: '/match/couple/assets/couple/01-scene-01-hook.webp' },
  { key: 'marry_match', tagline: '연애 말고 결혼까지 갈 수 있는 사이인지', category: '궁합', href: '/match/marry', image: '/match/marry/assets/marry/01-scene-01-hero.webp' },
  { key: 'couple_signal', tagline: '연락, 약속, 표현의 온도 차이를 나눠서', category: '연애', href: '/love/signal', image: '/assets/umsh-affair-card-bg.png' },
  { key: 'quit_fortune', tagline: '관성·식상·대운으로 나갈 흐름을 보고', category: '직업', href: '/work/quit', image: '/assets/umsh-quit-card-bg.png' },
  { key: 'pass_angle', tagline: '준비 흐름과 시험 구간을 함께', category: '직업', href: '/me/pass-angle', image: '/assets/umsh-exam-card-bg.png' },
  { key: 'money_save', tagline: '돈이 모이지 않는 자리를 먼저 찾고', category: '재물', href: '/money/save', image: '/assets/umsh-money-card-bg.png' },
  { key: 'work_move', tagline: '옮길 자리와 남을 자리를 가르고', category: '직업', href: '/work/move', image: '/work/move/assets/generated/move/01-scene-01-question.webp' },
  // 아래는 서비스는 살아 있지만 자기 썸네일이 없어 목록에서 빼 둔다. 같은 그림을 돌려
  // 쓰면 검색 화면에 똑같은 카드가 여러 장 뜬다: /work/job, /love/mind, /love/again,
  // /love/spouse, /place/home. 전용 아트워크가 생기면 hidden만 지우면 된다.
  { key: 'work_job', tagline: '관성, 식상, 적성으로 보는 지금 일', category: '직업', href: '/work/job', image: '', hidden: true },
  { key: 'love_mind', tagline: '그 사람도 나를 생각할까', category: '연애', href: '/love/mind', image: '', hidden: true },
  { key: 'love_again', tagline: '그 사람, 다시 돌아올까', category: '연애', href: '/love/again', image: '', hidden: true },
  { key: 'love_spouse', tagline: '내가 결혼하게 될 사람', category: '연애', href: '/love/spouse', image: '', hidden: true },
  { key: 'home_pungsu', tagline: '공간의 기운과 내 명리를 겹쳐서', category: '풍수', href: '/place/home', image: '/assets/umsh-place-card-bg.webp', hidden: true },
]

export function listServiceDirectory(): ServiceDirectoryEntry[] {
  const entries: ServiceDirectoryEntry[] = []
  for (const seed of SEEDS) {
    if (seed.hidden) continue
    const product = getPaymentProduct(seed.key)
    if (!product) continue
    entries.push({
      key: seed.key,
      title: product.title,
      tagline: seed.tagline,
      category: seed.category,
      href: seed.href,
      image: seed.image,
      amount: product.amount,
    })
  }
  return entries
}

/** Where a saved reading should reopen, looked up by the report's own serviceKey. */
export function serviceHrefForKey(serviceKey: string | undefined): string | undefined {
  if (!serviceKey) return undefined
  const aliases: Record<string, PaymentProductKey> = {
    home_fit: 'home_pungsu',
    home: 'home_pungsu',
  }
  const key = aliases[serviceKey] || (serviceKey as PaymentProductKey)
  return SEEDS.find((seed) => seed.key === key)?.href
}
