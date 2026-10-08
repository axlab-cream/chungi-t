import { opsBase, opsHeaders, opsStoreAvailable } from '../admin/ops-queue.js'
import soloNaraSpec from '../../data/solo-nara-spec.json' with { type: 'json' }

/**
 * 퍼널 이벤트 적재와 집계.
 *
 * 브라우저가 Supabase 에 직접 쓰지 않는다. 여기를 거쳐야 검증·정규화·한도가 한 곳에
 * 걸리고, 개인정보가 섞여 들어오는 것도 여기서 막을 수 있다.
 */

export const FUNNEL_EVENTS = ['step_view', 'cta_click'] as const
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number]

export interface FunnelEventInput {
  event: string
  serviceKey?: string
  step?: string
  target?: string
  route?: string
}

export interface StoredFunnelEvent {
  event: FunnelEvent
  service_key: string | null
  step: string | null
  target: string | null
  session_id: string
  user_id: string | null
  route: string | null
}

/** 한 번에 받는 이벤트 수. 이보다 많이 보내면 앞에서 자른다. */
export const FUNNEL_BATCH_LIMIT = 20
const FIELD_LIMIT = 80
const ROUTE_LIMIT = 120

function clean(value: unknown, limit: number): string | null {
  if (typeof value !== 'string') return null
  // 줄바꿈·제어문자는 통계 값에 들어올 이유가 없다. 로그를 오염시키는 통로가 된다.
  const text = value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim()
  return text ? text.slice(0, limit) : null
}

/**
 * 경로에서 식별자를 지운다.
 *
 * `/r/9f2c…` 나 `?reportId=…` 를 그대로 적재하면 통계 표가 개인 식별 저장소가 된다.
 * 통계에 필요한 것은 "어느 화면" 이지 "누구의 무엇" 이 아니다.
 */
export function normalizeRoute(value: unknown): string | null {
  const raw = clean(value, 400)
  if (!raw) return null
  const path = raw.split('?')[0].split('#')[0]
  const masked = path
    // 28자 이상 16진 문자열은 리포트 id 다.
    .replace(/\/[0-9a-f]{20,}/gi, '/:id')
    // UUID.
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
  return masked.slice(0, ROUTE_LIMIT)
}

export function toStoredEvent(input: FunnelEventInput, sessionId: string, userId?: string): StoredFunnelEvent | null {
  const event = clean(input.event, 20)
  if (!event || !FUNNEL_EVENTS.includes(event as FunnelEvent)) return null
  const session = clean(sessionId, 64)
  if (!session) return null
  return {
    event: event as FunnelEvent,
    service_key: clean(input.serviceKey, FIELD_LIMIT),
    step: clean(input.step, FIELD_LIMIT),
    target: clean(input.target, FIELD_LIMIT),
    session_id: session,
    user_id: userId ?? null,
    route: normalizeRoute(input.route),
  }
}

/** 적재는 실패해도 화면을 막지 않는다. 통계가 없다고 서비스를 세울 이유는 없다. */
export async function recordFunnelEvents(rows: StoredFunnelEvent[]): Promise<boolean> {
  if (!rows.length || !opsStoreAvailable()) return false
  try {
    const response = await fetch(`${opsBase()}/rest/v1/umsh_funnel_events`, {
      method: 'POST',
      headers: { ...opsHeaders(), prefer: 'return=minimal' },
      body: JSON.stringify(rows.slice(0, FUNNEL_BATCH_LIMIT)),
    })
    return response.ok
  } catch {
    return false
  }
}

export type FunnelPeriod = 'day' | 'week' | 'month'

const PERIOD_DAYS: Record<FunnelPeriod, number> = { day: 1, week: 7, month: 30 }

export function periodStart(period: FunnelPeriod, now = new Date()): string {
  const start = new Date(now.getTime() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000)
  return start.toISOString()
}

export interface LoveSpeedSummary {
  views: number
  sessions: number
  signedInUsers: number
  sources: Array<{ source: string; views: number; sessions: number }>
  actions: Array<{ action: string; events: number; sessions: number }>
  homeClicks: number
}

export interface SoloNaraSummary extends LoveSpeedSummary {
  /** 결과 화면이 열린 캐릭터별 횟수. 성별·답변·점수는 수집하지 않는다. */
  results: Array<{ typeId: string; name: string; gender: string; views: number }>
}

