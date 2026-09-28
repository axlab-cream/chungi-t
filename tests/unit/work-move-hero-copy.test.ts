import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const storyPath = new URL('../../사주/work/move/01-step-1-story/index.html', import.meta.url)
const inputPath = new URL('../../사주/work/move/02-step-2-saju-input/index.html', import.meta.url)
const servicePath = new URL('../../사주/js/work-move-service.js', import.meta.url)

test('이직운 STEP1 히어로 카피는 하단으로 내려 상단 이미지가 보인다', async () => {
  const html = await readFile(storyPath, 'utf8')
  assert.match(html, /\.hero\s*\{[\s\S]*justify-content:\s*flex-end/)
  assert.match(html, /\.hero-copy\s*\{[\s\S]*margin-top:\s*auto/)
  assert.match(html, /padding: 24px 22px calc\(92px/)
  assert.doesNotMatch(html, /\.hero-copy\s*\{[\s\S]*padding-top:\s*220px/)
  assert.match(html, /class="hero-copy"/)
  assert.match(html, /class="hero-video"/)
})

test('이직운 입력 완료는 04 무료 티저로만 이동한다', async () => {
  const source = await readFile(servicePath, 'utf8')
  assert.match(source, /location\.assign\(teaserUrl\(payload\.reportId\)\)/)
  assert.match(source, /new URL\('\.\.\/04-step-4-report\/index\.html'/)
  assert.doesNotMatch(source, /form\.addEventListener\('submit'[\s\S]{0,1600}05-step-5-chat/)
})

test('이직운 STEP2는 보안 배지와 진행 단계를 노출하지 않고 입력 카드로 바로 이어진다', async () => {
  const html = await readFile(inputPath, 'utf8')
  assert.doesNotMatch(html, /class="trust-row"/)
  assert.doesNotMatch(html, /aria-label="입력 보안 안내"/)
  assert.doesNotMatch(html, /class="stepper"/)
  assert.doesNotMatch(html, /aria-label="진행 단계"/)
  assert.match(html, /<main>\s*<form class="form-card" id="moveForm"/)
})
