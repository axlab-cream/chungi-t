import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()
const source = readFileSync(
  join(root, '사주', 'money', 'save', '01-step-1-story', 'index.html'),
  'utf8',
)

test('저축운 도입은 콘텐츠 높이로 이어지고 이미지와 다음 정보 사이를 과하게 벌리지 않는다', () => {
  assert.match(source, /\.story-scene \{[\s\S]*?align-content: start;[\s\S]*?min-height: auto;/)
  assert.doesNotMatch(source, /min-height: calc\(100svh - 64px\)/)
  assert.match(source, /\.visual \{[\s\S]*?aspect-ratio: 4 \/ 5;/)
  assert.match(source, /\.visual\.wide \{[\s\S]*?aspect-ratio: 16 \/ 10;/)
  assert.match(source, /\.story-scene \{[\s\S]*?gap: 12px;[\s\S]*?padding: 16px 18px 22px;/)
  assert.match(source, /\.copy \{[\s\S]*?gap: 9px;/)
})

test('저축운 도입은 개인의 돈 문제에서 무료 해석으로 이어지고 가격을 본문에 노출하지 않는다', () => {
  const visiblePage = source.match(/<main id="intro">([\s\S]*?)<\/main>/)?.[1] ?? ''

  assert.match(visiblePage, /월급날은 있었는데,[\s\S]*남은 돈은 왜 없을까요/)
  assert.match(visiblePage, /내 통장에서 반복되는 장면/)
  assert.match(visiblePage, /첫 두 해석은 무료/)
  assert.match(source, /class="primary-cta"[\s\S]*무료로 내 돈 흐름 보기/)
  assert.match(source, /\$\{sectionCount\}개 세부 해석/)
  assert.doesNotMatch(source, /group\.sections\s*\.slice\(0, 3\)/)
  assert.doesNotMatch(visiblePage, /class="price-line"/)
  assert.doesNotMatch(visiblePage, /9,900원/)
})