export interface FunnelSummary {
  available?: boolean
  /** 관리자 요약 카드. 주문 조회 권한이 있을 때만 붙는다. */
  buyers?: { buyers: number; firstBuyers: number; orders: number; revenue: number }
  /** 신규 가입. 회원 조회 권한이 있을 때만 붙는다. */
  signups?: { signups: number; byProvider: Record<string, number>; truncated: boolean }
  loveSpeed?: LoveSpeedSummary
  soloNara?: SoloNaraSummary
  period: FunnelPeriod | 'custom'
  since: string
  /** 직접 고른 기간의 끝. 없으면 지금까지. */
  until?: string
  /** 2026-10-08 유입 채널: 새 방문의 첫 화면에서 남긴 채널별 방문과, 그 방문이 어디까지 갔는지. */
  acquisition: Array<{ channel: string; visits: number; input: number; teaser: number; checkout: number; signups: number }>
  /** 2026-10-08 가입 퍼널: 가입 안내 노출 → 로그인 버튼 → 가입 완료(방문 수). 수단별 클릭·완료. */
  signupFunnel: { wall: number; click: number; complete: number; methods: Array<{ method: string; clicks: number; completes: number }> }
  /** 선택 기간 전체의 페이지 조회·방문·로그인 방문자. 서로 다른 서비스 행을 더해서 만들지 않는다. */
  overview: { views: number; sessions: number; signedInUsers: number }
  /** 서비스 하나를 가로로 읽는 운영 요약. steps 는 실제로 수집된 단계만 가진다. */
  services: Array<{ serviceKey: string | null; views: number; sessions: number; steps: Record<string, number> }>
  /** 단계별 진입 세션 수. 이탈은 앞 단계와의 차이로 읽는다. */
  steps: Array<{ serviceKey: string | null; step: string | null; sessions: number; views: number }>
  /** 구매 퍼널: 소개 → 입력 → 무료 결과 → 결제 화면. 결제 완료는 주문 저장소에서 따로 붙인다. */
  purchase: PurchaseFunnel
  /** 많이 눌린 CTA 순. 고객의 관심사가 여기에 드러난다. */
  ctas: Array<{ serviceKey: string | null; target: string | null; clicks: number }>
  sampled: number
  /** 조회 상한에 닿아 선택 기간 전체가 아닐 수 있을 때만 true 다. */
  truncated: boolean
}

export const PURCHASE_STAGES = ['intro', 'input', 'teaser', 'checkout'] as const
export type PurchaseStage = (typeof PURCHASE_STAGES)[number]

/**
 * 2026-10-07 관리자 구매 퍼널. GA4 퍼널(view_item → input_start → view_teaser → begin_checkout)과 같은 단계를
 * 자체 수집 기록으로 센다. 단위는 방문(세션)이고, 단계마다 "그 단계 화면을 한 번이라도 연 방문" 수다.
 * 중간 단계로 바로 들어온 방문도 세는 개방형이라 앞 단계보다 큰 숫자가 나올 수 있다.
 */
export interface PurchaseFunnel {
  stages: Record<PurchaseStage, number>
  services: Array<{ serviceKey: string } & Record<Exclude<PurchaseStage, 'checkout'>, number>>
  /** 결제 완료. 주문 조회 권한이 있을 때만 서버가 붙인다. */
  paid?: { orders: number; amount: number; byProduct: Array<{ productKey: string; orders: number; amount: number }> }
}

// 무료 서비스: 결제 상품이 아니다(무료 테스트 2종, 오늘운).
const FREE_PLAY_SERVICES = new Set(['love_speed', 'solo_nara', 'today_fortune'])

/** 결제 결과·테스트 화면을 빼고 실제 결제 화면만. */
const CHECKOUT_ROUTE = /^\/payment(\/|\/index\.html)?$/

export function purchaseStageOf(row: { step: string | null; route?: string | null }): PurchaseStage | null {
  switch (row.step) {
    case 'entry': case '01-story': return 'intro'
    case '02-input': case '03-service-input': return 'input'
    case '04-report': return 'teaser'
    case 'payment': return CHECKOUT_ROUTE.test(row.route ?? '') ? 'checkout' : null
    default: return null
  }
}

/**
 * 2026-10-08 관리자 요약 › 구매자·첫 구매자·매출. 결제가 확인된 주문(paid·viewed)만 센다.
 * 첫 구매자는 기간 이전에 결제한 적이 없는 계정이다 — 그래서 기간 이전 주문도 함께 받는다.
 * 계정 식별자는 세는 데만 쓰고 내보내지 않는다.
 */
