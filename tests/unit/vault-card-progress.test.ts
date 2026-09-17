import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

/**
 * 2026-09-17: 보관함 카드에 진행률과 PDF 버튼을 넣었다(Claude Design "UMSH 보관함 리스트").
 *
 * 목차별 해석은 한 장씩 만들어지고 전체가 끝나기까지 시간이 걸린다. 그동안 목록은 그냥
 * 제목과 날짜만 보여 줘서, 사용자는 지금 열면 다 볼 수 있는지 알 수 없었다.
 *
 * 이 파일이 지키는 것 세 가지 —
 *  1. 진행 숫자는 서버가 준 것만 쓴다(화면에서 만들어 내지 않는다)
 *  2. PDF 는 전부 만들어졌을 때만 눌린다
 *  3. 남은 시간을 지어내지 않는다
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const html = readFileSync(join(root, '사주', 'vault.html'), 'utf8')

test('진행 숫자는 서버가 내려준 progress 만 쓴다', () => {
  assert.match(html, /report\.progress\?\.total/)
  assert.match(html, /report\.progress\?\.complete/)
  // 상태 판정에는 리포트 상태도 함께 본다. 숫자만으로는 멈춘 것과 만드는 중이 구분되지 않는다.
  assert.match(html, /report\.reportStatus/)
})

test('카드는 생성 중·완료·실패 세 상태를 가진다', () => {
  for (const state of ['generating', 'complete', 'failed']) {
    assert.match(html, new RegExp(`is-\\$\\{view\\.state\\}|'${state}'`), `${state} 상태가 없다`)
  }
  for (const seal of ['命', '完', '止']) assert.ok(html.includes(seal), `${seal} 도장이 없다`)
  for (const badge of ['생성 중', '완료', '생성 실패']) assert.ok(html.includes(badge))
})

test('PDF 는 전부 만들어졌을 때만 활성화된다', () => {
  // 완료 분기에만 활성 클래스가 붙는다.
  const complete = html.slice(html.indexOf("if (state === 'complete')"), html.indexOf("if (state === 'failed')"))
  assert.match(complete, /pdfClass: 'is-ready'/)
  assert.match(complete, /pdfAction: 'pdf'/)

  // 생성 중에는 클래스가 비어 있고, 비어 있으면 마크업이 disabled 를 붙인다.
  const generating = html.slice(html.indexOf('return {\n            state, total, done, percent'))
  assert.match(generating, /pdfClass: ''/)
  assert.match(html, /\$\{view\.pdfClass \? '' : 'disabled'\}/)

  // 실패는 내려받기가 아니라 재생성이다. 없는 파일을 받게 하지 않는다.
  const failed = html.slice(html.indexOf("if (state === 'failed')"), html.indexOf('return {\n            state, total, done, percent'))
  assert.match(failed, /pdfClass: 'is-retry'/)
  assert.match(failed, /pdfAction: 'retry'/)
})

test('남은 시간을 지어내지 않는다', () => {
  // 섹션마다 걸리는 시간이 달라서 추정치는 대부분 틀린다. 틀린 예고는 없는 예고보다 나쁘다.
  const script = html.slice(html.indexOf('function cardView'), html.indexOf('function ensurePdfHelper'))
  assert.doesNotMatch(script, /분 남음|초 남음|남았어요|예상 완료/)
})

test('진행 막대는 스크린리더에도 읽힌다', () => {
  assert.match(html, /role="progressbar"/)
  assert.match(html, /aria-valuenow="\$\{view\.done\}"/)
  assert.match(html, /aria-valuemax="\$\{view\.total\}"/)
})

test('카드 안의 버튼은 카드 링크 이동을 가로챈다', () => {
  // 카드 전체가 <a> 라, 막지 않으면 PDF 를 누를 때 화면이 같이 넘어간다.
  const handler = html.slice(html.indexOf("list.addEventListener('click'"))
  assert.match(handler, /event\.preventDefault\(\)/)
  assert.match(handler, /event\.stopPropagation\(\)/)
})
