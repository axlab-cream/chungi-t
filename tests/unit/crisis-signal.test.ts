import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Request, Response } from 'express'
import { CRISIS_REPLACEMENT, crisisGuard, hasCrisisMarker, hasCrisisSignal, redactCrisisPayload, redactCrisisText } from '../../src/safety/crisis-signal.js'
import { buildTemplateSajuReport, sectionPrompt, summaryPrompt, verdictPrompt } from '../../src/report/report-generator.js'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import type { BirthInput, SajuReportContext } from '../../src/types/index.js'

/** 공통 절대 선 2번 — 마음 위기(2026-10-16). */
describe('마음 위기 신호', () => {
  it('위기 말은 잡고, 일상 과장·뉴스 이야기는 잡지 않는다', () => {
    for (const text of ['요즘 다 그만두고 죽고 싶어요', '자살 생각이 자꾸 나요', '어제 자해했어요', '그냥 사라지고 싶다', '살고 싶지 않아', '목숨을 끊을까 봐요', '극단적인 선택을 생각했어요']) {
      assert.ok(hasCrisisSignal(text), text)
    }
    for (const text of ['I want to die', "I don't want to live anymore", '消えたい', '그냥 죽어버릴래', '유서를 작성했어요']) {
      assert.ok(hasCrisisSignal(text), text)
    }
    for (const text of ['배고파 죽겠어', '힘들어 죽겠다', '웃겨 죽겠네', '드라마에서 자살 장면이 나왔어', '자살골 넣은 선수', '이직하고 싶어요',
      '죽고 싶지 않아요', '자살을 예방하는 일을 해요', '뉴스에서 자살 관련 기사를 봤다', '드라마에서 극단적인 선택 장면이 나왔다', '死にたくない', 'suicide prevention month']) {
      assert.ok(!hasCrisisSignal(text), text)
    }
  })

  it('위기 문장만 중립 문장으로 바꾸고 나머지 고민은 남긴다(원문은 남지 않음)', () => {
    const { text, detected } = redactCrisisText('이직이 고민이에요. 요즘은 그냥 죽고 싶어요. 자살 생각도 나요. 돈도 걱정이에요.')
    assert.equal(detected, true)
    assert.equal(text, `이직이 고민이에요. ${CRISIS_REPLACEMENT} 돈도 걱정이에요.`)
    assert.ok(!/죽고|자살/.test(text))
    assert.deepEqual(redactCrisisText('이직이 고민이에요.'), { text: '이직이 고민이에요.', detected: false })
  })

  it('요청 본문 어디에 있어도 바꾼다(고민 칸·상대 메모·대화 기록)', () => {
    const { value, detected } = redactCrisisPayload({ year: 1990, concern: '죽고 싶어요', partner: { relationship: '연인' }, history: [{ role: 'user', content: '자해했어' }] })
    assert.equal(detected, true)
    assert.equal(value.concern, CRISIS_REPLACEMENT)
    assert.equal(value.history[0].content, CRISIS_REPLACEMENT)
    assert.equal(value.partner.relationship, '연인')
    assert.ok(hasCrisisMarker(value))
    // 음성 base64 처럼 사람 글이 아닌 긴 기호 덩어리는 건드리지 않는다.
    const audio = 'A'.repeat(300) + 'suicide' + 'B'.repeat(300)
    assert.equal(redactCrisisPayload({ audio, text: '죽고 싶어' }).value.audio, audio)
  })

  it('서버 입구: 일반 API 는 바꾸고, 사람이 읽는 1:1 문의는 원문을 둔다', () => {
    const run = (url: string) => {
      const req = { originalUrl: url, method: 'POST', body: { concern: '죽고 싶어요' } } as unknown as Request
      const res = { locals: {} } as unknown as Response
      let called = false
      crisisGuard(req, res, () => { called = true })
      return { body: req.body as { concern: string }, flagged: (res.locals as { crisisSignal?: boolean }).crisisSignal === true, called }
    }
    const warn = console.warn
    console.warn = () => {}
    try {
      const analyze = run('/api/saju/analyze')
      assert.equal(analyze.body.concern, CRISIS_REPLACEMENT)
      assert.ok(analyze.flagged && analyze.called)
      const inquiry = run('/api/user/inquiries')
      assert.equal(inquiry.body.concern, '죽고 싶어요')
      assert.ok(!inquiry.flagged && inquiry.called)
    } finally { console.warn = warn }
  })

  it('리포트 AI: 위기 문맥이면 모든 항목에 운세 해석 금지, 109 안내는 첫 항목·요약에만', () => {
    const birth: BirthInput = { year: 1990, month: 3, day: 5, hour: 9, minute: 0, gender: 'female', calendar: 'solar' }
    const analysis = analyzeSaju(birth)
    const crisis: SajuReportContext = { serviceKey: 'saju_master', birthTimeKnown: true, concern: `이직이 고민이에요. ${CRISIS_REPLACEMENT}` }
    const calm: SajuReportContext = { serviceKey: 'saju_master', birthTimeKnown: true, concern: '이직이 고민이에요.' }
    const sections = buildTemplateSajuReport(analysis, birth, crisis).sections
    const system = (ctx: SajuReportContext, index: number) => sectionPrompt(analysis, birth, ctx, sections[index], sections)[0].content
    assert.match(system(crisis, 0), /\[안전 우선\]/)
    // 공통 지시문에는 이미 고정 연락처 목록(109 등)이 있다. 여기서는 "첫머리에 한 번 안내" 지시가 붙는지만 본다.
    const HOTLINE_NOW = /첫머리에서 한 번만/
    assert.match(system(crisis, 0), HOTLINE_NOW)
    assert.match(system(crisis, 3), /\[안전 우선\]/)
    assert.doesNotMatch(system(crisis, 3), HOTLINE_NOW)
    assert.doesNotMatch(system(calm, 0), /안전 우선|첫머리에서 한 번만/)
    assert.match(summaryPrompt(analysis, birth, crisis)[0].content, HOTLINE_NOW)
    assert.match(verdictPrompt(analysis, birth, crisis)[0].content, /\[안전 우선\]/)
    // 무료 틀 글이 고민을 인용해도 원문 대신 중립 문장만 보인다.
    const visible = sections.map((section) => `${section.hook}\n${section.interpretation}`).join('\n')
    assert.ok(!/죽고|자살|자해/.test(visible))
  })
})