export function summarizeBuyers(orders: Array<{ ownerId: string; amount: number; status: string; createdAt: string }>, since: string, until?: string): { buyers: number; firstBuyers: number; orders: number; revenue: number } {
  const from = Date.parse(since)
  const to = until ? Date.parse(until) : Infinity
  const earlier = new Set<string>()
  const inPeriod = new Set<string>()
  let count = 0
  let revenue = 0
  for (const order of orders) {
    if (order.status !== 'paid' && order.status !== 'viewed') continue
    const at = Date.parse(order.createdAt)
    if (!Number.isFinite(at) || !order.ownerId) continue
    if (at < from) { earlier.add(order.ownerId); continue }
    if (!(at < to)) continue
    inPeriod.add(order.ownerId)
    count += 1
    if (Number.isFinite(order.amount)) revenue += order.amount
  }
  const firstBuyers = [...inPeriod].filter((id) => !earlier.has(id)).length
  return { buyers: inPeriod.size, firstBuyers, orders: count, revenue }
}

/** 결제 완료(paid·viewed) 주문을 상품별로 묶는다. 금액·상품 외의 주문 정보는 내보내지 않는다. */
export function summarizePaidOrders(orders: Array<{ productKey: string; amount: number; status: string; createdAt: string }>, since: string, until?: string): NonNullable<PurchaseFunnel['paid']> {
  const from = Date.parse(since)
  const to = until ? Date.parse(until) : Infinity
  const byProduct = new Map<string, { productKey: string; orders: number; amount: number }>()
  let count = 0
  let amount = 0
  for (const order of orders) {
    if (order.status !== 'paid' && order.status !== 'viewed') continue
    const at = Date.parse(order.createdAt)
    if (!(at >= from) || !(at < to) || !Number.isFinite(order.amount)) continue
    count += 1
    amount += order.amount
    const entry = byProduct.get(order.productKey) ?? { productKey: order.productKey, orders: 0, amount: 0 }
    entry.orders += 1
    entry.amount += order.amount
    byProduct.set(order.productKey, entry)
  }
  return { orders: count, amount, byProduct: [...byProduct.values()].sort((a, b) => b.orders - a.orders) }
}

type FunnelRow = {
  route?: string | null
  event: string
  service_key: string | null
  step: string | null
  target: string | null
  session_id: string
  user_id: string | null
}

/** Only aggregate whitelisted public source/action codes; never return visitor identifiers. */
export function summarizeLoveSpeedRows(rows: FunnelRow[]): LoveSpeedSummary {
  const visits = new Set<string>(), users = new Set<string>()
  const sources = new Map<string, { views: number; sessions: Set<string> }>()
  const actions = new Map<string, { events: number; sessions: Set<string> }>()
  const sourceKeys = ['home','share','admin','internal','search','social','external','direct']
  const actionKeys = ['start','complete','share','copy','details','login','restart']
  let views = 0, homeClicks = 0
  for (const row of rows) {
    if (row.event === 'cta_click' && row.target === 'love_speed:home') homeClicks++
    if (row.service_key !== 'love_speed') continue
    if (row.event === 'step_view') {
      views++; visits.add(row.session_id); if (row.user_id) users.add(row.user_id)
      const raw = (row.target || '').replace(/^love_speed:source:/, '')
      const source = sourceKeys.includes(raw) ? raw : 'unknown'
      const entry = sources.get(source) || { views: 0, sessions: new Set<string>() }
      entry.views++; entry.sessions.add(row.session_id); sources.set(source, entry)
    } else if (row.event === 'cta_click') {
      const action = (row.target || '').replace(/^love_speed:/, '')
      if (!actionKeys.includes(action)) continue
      const entry = actions.get(action) || { events: 0, sessions: new Set<string>() }
      entry.events++; entry.sessions.add(row.session_id); actions.set(action, entry)
    }
  }
  return { views, sessions: visits.size, signedInUsers: users.size, homeClicks,
    sources: [...sources].map(([source, value]) => ({ source, views: value.views, sessions: value.sessions.size })),
    actions: actionKeys.map(action => ({ action, events: actions.get(action)?.events || 0, sessions: actions.get(action)?.sessions.size || 0 })) }
}

