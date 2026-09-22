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

test('cmdg first highlight uses a distinct photographic wood-path banner', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
  const blocks = JSON.parse(readFileSync(join(root, '사주/data/longform-blocks.json'), 'utf8').replace(/^﻿/, ''))
  const banner = blocks.services.cmdg.cutB
  assert.equal(banner, '/assets/cmdg-wood-path-highlight-v2.webp')
  assert.notEqual(banner, blocks.services.cmdg.cutA)
  const bytes = readFileSync(join(root, '사주/사주', banner.slice(1)))
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF')
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP')
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

/**
 * 2026-09-18: 예산을 늘린 뒤에도 하이라이트 세 장이 "본문을 찾지 못했습니다"로 실패했다.
 * JSON 은 읽혔는데 text 가 문자열이 아니었다 — "문단 6개"를 요구하니 모델이 문단을 배열로
 * 냈다. 형태가 달라도 본문이 있으면 살려야 한다.
 */
test('parseReportHighlight는 배열·다른 키·한 겹 감싼 형태와 날것 줄바꿈도 읽는다', () => {
  const array = parseReportHighlight('{"text":["첫 문단이에요.","둘째 문단이에요."]}', '제목')
  assert.equal(array.text, '첫 문단이에요.\n\n둘째 문단이에요.')
  assert.equal(array.status, 'complete')
  assert.equal(parseReportHighlight('{"paragraphs":["하나.","둘."]}', '제목').text, '하나.\n\n둘.')
  assert.equal(parseReportHighlight('{"highlight":{"title":"제목","text":"감싼 본문이에요."}}', '제목').text, '감싼 본문이에요.')
  const rawNewline = parseReportHighlight('{"text":"첫 줄이에요.\n\n둘째 줄이에요."}', '제목')
  assert.equal(rawNewline.text, '첫 줄이에요.\n\n둘째 줄이에요.')
  assert.throws(() => parseReportHighlight('{"text":""}', '제목'), /본문을 찾지 못했습니다/)
  assert.throws(() => parseReportHighlight('{"title":"본문 없음"}', '제목'), /본문을 찾지 못했습니다/)
})

test('highlight prompt pins text to a single string', () => {
  const topics = loadHighlightTopics('quit_fortune')
  assert.ok(topics?.[0])
  const payload = JSON.parse(highlightPrompt(analyzeSaju(birth), birth, { serviceKey: 'quit_fortune' }, topics[0])[1].content)
  assert.match(payload.instruction, /text는 문자열 하나/)
  assert.match(payload.instruction, /배열이나 다른 키로 내지 마세요/)
})

test('a highlight that promotes a lower choice fails the verdict gate', () => {
  const review = reviewReportVerdictConsistency({
    verdict: { statement: '지금은 보류다.', rankedChoices: ['HOLD', 'GO'] },
    texts: ['1순위는 GO다.'],
  })
  assert.equal(review.passed, false)
})

/**
 * 2026-09-18: 천명사주 하이라이트 셋이 모두 실패했다. 사유는 "본문을 찾지 못했습니다"와
 * "길이 제한으로 중단" — 내용 문제가 아니라 예산 문제였다. 하이라이트 본문은 990~2025자로
 * 목차 항목(405~945자)의 두 배가 넘는데 토큰 상한이 1800 으로 항목(9000)의 1/5 였다.
 * gpt-5 는 추론에도 같은 예산을 쓰므로 본문이 남지 않는다.
 */
test('긴 본문을 요구하는 블록이 더 작은 토큰 예산을 갖지 않는다', () => {
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../src/report/report-generator.ts'), 'utf8')
  // 기본값은 `... || 9000` 처럼 그 줄의 마지막 숫자다(항목 예산은 중간에 runtimeConfig 폴백이 하나 더 있다).
  const budgetOf = (name: string) => {
    const line = source.split('\n').find((item) => item.includes(`process.env.${name}`))
    const match = line ? /(\d[\d_]*)\s*,?\s*$/.exec(line.trim()) : null
    assert.ok(match, `${name} 기본 예산을 찾지 못했다`)
    return Number(match[1].replace(/_/g, ''))
  }
  const section = budgetOf('REPORT_SECTION_MAX_TOKENS')
  const highlight = budgetOf('REPORT_HIGHLIGHT_MAX_TOKENS')
  const summary = budgetOf('REPORT_SUMMARY_MAX_TOKENS')
  assert.ok(highlight >= section, `하이라이트(${highlight})가 항목(${section})보다 긴 글을 요구하는데 예산이 더 작다`)
  assert.ok(summary >= 4000, `요약 예산이 빠듯하다: ${summary}`)
  // 잘리면 예산을 키워 다시 부른다. 한 번 잘렸다고 실패로 굳으면 안 된다.
  for (const fn of ['buildOpenAiReportSummary', 'buildOpenAiReportHighlight']) {
    const body = source.slice(source.indexOf(`export async function ${fn}`))
    assert.match(body.slice(0, 2000), /OpenAiTruncatedError/, `${fn} 이 잘림을 다시 시도하지 않는다`)
  }
})

/**
 * 2026-09-18: 예산과 배열 형태를 고친 뒤에도 하이라이트 둘이 "본문을 찾지 못했습니다"로 남았다.
 * 어떤 모양으로 왔는지 기록이 없어 다음 수를 둘 수 없었다. 모양만(내용 말고) 남긴다.
 */
test('짐작 못 한 키로 와도 충분히 긴 문자열이면 본문으로 받는다', () => {
  const body = '가'.repeat(400)
  assert.equal(parseReportHighlight(JSON.stringify({ highlight_text: body }), '제목').text, body)
  // 제목 한 줄짜리 짧은 문자열은 본문으로 오인하지 않는다.
  assert.throws(() => parseReportHighlight(JSON.stringify({ label: '짧은 제목' }), '제목'), /본문을 찾지 못했습니다/)
})

test('파싱 실패에는 응답 모양이 함께 남고, 본문 내용은 남지 않는다', () => {
  const secretish = '고객 본문이 그대로 새면 안 된다'
  try {
    parseReportHighlight(JSON.stringify({ label: secretish, count: 3, items: [1, 2] }), '제목')
    assert.fail('던지지 않았다')
  } catch (error) {
    const message = (error as Error).message
    assert.match(message, /응답 모양/)
    assert.match(message, /label:string/)
    assert.match(message, /items:array\(2\)/)
    assert.ok(!message.includes(secretish), `본문이 오류 문구에 들어갔다: ${message}`)
  }
})
