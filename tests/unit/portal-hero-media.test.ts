import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('home CMDG hero uses optimized Blob media without eager video download', async () => {
  const html = await readFile(new URL('../../사주/portal.html', import.meta.url), 'utf8')
  const card = html.match(/<a class="poster service-card is-cmdg"[\s\S]*?<\/a>/)?.[0] || ''
  assert.match(card, /src="https:\/\/lcdlszuyicytaexy.public.blob.vercel-storage.com\/home\/cmdg-hero-20261012.mp4"/)
  assert.match(card, /poster="https:[^"]+cmdg-hero-20261012.webp"/)
  assert.match(card, /preload="none"/)
  assert.doesNotMatch(card, /chungi-landing-story|autoplay/)
})
