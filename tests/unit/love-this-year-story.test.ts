import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync('사주/love/this-year/01-step-1-story/index.html', 'utf8')

test('올해 연애운 스토리는 고객 고민에서 시작해 무료 해석 CTA로 이어진다', () => {
  assert.match(html, /이번에도 스쳐 갈까,[\s\S]*이번엔 진짜 시작될까/)
  assert.match(html, /문제는 인연이 없는 게 아니라/)
  assert.doesNotMatch(html, /무료 해석 2개 먼저 확인/)
  assert.match(html, /올해 연애가 풀리는[\s\S]*첫 장면부터 열어보세요/)
  assert.equal((html.match(/내 무료 연애 해석 열기/g) ?? []).length, 1)
  assert.doesNotMatch(html, /class="sticky-cta"/)
  assert.doesNotMatch(html, /<span class="price-chip">/)
  assert.doesNotMatch(html, /도화 \+ 세운 \+ 배우자성 기준 · 12,900원/)
})

test('올해 연애운 스토리는 전문 용어보다 사용자가 확인할 장면을 먼저 말한다', () => {
  assert.match(html, /사람이 나를 알아보는 때/)
  assert.match(html, /관계가 움직이는 달/)
  assert.match(html, /썸이 연애로 넘어가는 조건/)
  assert.doesNotMatch(html, />도화</)
  assert.doesNotMatch(html, />세운</)
  assert.doesNotMatch(html, />배우자성</)
})

test('올해 연애운 스토리는 장면 높이와 CTA 접근성을 모바일에 맞춘다', () => {
  assert.match(html, /body\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0/)
  assert.match(html, /@media \(max-width: 430px\)[\s\S]*?font-size:\s*clamp\(29px, 8vw, 34px\)/)
  assert.match(html, /\[data-scene-id="scene-01"\] \.content[\s\S]*?padding-bottom:\s*calc\(102px \+ env\(safe-area-inset-bottom\)\)/)
  assert.match(html, /min-height:\s*min\(92svh, 780px\)/)
  assert.match(html, /min-height:\s*min\(72svh, 640px\)/)
  assert.match(html, /\.primary-cta:focus-visible/)
  assert.match(html, /min-height:\s*52px/)
})

test('올해 연애운 스토리 여섯 장면은 같은 캠페인 이미지이고 구형 영상이 없다', () => {
  assert.equal((html.match(/src="\.\.\/assets\/thisyear\/campaign-2026\/year-love-story-(?:hero|scene-\d{2})-v1\.webp"/g) ?? []).length, 6)
  assert.doesNotMatch(html, /<video|\.mp4|data-video-src|scene-video/)
  assert.equal((html.match(/class="scene-image"/g) ?? []).length, 6)
})

