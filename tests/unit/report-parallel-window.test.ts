import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import OpenAI from 'openai'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { sectionLengthPlan, sectionPrompt } from '../../src/report/report-generator.js'
import { SECTION_PARALLELISM, canStartSection, generateReportSectionNow } from '../../src/report/report-queue.js'
import { createOrGetReportRecord, mutateReportRecord } from '../../src/report/report-store.js'
import type { BirthInput, SajuReport, SajuReportSection } from '../../src/types/index.js'

/**
 * 리포트 안 병렬 생성 + 첫 항목 우선 + 분량 규격 (2026-09-17).
 *
 * 시간 ≈ 출력 토큰 ÷ 초당 토큰 ÷ 동시 수. 항목 하나 21~63초 × 48개를 한 줄로 세워 30분이던
 * 것을, 첫 항목만 혼자 먼저 만들고 그 뒤는 창(window) 안에서 나란히 만든다.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
const analysis = analyzeSaju(birth)
const context = { serviceKey: 'love_this_year', name: '병렬점검', concern: '특별한 문제 없이 잘 지내고 있습니다.' }
const owner = { id: 'parallel-window-test-owner' }
const section = (id: string, order: number): SajuReportSection => ({ id, order, imageKey: '', imageSrc: '', imageAlt: '', category: '관계', categoryEn: 'Love', classification: `${id} 기준`, hook: '', patternKeys: [], ragTopics: [], interpretation: '' })
const template = (ids: string[]): SajuReport => ({ title: '테스트', subtitle: '', model: 'template', generatedBy: 'template', sections: ids.map((id, index) => section(id, index + 1)) })
const withStatus = (statuses: Array<SajuReportSection['status']>): SajuReportSection[] => statuses.map((status, index) => ({ ...section(`s${index + 1}`, index + 1), status }))

const sdkCreate = OpenAI.Chat.Completions.prototype.create
const previousKey = process.env.OPENAI_API_KEY
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-parallel-window'
after(() => { OpenAI.Chat.Completions.prototype.create = sdkCreate; if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey })

describe('리포트 안 병렬 창', { concurrency: false }, () => {
  it('첫 항목이 끝나기 전에는 창이 1이다 — 서머리가 혼자 먼저 나온다', () => {
    const all = withStatus(['pending', 'pending', 'pending', 'pending'])
    assert.equal(canStartSection(all, 0), true)
    assert.equal(canStartSection(all, 1), false)
    assert.equal(canStartSection(all, 3), false)
    const firstRunning = withStatus(['generating', 'pending', 'pending'])
    assert.equal(canStartSection(firstRunning, 1), false)
  })

  it('첫 항목이 끝나면 head 부터 창 안의 항목이 나란히 시작한다', () => {
    const sections = withStatus(['complete', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'])
    for (let position = 1; position <= 6; position += 1) assert.equal(canStartSection(sections, position, 6), true, `position ${position}`)
    // 창 밖(head 1 + 6 = 7)은 기다린다.
    assert.equal(canStartSection(sections, 7, 6), false)
    assert.equal(canStartSection(sections, 8, 6), false)
  })

  it('창이 꽉 차면 더 시작하지 않고, 실패한 칸은 창을 막지 않는다', () => {
    const busy = withStatus(['complete', 'generating', 'generating', 'generating', 'pending', 'pending'])
    assert.equal(canStartSection(busy, 4, 3), false, '창 3이 다 도는 중이면 넷째는 기다린다')
    assert.equal(canStartSection(busy, 4, 4), true)
    const failedHead = withStatus(['complete', 'failed', 'failed', 'pending', 'pending'])
    // head 는 첫 pending/generating(3). 실패한 1·2 는 세지 않는다.
    assert.equal(canStartSection(failedHead, 3, 2), true)
    assert.equal(canStartSection(failedHead, 4, 2), true)
    // 되살리기(실패 칸 재시도)는 head 앞이라 언제나 허용된다.
    assert.equal(canStartSection(failedHead, 1, 2), true)
  })

  it('기본 창은 6이고 환경 변수로 1~12 사이에서 조절한다', () => {
    assert.ok(SECTION_PARALLELISM >= 1 && SECTION_PARALLELISM <= 12)
    assert.equal(SECTION_PARALLELISM, Math.min(Math.max(Number(process.env.REPORT_SECTION_PARALLELISM) || 6, 1), 12))
  })

  it('저장소를 거치는 실제 경로에서도 창 규칙이 적용된다', async () => {
    const reportId = randomUUID()
    await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(['one', 'two', 'three']), owner })
    let calls = 0
    OpenAI.Chat.Completions.prototype.create = (async () => { calls += 1; throw new Error('model unavailable') }) as unknown as typeof sdkCreate

    // 첫 항목이 아직이면 셋째는 시작하지 않는다.
    const waiting = await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'three', owner })
    assert.equal(waiting.status, 'pending'); assert.equal(calls, 0)

    // 첫 항목이 끝나면 둘째가 아직 pending 이어도 셋째를 시작한다(창 안).
    await mutateReportRecord(reportId, owner, (record) => { Object.assign(record.report.sections[0], { status: 'complete', hook: '첫 항목', interpretation: '첫 항목 본문입니다. 두 문장입니다.' }) })
    await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'three', owner })
    assert.ok(calls > 0, '첫 항목이 끝났는데도 둘째를 기다리면 병렬이 아니다')
  })

  it('분량 규격: 첫 항목 두텁게, 하이라이트 두텁게, 나머지는 400~700자', () => {
    assert.deepEqual(sectionLengthPlan({ order: 1, category: '지금 나와도 되는 흐름?', classification: '전체 판정' }), { weight: 'opening', min: 1200, max: 1600 })
    assert.deepEqual(sectionLengthPlan({ order: 25, category: '퇴사 타이밍', classification: '유리한 달' }), { weight: 'highlight', min: 1100, max: 1500 })
    assert.deepEqual(sectionLengthPlan({ order: 43, category: '멘탈과 주변', classification: '다섯 스승의 서로 다른 조언' }), { weight: 'highlight', min: 1100, max: 1500 })
    assert.deepEqual(sectionLengthPlan({ order: 44, category: '현실 액션 플랜', classification: '이번 주 할 일' }), { weight: 'highlight', min: 1100, max: 1500 })
    assert.deepEqual(sectionLengthPlan({ order: 12, category: '번아웃 체크', classification: '몸이 먼저 보내는 신호' }), { weight: 'standard', min: 450, max: 700 })
    // 프롬프트에 실린다.
    const messages = sectionPrompt(analysis, birth, context, { ...section('two', 2), category: '번아웃 체크', classification: '몸이 먼저 보내는 신호' })
    assert.match(String(messages[1].content), /분량 규격: 본문 450~700자/)
    const opening = sectionPrompt(analysis, birth, context, { ...section('one', 1) })
    assert.match(String(opening[1].content), /1,200~1,600자/)
  })

  it('큐 실행은 파도(wave)로 나란히 만들고, 첫 항목 전엔 한 칸씩 간다', () => {
    const queue = readFileSync(join(root, 'src/report/report-queue.ts'), 'utf8')
    assert.match(queue, /Promise\.all\(wave\.map/)
    assert.match(queue, /\.slice\(0, SECTION_PARALLELISM\)/)
    assert.match(queue, /if \(!canStartSection\(current\.report\.sections, position\)\) return false/)
  })
})
