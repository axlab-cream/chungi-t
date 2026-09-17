import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const storyPath = new URL('../../사주/work/move/01-step-1-story/index.html', import.meta.url)

test('이직운 STEP1 히어로 카피는 하단으로 내려 상단 이미지가 보인다', async () => {
  const html = await readFile(storyPath, 'utf8')
  assert.match(html, /\.hero\s*\{[\s\S]*justify-content:\s*flex-end/)
  assert.match(html, /\.hero-copy\s*\{[\s\S]*margin-top:\s*auto/)
  assert.match(html, /padding: 24px 22px calc\(92px/)
  assert.doesNotMatch(html, /\.hero-copy\s*\{[\s\S]*padding-top:\s*220px/)
  assert.match(html, /class="hero-copy"/)
  assert.match(html, /class="hero-video"/)
})
