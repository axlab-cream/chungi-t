import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { buildTemplateSajuReport } from '../../src/report/report-generator.js'
import {
  buildLoveThisYearStoryBeat,
  calculateLoveMonthlySignals,
  formatStoryInterpretation,
  loveThisYearHook,
} from '../../src/report/storytelling.js'
import type { BirthInput, SajuReportContext } from '../../src/types/index.js'

const sampleBirth: BirthInput = {
  year: 1975,
  month: 9,
  day: 26,
  hour: 12,
  gender: 'male',
  calendar: 'solar',
}

const loveContext: SajuReportContext = {
  name: '정재용',
  target: '본인',
  serviceKey: 'love_this_year',
  concern: '올해 새로운 연애가 들어오는 시기와 놓치기 쉬운 타이밍이 궁금해요.',
  relationship: '마음에 둔 사람이 있어요',
  orientation: '이성 관계 중심',
  work: '일상 흐름',
  partner: {
    mode: 'known',
    name: '상대',
    relationship: '썸/관심 상대',
    birthTimeKnown: false,
    birth: {
      year: 1991,
      month: 4,
      day: 12,
      hour: 12,
      minute: 0,
      gender: 'female',
      calendar: 'solar',
    },
  },
}

describe('love_this_year storytelling shape', () => {
  it('섹션마다 감성 훅·feel·scene·actions·imagePrompt를 붙인다', () => {
    const analysis = analyzeSaju(sampleBirth)
    const report = buildTemplateSajuReport(analysis, sampleBirth, loveContext)

    assert.equal(report.sections.length, 10)
    for (const section of report.sections) {
      assert.ok(section.storytelling, `${section.id} missing storytelling`)
      assert.ok(section.hook.length > 8)
      assert.notEqual(section.hook, section.category)
      assert.notEqual(section.hook, section.classification)
      assert.ok(section.storytelling.feel.includes('네') || section.storytelling.feel.includes('군') || section.storytelling.feel.includes('세') || section.storytelling.feel.length > 20)
      assert.ok(section.storytelling.scene.length > 20)
      assert.ok(section.storytelling.actions.length >= 2)
      assert.ok(section.storytelling.imagePrompt.ko.length > 10)
      assert.ok(section.storytelling.imagePrompt.en.length > 10)
      assert.ok(section.interpretation.includes('[주요 포인트]'))
      assert.ok(section.interpretation.includes('장면 이미지 힌트'))
      // No textbook methodology markers in user copy
      assert.equal(section.interpretation.includes('[근거]'), false)
      assert.equal(section.interpretation.includes('[논리]'), false)
      assert.equal(section.interpretation.includes('RAG'), false)
    }
  })

  it('월별 흐름 섹션에 차트 포인트와 표를 포함한다', () => {
    const analysis = analyzeSaju(sampleBirth)
    const beat = buildLoveThisYearStoryBeat('love-monthly-flow', analysis, loveContext, ['연애운'], sampleBirth)
    const text = formatStoryInterpretation(beat)

    assert.equal(beat.chartPoints?.length, 12)
    assert.ok(beat.chartPoints?.every((point) => Number.isInteger(point.value) && point.value >= 0 && point.value <= 3))
    assert.ok(beat.tableMd && beat.tableMd.includes('|'))
    assert.ok(text.includes('선택한 신호'))
    assert.ok(!text.includes('<!--chart:'), '내부 차트 JSON을 고객 원문에 노출하지 않는다')
    assert.ok(loveThisYearHook('love-dohwa-months', analysis, loveContext, sampleBirth).includes('공기') || loveThisYearHook('love-dohwa-months', analysis, loveContext, sampleBirth).includes('월'))
  })

  it('연애 흐름 그래프는 실제 월주와 개인 도화·보완 기운에서만 신호를 센다', () => {
    const analysis = analyzeSaju(sampleBirth)
    const first = calculateLoveMonthlySignals(sampleBirth, analysis, 2026)
    const next = calculateLoveMonthlySignals(sampleBirth, analysis, 2027)
    assert.equal(first.length, 12)
    assert.equal(next.length, 12)
    assert.ok(first.some((point, index) => point.value !== next[index]?.value || point.note !== next[index]?.note))
    assert.ok(first.every((point) => /^\d{1,2}월$/.test(point.label) && point.value <= 3))
    assert.ok(first.some((point) => point.note.includes('도화') || point.note.includes('보완')))
    assert.ok(first.every((point) => !point.note.includes('성공률') && !point.note.includes('확률')))
  })

  it('기존 저장 리포트의 화면용 퍼센트 대신 로그인 API의 새 계산값을 그린다', () => {
    const source = readFileSync('사주/js/umsh-report-access.js', 'utf8')
    const server = readFileSync('src/server/app.ts', 'utf8')
    assert.match(server, /record\.analysis\?\.fortune\?\.currentYear \?\? analysis\.fortune\?\.currentYear/)
    assert.match(server, /calculateLoveMonthlySignals\(record\.birth, currentAnalysisForRecord\(record\), loveReportYear\)/)
    assert.match(source, /payload && payload\.loveMonthlySignals/)
    assert.match(source, /renderStoryChart\(monthly, .*?, 3\)/)
    assert.match(source, /section\.id === 'love-monthly-flow'/)
  })

  it('소비자 훅은 상품 제목 반복이 아니라 장면형이다', () => {
    const analysis = analyzeSaju(sampleBirth)
    const hooks = [
      'love-year-possibility',
      'love-missed-signals',
      'love-action-strategy',
    ].map((id) => loveThisYearHook(id, analysis, loveContext, sampleBirth))

    assert.ok(hooks.every((hook) => !hook.includes('올해 연애 가능성') || hook.includes('마음')))
    assert.ok(hooks.some((hook) => hook.includes('마음') || hook.includes('인연') || hook.includes('놓친')))
  })
})
