import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { buildTemplateSajuReport } from '../../src/report/report-generator.js'
import {
  addressName,
  applyServiceTone,
  neutralizeDosase,
  toneClose,
} from '../../src/report/report-tone.js'
import { clipCompleteSentences } from '../../src/report/text-clip.js'
import {
  buildMoneySaveContext,
  buildMoneySaveReport,
  parseMoneySaveRequest,
} from '../../src/money/save-service.js'
import type { BirthInput, SajuReportContext } from '../../src/types/index.js'

const birth: BirthInput = {
  year: 1990,
  month: 5,
  day: 12,
  hour: 10,
  minute: 0,
  gender: 'female',
  calendar: 'solar',
}

describe('report tone helpers', () => {
  it('addressName / toneClose keep 자네 only for saju_master', () => {
    assert.equal(toneClose('saju_master'), 'classic')
    assert.equal(toneClose(undefined), 'classic')
    assert.equal(toneClose('home_fit'), 'neutral')
    assert.equal(toneClose('money_save'), 'neutral')
    assert.equal(addressName({}, 'saju_master'), '자네')
    assert.equal(addressName({}, 'home_fit'), '당신')
    assert.equal(addressName({ name: '민수' }, 'home_fit'), '민수')
    assert.equal(addressName({ name: '민수' }, 'saju_master'), '민수')
  })

  it('neutralizeDosase strips 자네 and 도사 endings', () => {
    const raw = '자네의 결이 보이는군. 법일세. 봐야 하네. 가려보게.'
    const next = neutralizeDosase(raw)
    assert.equal(next.includes('자네'), false)
    assert.equal(next.includes('일세'), false)
    assert.equal(next.includes('하네'), false)
    assert.equal(next.includes('보게'), false)
    assert.equal(applyServiceTone(raw, 'saju_master'), raw)
    assert.notEqual(applyServiceTone(raw, 'work_move'), raw)
  })
})

describe('specialized template tone', () => {
  it('home_fit / work_move templates omit 일세 and 자네', () => {
    const analysis = analyzeSaju(birth)
    const homeContext: SajuReportContext = {
      name: '민수',
      serviceKey: 'home_fit',
      home: {
        buildingType: 'apartment',
        mainPurpose: 'rest',
        stayDecision: 'fix',
      },
    }
    const home = buildTemplateSajuReport(analysis, birth, homeContext)
    const homeText = home.sections.map((s) => `${s.hook}\n${s.interpretation}`).join('\n')
    assert.equal(homeText.includes('자네'), false)
    assert.equal(homeText.includes('일세'), false)

    const workContext: SajuReportContext = {
      name: '민수',
      serviceKey: 'work_move',
      workMove: {
        decisionMode: 'offer',
        priority: 'growth',
      },
    }
    const work = buildTemplateSajuReport(analysis, birth, workContext)
    const workText = work.sections.map((s) => `${s.hook}\n${s.interpretation}`).join('\n')
    assert.equal(workText.includes('자네'), false)
    assert.equal(workText.includes('일세'), false)
  })

  it('money_save template omits 일세 and 자네', () => {
    const analysis = analyzeSaju(birth)
    const input = parseMoneySaveRequest({
      moneyHabit: '월급날 이후 일주일에 많이 씁니다',
      incomePattern: '고정 월급',
      leakPoint: '모임과 선물',
      relationSpending: '거절이 어려운 편',
      savingGoal: '비상금',
      concern: '월말이면 돈이 남지 않습니다.',
    })
    const context = buildMoneySaveContext('민수', input)
    const report = buildMoneySaveReport(analysis, birth, context, input, 'tone-test')
    const text = report.sections.map((s) => s.interpretation).join('\n')
    assert.equal(text.includes('자네'), false)
    assert.equal(text.includes('일세'), false)
  })

  it('saju_master draft stays readable without forced mystical interjections', () => {
    const analysis = analyzeSaju(birth)
    const report = buildTemplateSajuReport(analysis, birth, {
      name: '민수',
      serviceKey: 'saju_master',
      concern: '직장 고민',
    })
    const text = report.sections.map((s) => `${s.hook}\n${s.interpretation}`).join('\n')
    assert.match(text, /민수/)
    assert.doesNotMatch(text, /읽겠요|편재이|95점 번들|hot\/dry/)
    assert.match(text, /전통|상징/)
  })
})

describe('clipCompleteSentences', () => {
  it('shortens on sentence boundaries without trailing …', () => {
    const long =
      '첫 문장은 완전히 끝납니다. 두 번째 문장도 여기서 끝납니다. 세 번째 문장은 중간에 잘리면 안 되는 긴 내용을 계속 이어 갑니다.'
    const clipped = clipCompleteSentences(long, 36)
    assert.equal(clipped.includes('…'), false)
    assert.equal(clipped.includes('...'), false)
    assert.match(clipped, /[.!?。]$/)
    assert.ok(clipped.length <= long.length)
    assert.ok(clipped.startsWith('첫 문장은'))
  })

  it('returns full text when there is no sentence boundary rather than mid-cutting', () => {
    const raw = '문장부호가없는아주긴티저문장이지만중간에자르지않습니다'
    const clipped = clipCompleteSentences(raw, 12)
    assert.equal(clipped, raw)
    assert.equal(clipped.includes('…'), false)
  })
})
