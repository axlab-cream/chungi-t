import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const source = readFileSync(join(root, '사주', '사주', 'index.html'), 'utf8')

function sliceBetween(startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start)
  assert.notEqual(start, -1, `${startMarker} 시작점을 찾지 못했습니다`)
  assert.notEqual(end, -1, `${endMarker} 끝점을 찾지 못했습니다`)
  return source.slice(start, end)
}

test('천명사주 랜딩은 남부대공 존댓말 퍼소나를 유지한다', () => {
  const landing = sliceBetween('function sampleIntroMarkup', 'function renderImmersion')

  assert.doesNotMatch(landing, /자네|허허|일세|보겠네|하네|다르네|풀어보게|보이는군/)
  assert.match(landing, /좋은 말보다 먼저[\s\S]{0,120}필요한 기준/)
  assert.match(landing, /전통 명리의 기준/)
})

test('천명사주 개인 결과는 입력값과 근거가 맞는 후킹 문구를 쓴다', () => {
  const result = sliceBetween('function renderResult()', 'const AGREE_KEYS')

  assert.doesNotMatch(result, /자네|허허|일세|보겠네|해야 하네|보이는군|들어가네|풀어주겠네/)
  assert.doesNotMatch(result, /명사들의|페이지급 밀도|<strong>24<\/strong><span>오행 흐름/)
  assert.doesNotMatch(result, /const turningYear = currentYear \+ 2/)
  assert.doesNotMatch(result, /<h2>\$\{relationLabel\}<\/h2>/)

  assert.match(result, /반복되는[\s\S]{0,80}선택의 이유/)
  assert.match(result, /끌리는 인연과 오래 남는 인연의 차이/)
  assert.match(result, /현재 고민[\s\S]{0,120}다음 행동/)
  assert.match(result, /천명사주 상담 시작/)
})
