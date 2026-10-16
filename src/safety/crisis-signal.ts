import type { NextFunction, Request, Response } from 'express'
import rules from '../../data/safety/crisis-signals.json' with { type: 'json' }

/**
 * 공통 절대 선 2번 — 마음 위기(2026-10-16).
 *
 * 고객이 자유 글(고민 칸·상담 채팅·카카오 등)에 스스로를 해칠 수 있다는 마음을 적으면
 * 1) 그 문장을 서버 입구에서 중립 문장(rules.replacement)으로 바꿔 저장·인용·AI 전달 어디에도 원문이 남지 않게 하고
 * 2) 그 중립 문장을 표시로 삼아, AI 지시에 "운세로 해석하지 말고 마음을 먼저 살피며 109를 안내"를 붙인다.
 * 감지 규칙·문구는 data/safety/crisis-signals.json 한 곳에서 고친다.
 */

const PATTERNS = rules.patterns.map((source) => new RegExp(source, 'i'))
const EXCLUSIONS = rules.exclusions.map((source) => new RegExp(source, 'gi'))
export const CRISIS_REPLACEMENT = rules.replacement
export const CRISIS_HOTLINE = rules.hotline

/** 글에 위기 신호가 있는지(제외 표현을 먼저 지운 뒤 본다). */
export function hasCrisisSignal(text: string): boolean {
  const cleaned = EXCLUSIONS.reduce((value, pattern) => value.replace(pattern, ' '), text)
  return PATTERNS.some((pattern) => pattern.test(cleaned))
}

/** 위기 신호가 있는 문장만 중립 문장으로 바꾼다. 나머지 문장은 그대로 둔다. */
export function redactCrisisText(text: string): { text: string; detected: boolean } {
  if (!hasCrisisSignal(text)) return { text, detected: false }
  const parts = text.split(/(?<=[.!?。！？\n])/)
  const out: string[] = []
  for (const part of parts) {
    if (!hasCrisisSignal(part)) { out.push(part); continue }
    // 바뀐 문장이 이어지면 한 번만 남긴다. 앞뒤 공백·줄바꿈은 원래 문장의 것을 그대로 쓴다.
    if (out.at(-1)?.trim() === CRISIS_REPLACEMENT) continue
    const leading = part.match(/^\s*/)?.[0] ?? ''
    const trailing = part.match(/\s*$/)?.[0] ?? ''
    out.push(`${leading}${CRISIS_REPLACEMENT}${trailing}`)
  }
  return { text: out.join('').trim(), detected: true }
}

/** 요청 본문 같은 값 안의 모든 문자열을 검사해 바꾼다. */
export function redactCrisisPayload<T>(value: T): { value: T; detected: boolean } {
  let detected = false
  const walk = (node: unknown): unknown => {
    // 긴 기호 덩어리(음성 base64·토큰)는 사람의 글이 아니다. 우연히 'suicid' 같은 글자가 나와 훼손되지 않게 건너뛴다.
    if (typeof node === 'string' && node.length > 200 && !/[\s가-힣ぁ-んァ-ヶ一-龥]/.test(node)) return node
    if (typeof node === 'string') {
      const result = redactCrisisText(node)
      if (result.detected) detected = true
      return result.text
    }
    if (Array.isArray(node)) return node.map(walk)
    if (node && typeof node === 'object') {
      return Object.fromEntries(Object.entries(node as Record<string, unknown>).map(([key, child]) => [key, walk(child)]))
    }
    return node
  }
  const next = walk(value) as T
  return { value: detected ? next : value, detected }
}

/** 입구에서 바꿔 둔 중립 문장이 들어 있는지(문맥·대화 기록 어디든). */
export function hasCrisisMarker(value: unknown): boolean {
  if (typeof value === 'string') return value.includes(CRISIS_REPLACEMENT)
  if (Array.isArray(value)) return value.some(hasCrisisMarker)
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).some(hasCrisisMarker)
  return false
}

/** AI 지시. withHotline 이면 글 첫머리에 109 안내를 한 번 넣게 한다. */
export function crisisAiInstruction(withHotline = true): string {
  return withHotline ? `${rules.aiInstruction} ${rules.aiHotlineInstruction}` : rules.aiInstruction
}

/** 사람이 읽는 접수 창구(1:1 문의·신고)는 원문이 필요하므로 바꾸지 않는다. */
const HUMAN_READ_ROUTES = [/^\/api\/user\/inquiries/, /^\/api\/report\/flag/, /^\/api\/admin\//]

/**
 * 서버 입구 장치. JSON 본문의 위기 문장을 바꾸고 res.locals.crisisSignal 을 켠다.
 * 원문은 로그에 남기지 않는다(경로만).
 */
export function crisisGuard(req: Request, res: Response, next: NextFunction): void {
  const path = req.originalUrl.split('?')[0]
  if (HUMAN_READ_ROUTES.some((pattern) => pattern.test(path))) { next(); return }
  if (req.body && typeof req.body === 'object') {
    const { value, detected } = redactCrisisPayload(req.body)
    if (detected) {
      req.body = value
      res.locals.crisisSignal = true
      res.setHeader(CARE_HEADER, 'crisis')
      console.warn(`[crisis-signal] ${req.method} ${path}`)
    }
  }
  // 2차(화면 안내): 이번 요청에 위기 문장이 없어도, 돌려주는 리포트·상담 기록에 바꿔 둔 문장이 있으면
  // (다시 열어 본 풀이 등) 같은 표시를 붙인다. 화면의 공용 스크립트(사주/js/umsh-care-notice.js)가 이 표시를 보고 안내를 띄운다.
  const json = res.json.bind(res)
  res.json = (body?: unknown) => {
    if (!res.headersSent && !res.getHeader(CARE_HEADER) && hasCrisisMarker(body)) res.setHeader(CARE_HEADER, 'crisis')
    return json(body)
  }
  next()
}

/** 응답에 붙이는 표시 헤더 이름. 값은 'crisis' 하나뿐이고 고객 글은 담지 않는다. */
export const CARE_HEADER = 'X-UMSH-Care'

/** 화면 안내 문구(공용 스크립트가 표시가 있을 때만 받아 간다). */
export function careNotice() {
  return rules.notice
}

/** 카카오 말풍선용 안내 한 줄. */
export function careNoticeText(): string {
  return `${rules.notice.title}\n${rules.notice.body}`
}
