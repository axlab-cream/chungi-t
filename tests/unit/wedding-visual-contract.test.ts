import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('every Wedding reader surface tells customers the reviewed 20-item truth', () => {
  for (const path of [
    '사주/day/wedding/01-step-1-story/index.html',
    '사주/day/wedding/04-step-4-report/index.html',
    '사주/day/wedding/05-step-5-chat/index.html',
    '사주/day/wedding/05-step-5-chat/chat.html',
  ]) {
    const source = read(path)
    assert.doesNotMatch(source, /21개 항목/, path)
    assert.match(source, /20개 항목/, path)
  }

  const client = read('사주/js/wedding-service.js')
  assert.doesNotMatch(client, /21개 항목/)
  assert.match(client, /sections\.length \+ '개 항목 중 '/)
})

test('actual-record Wedding QA stays local, read-only and fail-closed', () => {
  const source = read('scripts/qa-wedding-live-reader.ts')
  assert.match(source, /P04-wedding-day-full-outline-generation-20260913\.json/)
  assert.match(source, /sourceRecord/)
  assert.match(source, /serviceKey !== 'wedding_day'/)
  assert.match(source, /sections\.length !== 20/)
  assert.match(source, /Wedding reader at 390 pixels/)
  assert.doesNotMatch(source, /writeFile|generateReport|supabase|Production/i)
})

test('Wedding reader has explicit print and narrow-screen overflow protection', () => {
  const source = read('사주/day/wedding/assets/style.css')
  assert.match(source, /@media print/)
  assert.match(source, /overflow-x:hidden/)
  assert.match(source, /break-inside:avoid/)
  assert.match(source, /\.umsh-flag-open,.umsh-flag-back\{display:none!important\}/)
})