// 결과 화면 표시는 같은 페이지 안의 단계 기록이라 전체 페이지뷰에 다시 더하지 않는다.
const isSoloResultMarker = (row: FunnelRow) => row.event === 'step_view' && (row.target || '').startsWith('solo_nara:result:')

/** Same whitelist rules as love-speed, plus per-character result counts for tuning the rubric after launch. */
export function summarizeSoloNaraRows(rows: FunnelRow[]): SoloNaraSummary {
  const visits = new Set<string>(), users = new Set<string>()
  const sources = new Map<string, { views: number; sessions: Set<string> }>()
  const actions = new Map<string, { events: number; sessions: Set<string> }>()
  const results = new Map<string, number>()
  const characters = new Map(soloNaraSpec.characters.map(c => [c.typeId, c]))
  const sourceKeys = ['home','share','admin','internal','search','social','external','direct']
  const actionKeys = ['start','gender','complete','login','share','copy','fortune','restart']
  let views = 0, homeClicks = 0
  for (const row of rows) {
    if (row.event === 'cta_click' && row.target === 'solo_nara:home') homeClicks++
    if (row.service_key !== 'solo_nara') continue
    if (isSoloResultMarker(row)) {
      const typeId = (row.target || '').slice('solo_nara:result:'.length)
      if (characters.has(typeId)) results.set(typeId, (results.get(typeId) || 0) + 1)
    } else if (row.event === 'step_view') {
      views++; visits.add(row.session_id); if (row.user_id) users.add(row.user_id)
      const raw = (row.target || '').replace(/^solo_nara:source:/, '')
      const source = sourceKeys.includes(raw) ? raw : 'unknown'
      const entry = sources.get(source) || { views: 0, sessions: new Set<string>() }
      entry.views++; entry.sessions.add(row.session_id); sources.set(source, entry)
    } else if (row.event === 'cta_click') {
      const action = (row.target || '').replace(/^solo_nara:/, '')
      if (!actionKeys.includes(action)) continue
      const entry = actions.get(action) || { events: 0, sessions: new Set<string>() }
      entry.events++; entry.sessions.add(row.session_id); actions.set(action, entry)
    }
  }
  return { views, sessions: visits.size, signedInUsers: users.size, homeClicks,
    sources: [...sources].map(([source, value]) => ({ source, views: value.views, sessions: value.sessions.size })),
    actions: actionKeys.map(action => ({ action, events: actions.get(action)?.events || 0, sessions: actions.get(action)?.sessions.size || 0 })),
    results: soloNaraSpec.characters.map(c => ({ typeId: c.typeId, name: c.name, gender: c.gender, views: results.get(c.typeId) || 0 })) }
}

function summarizeChannels(sessionChannel: Map<string, string>, stages: Record<PurchaseStage, Set<string>>, signedUp: Set<string>): FunnelSummary['acquisition'] {
  const byChannel = new Map<string, { channel: string; visits: number; input: number; teaser: number; checkout: number; signups: number }>()
  for (const [session, channel] of sessionChannel) {
    const entry = byChannel.get(channel) ?? { channel, visits: 0, input: 0, teaser: 0, checkout: 0, signups: 0 }
    entry.visits += 1
    if (stages.input.has(session)) entry.input += 1
    if (stages.teaser.has(session)) entry.teaser += 1
    if (stages.checkout.has(session)) entry.checkout += 1
    if (signedUp.has(session)) entry.signups += 1
    byChannel.set(channel, entry)
  }
  return [...byChannel.values()].sort((a, b) => b.visits - a.visits)
}

