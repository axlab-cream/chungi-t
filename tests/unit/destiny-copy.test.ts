import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const destinySource = readFileSync(join(root, '사주/js/destiny.js'), 'utf8')
const destinyHtml = readFileSync(join(root, '사주/destiny.html'), 'utf8')

function loadFunction(name: string) {
  const start = destinySource.indexOf(`function ${name}(`)
  assert.notEqual(start, -1, `${name} 함수가 없습니다.`)

  const bodyStart = destinySource.indexOf('{', start)
  let depth = 0
  let end = bodyStart
  for (; end < destinySource.length; end += 1) {
    if (destinySource[end] === '{') depth += 1
    if (destinySource[end] === '}') {
      depth -= 1
      if (depth === 0) break
    }
  }

  return runInNewContext(`(${destinySource.slice(start, end + 1)})`)
}

test('대운 나이 구간에는 세 단위를 한 번만 표시한다', () => {
  const formatFortuneAge = loadFunction('formatFortuneAge') as (value: unknown) => string

  assert.equal(formatFortuneAge('6~15세'), '6~15세')
  assert.equal(formatFortuneAge('16~25'), '16~25세')
  assert.equal(formatFortuneAge('26~35세세'), '26~35세')
  assert.equal(formatFortuneAge(' 36~45세 '), '36~45세')
  assert.equal(formatFortuneAge(''), '나이 확인 중')
})

test('운명록 화면 문구에는 단위나 호칭이 연속 중복되지 않는다', () => {
  const fullCopy = `${destinyHtml}\n${destinySource}`
  assert.doesNotMatch(fullCopy, /세세|년년|월월|일일|님님|원원|회회/)
  assert.doesNotMatch(fullCopy, /확인해보세요|꺼내보세요/)
  assert.match(destinySource, /formatFortuneAge\(\s*row\.age/)
})
