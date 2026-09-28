import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
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

function loadFunction(name: string) {
  const start = source.indexOf(`function ${name}(`)
  assert.notEqual(start, -1, `${name} 함수를 찾지 못했습니다`)
  const bodyStart = source.indexOf('{', start)
  let depth = 0
  let end = bodyStart
  for (; end < source.length; end += 1) {
    if (source[end] === '{') depth += 1
    if (source[end] === '}') {
      depth -= 1
      if (depth === 0) break
    }
  }
  return runInNewContext(`(${source.slice(start, end + 1)})`)
}

test('천명사주 랜딩은 남부대공 존댓말 퍼소나를 유지한다', () => {
  const landing = sliceBetween('function sampleIntroMarkup', 'function renderImmersion')
  const landingText = landing.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ')

  assert.doesNotMatch(landing, /자네|허허|일세|보겠네|하네|다르네|풀어보게|보이는군/)
  assert.doesNotMatch(landing, /선택의 결|선택의 기준|타고난 결|필요한 기준|모이는 자리|새는 자리|선택의 이유|선택의 뿌리|선택 기준/)
  assert.match(landingText, /사주는 당신을 단정하지 않습니다/)
  assert.match(landingText, /오래 써온 방식이 이제 맞지 않을 수 있습니다/)
  assert.match(landingText, /내 삶을 다시 읽는\s*한 권의 기록/)
})

test('천명사주 랜딩은 고민에서 자기 이해로 이어지는 한 편의 서사를 만든다', () => {
  const landing = sliceBetween('function sampleIntroMarkup', 'function renderImmersion')
  const landingText = landing.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ')
  const beats = [
    '그 질문이 생긴 곳부터 따라가 보겠습니다',
    '지금까지 어떻게 버텨왔는지부터 읽습니다',
    '익숙한 반응이 드러납니다',
    '오래 써온 방식이 이제 맞지 않을 수 있습니다',
    '일, 돈, 사람의 이야기를',
    '지나온 시간을 이해하면',
    '한 권의 기록',
  ]

  let previous = -1
  for (const beat of beats) {
    const current = landingText.indexOf(beat)
    assert.ok(current > previous, `서사 순서가 어긋났습니다: ${beat}`)
    previous = current
  }
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

test('대운 한자는 한글 이름과 쉬운 뜻으로 바뀐다', () => {
  const formatFlowPillar = loadFunction('formatFlowPillar') as (value: unknown) => { name: string, meaning: string }
  const flowRelationshipText = loadFunction('flowRelationshipText') as (day: string, pillar: string) => string
  const plainSajuPreview = loadFunction('plainSajuPreview') as (value: string) => string
  const easyElementName = loadFunction('easyElementName') as (value: string) => string

  const read = (value: string) => JSON.parse(JSON.stringify(formatFlowPillar(value)))
  assert.deepEqual(read('庚辰'), { name: '경진', meaning: '단단히 다듬는 쇠와 현실을 쌓는 땅' })
  assert.deepEqual(read('甲申'), { name: '갑신', meaning: '곧게 뻗는 나무와 기준을 세우는 쇠' })
  assert.deepEqual(read('癸未'), { name: '계미', meaning: '스며드는 물과 여문 것을 품는 땅' })
  assert.equal(
    flowRelationshipText('목(木)', '庚辰'),
    '쇠 기운이 책임과 규칙을 통해 나를 다듬습니다. 땅 기운이 노력의 대가를 일과 돈의 결과로 바꾸게 합니다.',
  )
  assert.doesNotMatch(plainSajuPreview('일간은 을(乙)이고 오행(五行)을 봅니다.'), /[一-龥]|일간|오행/)
  assert.equal(easyElementName('목'), '나무')
  assert.equal(easyElementName('metal'), '쇠')
})

test('현재 흐름 설명은 각자의 사주 관계에 따라 달라진다', () => {
  const dayMasterNatureText = loadFunction('dayMasterNatureText') as (value: string) => string
  const flowActionText = loadFunction('flowActionText') as (day: string, pillar: string) => string

  assert.notEqual(dayMasterNatureText('을'), dayMasterNatureText('경'))
  assert.equal(
    flowActionText('목(木)', '庚辰'),
    '무작정 넓히기보다 책임의 범위와 끝낼 일을 분명히 할 때입니다.',
  )
  assert.equal(
    flowActionText('목(木)', '丙午'),
    '준비한 생각을 말과 결과물로 꺼내 보여 줄 때입니다.',
  )
})

test('개인 결과는 사주 근거 20퍼센트와 기승전결형 대운 차트를 보여준다', () => {
  const result = sliceBetween('function renderResult()', 'const AGREE_KEYS')

  assert.match(result, /사주 근거 · 전체 풀이의 약 20%/)
  assert.match(result, /flow-story-grid/)
  assert.match(result, /element-flow-chart/)
  assert.match(result, /기 · 뿌리를 세운 때/)
  assert.match(result, /승 · 세상으로 넓힌 때/)
  assert.match(result, /전 · 내 이름으로 움직인 때/)
  assert.match(result, /결 · 남길 것을 고른 때/)
  assert.match(result, /다음 10년에는 무엇이 달라질까요/)
  assert.doesNotMatch(result, /<span>大<\/span><span>運<\/span><span>轉<\/span>/)
  assert.doesNotMatch(result, /escapeHtml\(d\.pillar\)/)
  assert.doesNotMatch(result, /\.hanja|dayMasterHanja/)
})