/** PostgREST I/O와 분리한 실제 집계 규칙. 관리자 화면과 단위 테스트가 같은 계산을 쓴다. */
export function summarizeFunnelRows(rows: FunnelRow[], period: FunnelPeriod | 'custom', since: string, truncated = false, until?: string): FunnelSummary {
  const stepViews = new Map<string, { serviceKey: string | null; step: string | null; views: number; sessions: Set<string> }>()
  const serviceViews = new Map<string, { serviceKey: string | null; views: number; sessions: Set<string>; steps: Record<string, number> }>()
  const ctaClicks = new Map<string, { serviceKey: string | null; target: string | null; clicks: number }>()
  const sessions = new Set<string>()
  const signedInUsers = new Set<string>()
  const stageSessions = Object.fromEntries(PURCHASE_STAGES.map((stage) => [stage, new Set<string>()])) as Record<PurchaseStage, Set<string>>
  const serviceStages = new Map<string, Record<Exclude<PurchaseStage, 'checkout'>, Set<string>>>()
  const sessionChannel = new Map<string, string>()
  const signupSessions = { wall: new Set<string>(), click: new Set<string>(), complete: new Set<string>() }
  const methodClicks = new Map<string, Set<string>>()
  const methodCompletes = new Map<string, Set<string>>()

  for (const row of rows) {
    if (isSoloResultMarker(row)) continue
    if (row.event === 'step_view') {
      // 무료 테스트(금사빠·솔로나라)는 결제 상품이 아니다. 구매 퍼널 소개 단계를 부풀리지 않게 뺀다.
      const stage = FREE_PLAY_SERVICES.has(row.service_key ?? '') ? null : purchaseStageOf(row)
      if (stage) {
        stageSessions[stage].add(row.session_id)
        if (stage !== 'checkout' && row.service_key) {
          const entry = serviceStages.get(row.service_key) ?? { intro: new Set<string>(), input: new Set<string>(), teaser: new Set<string>() }
          entry[stage].add(row.session_id)
          serviceStages.set(row.service_key, entry)
        }
      }
      sessions.add(row.session_id)
      if (row.user_id) signedInUsers.add(row.user_id)

      const stepKey = `${row.service_key ?? ''}|${row.step ?? ''}`
      const stepEntry = stepViews.get(stepKey) ?? { serviceKey: row.service_key, step: row.step, views: 0, sessions: new Set<string>() }
      stepEntry.views += 1
      stepEntry.sessions.add(row.session_id)
      stepViews.set(stepKey, stepEntry)

      const serviceKey = row.service_key ?? ''
      const serviceEntry = serviceViews.get(serviceKey) ?? { serviceKey: row.service_key, views: 0, sessions: new Set<string>(), steps: {} }
      serviceEntry.views += 1
      serviceEntry.sessions.add(row.session_id)
      const step = row.step ?? 'other'
      serviceEntry.steps[step] = (serviceEntry.steps[step] ?? 0) + 1
      serviceViews.set(serviceKey, serviceEntry)
    } else if (row.event === 'cta_click' && (row.target ?? '').startsWith('source:')) {
      // 행은 최신순으로 온다. 덮어쓰면 그 방문의 가장 이른 채널이 남는다.
      sessionChannel.set(row.session_id, (row.target as string).slice('source:'.length) || 'other')
    } else if (row.event === 'cta_click' && (row.target ?? '').startsWith('signup:')) {
      const [, kind, method] = (row.target as string).split(':')
      if (kind === 'wall') signupSessions.wall.add(row.session_id)
      if (kind === 'click' || kind === 'complete') {
        signupSessions[kind].add(row.session_id)
        const byMethod = kind === 'click' ? methodClicks : methodCompletes
        const key = method || 'unknown'
        byMethod.set(key, (byMethod.get(key) ?? new Set<string>()).add(row.session_id))
      }
    } else if (row.event === 'cta_click') {
      const key = `${row.service_key ?? ''}|${row.target ?? ''}`
      const entry = ctaClicks.get(key) ?? { serviceKey: row.service_key, target: row.target, clicks: 0 }
      entry.clicks += 1
      ctaClicks.set(key, entry)
    }
  }

  return {
    period,
    since,
    ...(until ? { until } : {}),
    available: true,
    loveSpeed: summarizeLoveSpeedRows(rows),
    soloNara: summarizeSoloNaraRows(rows),
    overview: {
      views: [...stepViews.values()].reduce((sum, entry) => sum + entry.views, 0),
      sessions: sessions.size,
      signedInUsers: signedInUsers.size,
    },
    services: [...serviceViews.values()]
      .map((entry) => ({ serviceKey: entry.serviceKey, views: entry.views, sessions: entry.sessions.size, steps: entry.steps }))
      .sort((a, b) => b.views - a.views),
    steps: [...stepViews.values()]
      .map((entry) => ({ serviceKey: entry.serviceKey, step: entry.step, sessions: entry.sessions.size, views: entry.views }))
      .sort((a, b) => b.sessions - a.sessions),
    purchase: {
      stages: Object.fromEntries(PURCHASE_STAGES.map((stage) => [stage, stageSessions[stage].size])) as Record<PurchaseStage, number>,
      services: [...serviceStages]
        .map(([serviceKey, entry]) => ({ serviceKey, intro: entry.intro.size, input: entry.input.size, teaser: entry.teaser.size }))
        .sort((a, b) => b.intro - a.intro || b.teaser - a.teaser),
    },
    acquisition: summarizeChannels(sessionChannel, stageSessions, signupSessions.complete),
    signupFunnel: {
      wall: signupSessions.wall.size,
      click: signupSessions.click.size,
      complete: signupSessions.complete.size,
      methods: [...new Set([...methodClicks.keys(), ...methodCompletes.keys()])]
        .map((method) => ({ method, clicks: methodClicks.get(method)?.size ?? 0, completes: methodCompletes.get(method)?.size ?? 0 }))
        .sort((a, b) => b.clicks - a.clicks),
    },
    ctas: [...ctaClicks.values()].sort((a, b) => b.clicks - a.clicks).slice(0, 100),
    sampled: rows.length,
    truncated,
  }
}

