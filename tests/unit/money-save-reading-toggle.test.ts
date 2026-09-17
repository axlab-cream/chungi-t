import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const html = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../사주/money/save/05-step-5-chat/chat.html'),
  'utf8',
)

test('money_save 05 keeps the guide image and hides the duplicate index above it', () => {
  const guide = html.indexOf('data-asset-key="save-05-chat-guide"')
  const slot = html.indexOf('data-umsh-slot="sections"')
  assert.ok(guide > 0)
  assert.ok(slot > guide, 'live reading slot must sit below the guide image')
  assert.match(html, /\.hero,\s*\n\s*\.panel\[aria-label="리포트 요약"\]/)
  assert.match(html, /display:\s*none\s*!important/)
})
