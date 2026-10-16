/**
 * 비회원 기록을 회원으로 합칠지 정하는 규칙(2026-10-16 대표 결정, docs/auth/guest-member-plan.md 8절).
 *
 * 비회원은 기기에 오래 남는다(1시간 정책 폐지). 그래서 공용 기기에서 다음 사람이 로그인하면 앞사람의 기록이
 * 넘어갈 수 있다. 사주(이름·생년월일)로 가려낸다:
 * - 회원 계정에 사주가 있고 비회원 사주와 같으면 합친다. 다르면 합치지 않는다.
 * - 회원 계정에 사주가 없으면(처음 가입) 비교할 수 없다. 무료 기록뿐이면 합치고,
 *   결제 기록이 있으면 "이 기기에 OOO님 이름으로 산 풀이가 있어요. 본인이면 불러올게요"로 한 번 묻는다.
 * "같은 사람"은 이름(공백·대소문자 무시)과 양력/음력 그대로의 생년월일(연·월·일)이 같을 때다.
 * 태어난 시·분·양음력 표시만 다르면 같은 사람으로 본다(시를 몰랐다가 넣는 경우).
 */

export interface SajuIdentity {
  name: string
  birth: { year: number; month: number; day: number }
}

export type GuestMergeDecision = 'merge' | 'skip-different' | 'confirm-paid'

function normalizedName(name: string): string {
  return String(name || '').replace(/\s+/g, '').toLowerCase()
}

export function isSamePerson(a: SajuIdentity, b: SajuIdentity): boolean {
  return normalizedName(a.name) === normalizedName(b.name)
    && a.birth.year === b.birth.year
    && a.birth.month === b.birth.month
    && a.birth.day === b.birth.day
}

export function decideGuestMerge(input: { guestProfile: SajuIdentity | null; memberProfile: SajuIdentity | null; guestPaidOrders: number }): GuestMergeDecision {
  const { guestProfile, memberProfile } = input
  if (guestProfile && memberProfile) return isSamePerson(guestProfile, memberProfile) ? 'merge' : 'skip-different'
  if (!memberProfile && input.guestPaidOrders > 0) return 'confirm-paid'
  return 'merge'
}

/** 확인 문구용 이름: 첫 글자만 보이고 나머지는 ○ (김하늘 → 김○○). 공용 기기에서 남의 이름이 다 보이지 않게. */
export function maskedName(name: string | null | undefined): string {
  const text = String(name || '').trim()
  if (!text) return ''
  return text.slice(0, 1) + '○'.repeat(Math.max(1, Math.min(text.length - 1, 3)))
}

/** 주문 조회·불러오기: 결제 때 넣은 휴대폰 번호와 같은지(숫자만 비교). */
export function sameTel(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = String(a || '').replace(/\D/g, '')
  const right = String(b || '').replace(/\D/g, '')
  return left.length >= 9 && left === right
}

/**
 * 주문 조회는 주문번호 + 휴대폰 번호를 아는 사람만 연다. 마구 넣어 보는 시도를 막으려고 같은 곳(IP)·같은 주문번호에서
 * 짧은 시간에 너무 많이 틀리면 잠시 막는다. 서버 인스턴스마다 따로 세는 가벼운 장치다(완전한 차단이 아니라 속도를 늦춘다).
 */
export class AttemptLimiter {
  private readonly hits = new Map<string, number[]>()
  constructor(private readonly limit: number, private readonly windowMs: number) {}

  /** 이번 시도를 세고, 한도를 넘었으면 false. */
  allow(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((at) => now - at < this.windowMs)
    if (recent.length >= this.limit) { this.hits.set(key, recent); return false }
    recent.push(now)
    this.hits.set(key, recent)
    if (this.hits.size > 5000) for (const [k, list] of this.hits) if (!list.some((at) => now - at < this.windowMs)) this.hits.delete(k)
    return true
  }
}

/** 리포트 기록의 대상(이름·생년월일). 이름이 없는 기록은 생년월일만으로 본다. */
export interface RecordSubject { name?: string | null; birth: { year: number; month: number; day: number } }

export function subjectMatches(subject: RecordSubject, person: SajuIdentity): boolean {
  const sameBirth = subject.birth.year === person.birth.year && subject.birth.month === person.birth.month && subject.birth.day === person.birth.day
  if (!sameBirth) return false
  return !subject.name || normalizedName(subject.name) === normalizedName(person.name)
}

/**
 * 한 기기(비회원 계정 하나)를 여러 사람이 번갈아 쓰면 기록이 한 계정에 섞인다.
 * 옮길 때는 대상 사람(person)과 사주가 같은 기록만 고른다. person 이 없으면(사주를 아무도 안 넣음) 전부.
 * 주문은 그 주문의 풀이(reportId)가 골라진 경우만 함께 간다. 풀이에 묶이지 않은 주문은 person 이 없을 때만.
 */
export function pickRecordsFor<R extends { reportId: string; subject: RecordSubject }, O extends { orderId: string; reportId?: string; status: string }>(
  person: SajuIdentity | null,
  reports: R[],
  orders: O[],
): { reportIds: string[] | undefined; orderIds: string[] | undefined; reports: number; orders: number; paidOrders: number; remaining: number } {
  if (!person) {
    const paid = orders.filter((order) => order.status === 'paid' || order.status === 'viewed').length
    return { reportIds: undefined, orderIds: undefined, reports: reports.length, orders: orders.length, paidOrders: paid, remaining: 0 }
  }
  const reportIds = reports.filter((report) => subjectMatches(report.subject, person)).map((report) => report.reportId)
  const picked = new Set(reportIds)
  const chosen = orders.filter((order) => order.reportId && picked.has(order.reportId))
  return {
    reportIds,
    orderIds: chosen.map((order) => order.orderId),
    reports: reportIds.length,
    orders: chosen.length,
    paidOrders: chosen.filter((order) => order.status === 'paid' || order.status === 'viewed').length,
    remaining: (reports.length - reportIds.length) + (orders.length - chosen.length),
  }
}
