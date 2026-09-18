import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { highlightPrompt, parseReportHighlight, reviewHighlightShape } from '../../src/report/report-generator.js'
import { loadHighlightTopics } from '../../src/report/longform-blocks.js'
import { reviewReportVerdictConsistency } from '../../src/report/tone-v2-review.js'
import type { BirthInput } from '../../src/types/index.js'

const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }

test('defined public services expose three highlight topics', () => {
  const topics = loadHighlightTopics('quit_fortune')
  assert.equal(topics?.length, 3)
  assert.equal(topics?.[0]?.title, 'GO/HOLD/타이밍 조정')
  assert.equal(topics?.[0]?.paragraphs, 6)
})

test('saju_master reads the cmdg block through the service alias', () => {
  const topics = loadHighlightTopics('saju_master')
  assert.equal(topics?.length, 3)
  assert.equal(topics?.[0]?.title, '타고난 그릇과 쓰는 법')
})

test('undefined services return undefined, not an empty list', () => {
  // 오늘운은 규칙 기반이라 리포트 블록이 없다. 빈 키도 마찬가지다.
  assert.equal(loadHighlightTopics('today_fortune'), undefined)
  assert.equal(loadHighlightTopics(''), undefined)
  assert.equal(loadHighlightTopics('no_such_service'), undefined)
})

/**
 * 2026-09-18: 설정이 있는 서비스는 10개뿐이라 나머지 9개는 결론·요약·하이라이트가 아예
 * 그려지지 않았다. 판매 카탈로그에 있는 서비스는 모두 세 블록을 가져야 한다.
 */
test('every catalog service defines three highlight topics and a verdict axis', () => {
  const directory = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../src/server/service-directory.ts'), 'utf8')
  const keys = [...new Set([...directory.matchAll(/key: '([a-z_]+)'/g)].map((match) => match[1]))]
  assert.ok(keys.length >= 19, `카탈로그 키를 찾지 못했다: ${keys.length}`)
  const blocks = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../사주/data/longform-blocks.json'), 'utf8').replace(/^﻿/, ''))
  for (const key of keys) {
    const config = blocks.services[key]
    assert.ok(config, `${key} 에 결론·요약·하이라이트 설정이 없다`)
    assert.ok(String(config.verdictAxis || '').trim(), `${key} 에 판단 축이 없다`)
    assert.equal(loadHighlightTopics(key)?.length, 3, `${key} 하이라이트가 3개가 아니다`)
    for (const cut of ['cutA', 'cutB']) assert.match(String(config[cut] || ''), /^\//, `${key}.${cut} 경로가 없다`)
  }
})

test('highlight prompts carry shape, verdict, and a new-judgment instruction', () => {
  const topics = loadHighlightTopics('quit_fortune')
  assert.ok(topics?.[0])
  const verdict = { statement: '지금은 보류다.', rankedChoices: ['HOLD', 'GO'], decidedAt: '2026-09-17T00:00:00.000Z' }
  const payload = JSON.parse(highlightPrompt(analyzeSaju(birth), birth, { serviceKey: 'quit_fortune' }, topics[0], verdict)[1].content)
  assert.match(payload.instruction, /새 판단/)
  assert.match(payload.instruction, /목차 항목을 요약하지/)
  assert.equal(payload.highlight.shape, topics[0].shape)
  assert.equal(payload.highlight.paragraphs, 6)
  assert.deepEqual(payload.evidenceLayers.fixedVerdict, { statement: verdict.statement, rankedChoices: verdict.rankedChoices })
})

test('shape review accepts the requested paragraph count and rejects a short body', () => {
  const six = ['하나.', '둘.', '셋.', '넷.', '다섯.', '여섯.'].join('\n\n')
  assert.equal(reviewHighlightShape(six, 6).passed, true)
  assert.equal(reviewHighlightShape('한 문단만.', 6).passed, false)
  assert.equal(reviewHighlightShape('문단 수가 없으면 통과.', undefined).passed, true)
})

test('parseReportHighlight keeps title and complete status', () => {
  const parsed = parseReportHighlight('{"text":"지금은 보류다.\\n\\n조건을 먼저 확인해요."}', 'GO/HOLD/타이밍 조정')
  assert.equal(parsed.title, 'GO/HOLD/타이밍 조정')
  assert.equal(parsed.status, 'complete')
  assert.match(parsed.text, /보류/)
})

test('a highlight that promotes a lower choice fails the verdict gate', () => {
  const review = reviewReportVerdictConsistency({
    verdict: { statement: '지금은 보류다.', rankedChoices: ['HOLD', 'GO'] },
    texts: ['1순위는 GO다.'],
  })
  assert.equal(review.passed, false)
})
