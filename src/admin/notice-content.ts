export type NoticeDraftFields = {
  title: string
  body: string
}

const FIELD_NAMES = new Set(['title', 'body'])

function plainText(value: unknown, max: number, code: string): string {
  if (typeof value !== 'string') throw new Error(code)
  const text = value.trim()
  if (!text || text.length > max) throw new Error(code)
  if (/[<>]/.test(text)) throw new Error('NOTICE_TEXT_INVALID')
  return text
}

export function parseNoticeDraftFields(value: unknown): NoticeDraftFields {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('NOTICE_FIELDS_INVALID')
  const input = value as Record<string, unknown>
  if (Object.keys(input).length !== FIELD_NAMES.size || Object.keys(input).some((key) => !FIELD_NAMES.has(key))) {
    throw new Error('NOTICE_FIELDS_INVALID')
  }
  return {
    title: plainText(input.title, 100, 'NOTICE_TITLE_INVALID'),
    body: plainText(input.body, 1000, 'NOTICE_BODY_INVALID'),
  }
}

export function safeNoticeDraftFields(value: unknown): NoticeDraftFields | null {
  try { return parseNoticeDraftFields(value) } catch { return null }
}

export function parseNoticeReviewNote(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') throw new Error('NOTICE_REVIEW_NOTE_INVALID')
  const text = value.trim()
  if (text.length > 500 || /[<>]/.test(text)) throw new Error('NOTICE_REVIEW_NOTE_INVALID')
  return text
}
