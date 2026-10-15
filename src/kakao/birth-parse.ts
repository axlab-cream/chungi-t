import { analyzeSaju } from '../saju/analyzer.js'
import type { KakaoBirthDraft } from './chat-store.js'

/**
 * 카톡에 손으로 친 생년월일 문장을 읽는다. AI 를 쓰지 않는다(비용·지연 0, 결과 재현 가능).
 * 예) "1995년 3월 2일 양력 여자 오후 3시", "950302 음력 남 모름", "1995.03.02 여 15:30"
 */
export type BirthParse =
  | { ok: true; birth: KakaoBirthDraft }
  | { ok: false; reason: 'date' | 'gender' | 'invalid' }

const BRANCH_HOURS: Record<string, number> = { 자: 0, 축: 2, 인: 4, 묘: 6, 진: 8, 사: 10, 오: 12, 미: 14, 신: 16, 유: 18, 술: 20, 해: 22 }

export function parseKakaoBirth(raw: string, now = new Date()): BirthParse {
  const text = raw.normalize('NFC').replace(/\s+/g, ' ').trim()
  const date = parseDate(text, now)
  if (!date) return { ok: false, reason: 'date' }
  const gender = parseGender(text)
  if (!gender) return { ok: false, reason: 'gender' }
  const calendar: 'solar' | 'lunar' = /음력/.test(text) ? 'lunar' : 'solar'
  const isLeapMonth = calendar === 'lunar' ? /윤달|윤\s*\d|윤월/.test(text) : undefined
  const time = parseTime(date.rest)
  const birth: KakaoBirthDraft = {
    year: date.year, month: date.month, day: date.day,
    hour: time ? time.hour : 12, minute: time ? time.minute : 0, timeKnown: Boolean(time),
    gender, calendar, ...(calendar === 'lunar' ? { isLeapMonth: Boolean(isLeapMonth) } : {}),
  }
  if (!validBirth(birth, now)) return { ok: false, reason: 'invalid' }
  return { ok: true, birth }
}

export function describeBirth(birth: KakaoBirthDraft): string {
  const calendar = birth.calendar === 'solar' ? '양력' : birth.isLeapMonth ? '음력 윤달' : '음력'
  const gender = birth.gender === 'female' ? '여자' : '남자'
  const time = birth.timeKnown ? `${birth.hour < 12 ? '오전' : '오후'} ${birth.hour % 12 === 0 ? 12 : birth.hour % 12}시${birth.minute ? ` ${birth.minute}분` : ''}` : '시간 모름'
  return `${birth.year}년 ${birth.month}월 ${birth.day}일(${calendar}) ${gender}, ${time}`
}

function parseDate(text: string, now: Date): { year: number; month: number; day: number; rest: string } | null {
  const patterns: Array<{ re: RegExp; shortYear?: boolean }> = [
    { re: /(\d{4})\s*(?:년|[.\-/])\s*(\d{1,2})\s*(?:월|[.\-/])\s*(\d{1,2})\s*일?/ },
    { re: /(?<!\d)(\d{2})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?/, shortYear: true },
    { re: /(?<!\d)(\d{4})(\d{2})(\d{2})(?!\d)/ },
    { re: /(?<!\d)(\d{2})(\d{2})(\d{2})(?!\d)/, shortYear: true },
  ]
  for (const { re, shortYear } of patterns) {
    const match = re.exec(text)
    if (!match) continue
    let year = Number(match[1])
    if (shortYear) {
      const current = now.getFullYear() % 100
      year += year > current ? 1900 : 2000
    }
    return { year, month: Number(match[2]), day: Number(match[3]), rest: text.slice(0, match.index) + ' ' + text.slice(match.index + match[0].length) }
  }
  return null
}

function parseGender(text: string): 'male' | 'female' | null {
  const female = /여자|여성|女|(?:^|[\s,/()])여(?=$|[\s,/()])/.test(text)
  const male = /남자|남성|男|(?:^|[\s,/()])남(?=$|[\s,/()])/.test(text)
  if (female === male) return null
  return female ? 'female' : 'male'
}

function parseTime(rest: string): { hour: number; minute: number } | null {
  if (/모름|몰라|모르|미상/.test(rest)) return null
  const clock = /(?<!\d)(\d{1,2}):(\d{2})(?!\d)/.exec(rest)
  if (clock) return checked(adjust(rest, Number(clock[1])), Number(clock[2]))
  const spoken = /(\d{1,2})\s*시\s*(?:(\d{1,2})\s*분|(반))?/.exec(rest)
  if (spoken) return checked(adjust(rest, Number(spoken[1])), spoken[3] ? 30 : Number(spoken[2] ?? 0))
  const branch = /([자축인묘진사오미신유술해])시/.exec(rest)
  if (branch) return { hour: BRANCH_HOURS[branch[1]], minute: 0 }
  return null
}

function adjust(rest: string, hour: number): number {
  if (/오후|저녁|밤/.test(rest) && hour < 12) return hour + 12
  if (/오전|새벽|아침/.test(rest) && hour === 12) return 0
  return hour
}

function checked(hour: number, minute: number): { hour: number; minute: number } | null {
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { hour, minute }
}

function validBirth(birth: KakaoBirthDraft, now: Date): boolean {
  if (birth.year < 1900 || birth.month < 1 || birth.month > 12 || birth.day < 1 || birth.day > 31) return false
  if (birth.calendar === 'solar') {
    const date = new Date(Date.UTC(birth.year, birth.month - 1, birth.day))
    if (date.getUTCMonth() + 1 !== birth.month || date.getUTCDate() !== birth.day) return false
    if (date.getTime() > now.getTime()) return false
  } else if (birth.year > now.getFullYear()) return false
  try { analyzeSaju(birth); return true } catch { return false }
}
