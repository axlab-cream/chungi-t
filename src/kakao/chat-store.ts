import { opsBase, opsHeaders } from '../admin/ops-queue.js'

/**
 * 카카오 챗봇 대화 상태 저장소.
 * 운영은 Supabase REST(service role), 테스트는 메모리 구현을 쓴다.
 * 표 구조는 supabase/migrations/20261014120000_kakao_chatbot_sessions.sql.
 */

export interface KakaoTurn { role: 'user' | 'assistant'; content: string }
export interface KakaoBirthDraft {
  year: number; month: number; day: number
  hour: number; minute: number; timeKnown: boolean
  gender: 'male' | 'female'; calendar: 'solar' | 'lunar'; isLeapMonth?: boolean
}
/** couple: 본인→상대 생일. cmdg(천명사주 무료)·today(오늘의 운): 본인 생일 한 번. */
export type KakaoFlowKind = 'couple' | 'cmdg' | 'today'
export interface KakaoCoupleFlow {
  kind: KakaoFlowKind
  step: 'self' | 'partner'
  startedAt: number
  self?: KakaoBirthDraft
}
export interface KakaoChatState {
  historyDay: string | null
  history: KakaoTurn[]
  flow: KakaoCoupleFlow | null
}

export class KakaoStoreError extends Error {
  constructor() { super('KAKAO_STORE_UNAVAILABLE') }
}

export interface KakaoChatStore {
  load(userKey: string): Promise<KakaoChatState | null>
  /** 하루 횟수 1회 차감. 차감 후 사용 횟수, 다 썼으면 null. */
  claim(userKey: string, day: string, limit: number): Promise<number | null>
  refund(userKey: string, day: string): Promise<void>
  save(userKey: string, state: KakaoChatState): Promise<void>
}

export function memoryKakaoChatStore(): KakaoChatStore & { rows: Map<string, KakaoChatState & { quotaDay: string | null; used: number }> } {
  const rows = new Map<string, KakaoChatState & { quotaDay: string | null; used: number }>()
  const row = (key: string) => {
    let found = rows.get(key)
    if (!found) { found = { historyDay: null, history: [], flow: null, quotaDay: null, used: 0 }; rows.set(key, found) }
    return found
  }
  return {
    rows,
    async load(userKey) {
      const found = rows.get(userKey)
      return found ? structuredClone({ historyDay: found.historyDay, history: found.history, flow: found.flow }) : null
    },
    async claim(userKey, day, limit) {
      const found = row(userKey)
      if (found.quotaDay !== day) { found.quotaDay = day; found.used = 0 }
      if (found.used >= limit) return null
      found.used += 1
      return found.used
    },
    async refund(userKey, day) {
      const found = rows.get(userKey)
      if (found && found.quotaDay === day) found.used = Math.max(0, found.used - 1)
    },
    async save(userKey, state) {
      Object.assign(row(userKey), structuredClone(state))
    },
  }
}

export function restKakaoChatStore(): KakaoChatStore {
  async function call(path: string, init: RequestInit = {}): Promise<Response> {
    let response: Response
    try {
      response = await fetch(`${opsBase()}/rest/v1/${path}`, {
        ...init,
        headers: { ...opsHeaders(), ...(init.headers as Record<string, string> | undefined) },
        signal: AbortSignal.timeout(8_000),
      })
    } catch { throw new KakaoStoreError() }
    if (!response.ok) throw new KakaoStoreError()
    return response
  }
  return {
    async load(userKey) {
      const url = `kakao_chat_sessions?user_key=eq.${encodeURIComponent(userKey)}&select=history_day,history,flow`
      const rows = await (await call(url)).json() as Array<{ history_day: string | null; history: unknown; flow: unknown }>
      const found = rows[0]
      if (!found) return null
      return {
        historyDay: typeof found.history_day === 'string' ? found.history_day : null,
        history: Array.isArray(found.history) ? found.history.filter(isTurn) : [],
        flow: isCoupleFlow(found.flow) ? found.flow : null,
      }
    },
    async claim(userKey, day, limit) {
      const response = await call('rpc/kakao_chat_claim', { method: 'POST', body: JSON.stringify({ p_user_key: userKey, p_day: day, p_limit: limit }) })
      const value = await response.json() as unknown
      return typeof value === 'number' && Number.isInteger(value) ? value : null
    },
    async refund(userKey, day) {
      await call('rpc/kakao_chat_refund', { method: 'POST', body: JSON.stringify({ p_user_key: userKey, p_day: day }) })
    },
    async save(userKey, state) {
      await call('kakao_chat_sessions?on_conflict=user_key', {
        method: 'POST',
        headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ user_key: userKey, history_day: state.historyDay, history: state.history, flow: state.flow, updated_at: new Date().toISOString() }),
      })
    },
  }
}

function isTurn(value: unknown): value is KakaoTurn {
  const turn = value as KakaoTurn
  return !!turn && (turn.role === 'user' || turn.role === 'assistant') && typeof turn.content === 'string'
}

function isCoupleFlow(value: unknown): value is KakaoCoupleFlow {
  const flow = value as KakaoCoupleFlow
  return !!flow && (flow.kind === 'couple' || flow.kind === 'cmdg' || flow.kind === 'today') && (flow.step === 'self' || flow.step === 'partner') && typeof flow.startedAt === 'number'
}