/**
 * 집계.
 *
 * PostgREST 에 group by 가 없어 행을 받아 서버에서 센다. 그래서 상한을 둔다 — 통계를
 * 보려다 함수가 메모리로 죽으면 안 된다. 상한에 닿으면 `sampled` 로 알린다.
 */
export async function summarizeFunnel(period: FunnelPeriod | 'custom', limit = 5000, range?: { since: string; until: string }): Promise<FunnelSummary> {
  const since = range?.since ?? periodStart(period === 'custom' ? 'day' : period)
  const until = range?.until
  const empty: FunnelSummary = { period, since, available: false, loveSpeed: summarizeLoveSpeedRows([]), soloNara: summarizeSoloNaraRows([]), overview: { views: 0, sessions: 0, signedInUsers: 0 }, services: [], steps: [], purchase: { stages: { intro: 0, input: 0, teaser: 0, checkout: 0 }, services: [] }, acquisition: [], signupFunnel: { wall: 0, click: 0, complete: 0, methods: [] }, ctas: [], sampled: 0, truncated: false }
  if (!opsStoreAvailable()) return empty

  const safeLimit = Math.min(Math.max(limit, 1), 20000)
  const url = new URL(`${opsBase()}/rest/v1/umsh_funnel_events`)
  url.searchParams.set('select', 'event,service_key,step,target,session_id,user_id,route')
  url.searchParams.set('occurred_at', `gte.${since}`)
  if (until) url.searchParams.append('occurred_at', `lt.${until}`)
  url.searchParams.set('order', 'occurred_at.desc')
  url.searchParams.set('limit', String(safeLimit))
  const response = await fetch(url, { headers: opsHeaders() })
  if (!response.ok) return empty
  const rows = await response.json() as FunnelRow[]
  return summarizeFunnelRows(rows, period, since, rows.length >= safeLimit, until)
}

export interface FunnelStoreReadiness {
  ok: boolean
  configured: boolean
  table?: 'ready' | 'missing' | 'denied' | 'error'
  /** 지금까지 쌓인 전체 행 수. 저장이 실제로 되는지 이 숫자가 늘어나는 것으로 본다. */
  rows?: number
  errorCode?: string
}

/**
 * 표가 실제로 있고 쓸 수 있는지.
 *
 * 적재는 실패해도 화면을 막지 않게 해 두었다 — 그래서 표가 없으면 아무 소리 없이 아무
 * 것도 쌓이지 않는다. 마이그레이션을 적용했는지 밖에서 확인할 길이 이것뿐이다.
 */
export async function checkFunnelStoreReadiness(): Promise<FunnelStoreReadiness> {
  if (!opsStoreAvailable()) return { ok: false, configured: false, errorCode: 'OPS_STORE_UNAVAILABLE' }
  try {
    const url = new URL(`${opsBase()}/rest/v1/umsh_funnel_events`)
    url.searchParams.set('select', 'id')
    const response = await fetch(url, { headers: { ...opsHeaders(), prefer: 'count=exact', range: '0-0' } })
    if (!response.ok) {
      const table = response.status === 404 ? 'missing' as const
        : response.status === 401 || response.status === 403 ? 'denied' as const
          : 'error' as const
      return { ok: false, configured: true, table, errorCode: `FUNNEL_TABLE_${table.toUpperCase()}` }
    }
    const total = Number((response.headers.get('content-range') ?? '').split('/')[1])
    return { ok: true, configured: true, table: 'ready', rows: Number.isFinite(total) ? total : undefined }
  } catch {
    return { ok: false, configured: true, table: 'error', errorCode: 'FUNNEL_TABLE_ERROR' }
  }
}
