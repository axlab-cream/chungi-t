import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getCorpusDomainBoost, getCorpusDomainBoostForService } from '../../src/rag/corpus-registry.js'
import { retrieveRagChunks } from '../../src/rag/retriever.js'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { buildTemplateSajuReport } from '../../src/report/report-generator.js'
import { cmdgRagContext, cmdgSectionContext } from '../../src/report/cmdg-reading-contract.js'

/**
 * 천명사주 참고서 검색 범위.
 * ① 다른 서비스 전용 팩의 우선 점수는 그 서비스에서만 붙는다(천명사주부터 적용).
 * ② 고민 문장은 관련 장의 검색어에만 넣는다. 고민이 "이직"이어도 성격 장에 이직 자료가 오지 않는다.
 */
const birth = { year: 1987, month: 6, day: 10, hour: 20, minute: 0, calendar: 'solar', gender: 'female' } as const
const context = { serviceKey: 'saju_master', target: '본인', concern: '이직이 맞는지 궁금해요', birthTimeKnown: true }
const OTHER_SERVICE_DOMAINS = new Set(['work_move_service', 'job_choice_service', 'quit_fortune_service', 'work_job_service', 'money_save_service', 'home_fit_service', 'lucky_color_service', 'cat_compatibility_service'])

describe('천명사주 참고서 검색 범위', () => {
  it('다른 서비스 팩의 우선 점수는 어느 서비스에서도 붙지 않고, 그 서비스에서는 그대로 붙는다', () => {
    assert.ok(getCorpusDomainBoost('work_move_service') > 0)
    assert.equal(getCorpusDomainBoostForService('work_move_service', 'saju_master'), 0)
    assert.equal(getCorpusDomainBoostForService('work_move_service', 'work_move'), getCorpusDomainBoost('work_move_service'))
    assert.equal(getCorpusDomainBoostForService('saju_master_service', 'saju_master'), getCorpusDomainBoost('saju_master_service'), '자기 팩은 유지')
    assert.equal(getCorpusDomainBoostForService('saju_95_quality_bundles', 'saju_master'), getCorpusDomainBoost('saju_95_quality_bundles'), '공용 팩은 유지')
    assert.equal(getCorpusDomainBoostForService('work_move_service', 'love_this_year'), 0, '모든 서비스에 같은 규칙')
    assert.equal(getCorpusDomainBoostForService('work_move_service', undefined), 0, '서비스를 모르는 호출에도 서비스 팩 우선 점수는 없다')
    assert.equal(getCorpusDomainBoostForService('saju_95_quality_bundles', undefined), getCorpusDomainBoost('saju_95_quality_bundles'), '공용 팩은 그대로')
  })

  it('고민은 고민·이직·마무리 장에만 검색어로 쓰고, 성격·연애 장에서는 뺀다', () => {
    assert.equal(cmdgRagContext(context, 'concern-loop').concern, context.concern)
    assert.equal(cmdgRagContext(context, 'career-transition').concern, context.concern)
    assert.equal(cmdgRagContext(context, 'action-guide').concern, context.concern)
    assert.equal(cmdgRagContext(context, 'hidden-personality').concern, undefined)
    assert.equal(cmdgRagContext(context, 'wealth-flow').concern, undefined, '이직 고민은 돈 장 검색에 넣지 않는다')
    assert.equal(cmdgRagContext({ ...context, concern: '월급이 늘 모자라요' }, 'wealth-flow').concern, '월급이 늘 모자라요')
    assert.equal(cmdgRagContext({ ...context, concern: '재회하고 싶어요' }, 'love-loop').concern, '재회하고 싶어요')
    assert.equal(cmdgRagContext({ ...context, serviceKey: 'work_move' }, 'hidden-personality').concern, context.concern, '다른 서비스는 그대로')
  })

  it('일 답은 일·돈 장에만, 연애 상대·관계 답은 연애 장에만 검색어로 쓴다', () => {
    const full = { ...context, orientation: '이성 관계 중심 · 연애 상대 남자', relationship: '솔로예요', work: '직장 다녀요' }
    const personality = cmdgRagContext(full, 'hidden-personality')
    assert.equal(personality.work, undefined)
    assert.equal(personality.relationship, undefined)
    assert.equal(personality.orientation, undefined)
    assert.equal(cmdgRagContext(full, 'career-money').work, full.work)
    assert.equal(cmdgRagContext(full, 'career-money').relationship, undefined)
    assert.equal(cmdgRagContext(full, 'destiny-partner').relationship, full.relationship)
    assert.equal(cmdgRagContext(full, 'destiny-partner').orientation, full.orientation)
    assert.equal(cmdgRagContext(full, 'destiny-partner').work, undefined)
    assert.equal(cmdgRagContext(full, 'concern-loop').work, full.work, '고민 장은 둘 다 본다')
    assert.equal(cmdgRagContext(full, 'concern-loop').relationship, full.relationship)
    assert.equal(cmdgRagContext({ ...full, serviceKey: 'work_move' }, 'hidden-personality').work, full.work, '다른 서비스는 그대로')
  })

  it('실제 천명사주 경로처럼 서비스 키가 비어 있어도 같은 범위·같은 7칸이 된다', () => {
    // app.ts parseReportContext 는 천명사주 키를 비워 둔다. 키를 넣은 테스트만 있어 10/14 수정이 운영에서 꺼진 걸 놓쳤다.
    const full = { ...context, orientation: '이성 관계 중심 · 연애 상대 남자', relationship: '솔로예요', work: '직장 다녀요' }
    const { serviceKey: _serviceKey, ...emptyKey } = full
    const { serviceKey: _scoped, ...scopedFull } = cmdgRagContext(full, 'hidden-personality')
    assert.deepEqual(cmdgRagContext(emptyKey, 'hidden-personality'), scopedFull)
    const analysis = analyzeSaju(birth)
    const sections = buildTemplateSajuReport(analysis, birth, full).sections
    for (const section of sections) {
      const query = `${section.category} ${section.classification}`
      const ids = (ctx: typeof full | typeof emptyKey) => retrieveRagChunks(query, analysis, 7, cmdgRagContext(cmdgSectionContext(ctx, section.id), section.id), undefined, true).map((chunk) => chunk.id)
      // 같은 7칸인지 본다. 점수가 거의 같은 칸끼리는 서비스 키 단어 하나로 순서가 바뀔 수 있다(2026-10-16 갈래표).
      assert.deepEqual(ids(emptyKey).sort(), ids(full).sort(), section.id)
    }
  })

  it('판매 중지 서비스 자료는 어디에도 오지 않고, 고민이 이직이어도 성격 장(1~5장)에는 다른 서비스 자료가 오지 않는다', () => {
    const analysis = analyzeSaju(birth)
    const sections = buildTemplateSajuReport(analysis, birth, context).sections
    const PAUSED = new Set(['home_fit_service', 'lucky_color_service', 'pass_angle_service', 'newyear_service', 'wedding_day_service'])
    const PERSONALITY = new Set(['profile', 'day-master-strength', 'hidden-personality', 'balance', 'useful-god-eokbu'])
    const paused: string[] = []
    const personality: string[] = []
    for (const section of sections) {
      const ragContext = cmdgRagContext(cmdgSectionContext(context, section.id), section.id)
      const query = [ragContext.target, ragContext.concern].filter(Boolean).join(' ')
      const chunks = retrieveRagChunks(`${section.category} ${section.classification} ${section.ragTopics.join(' ')} ${query}`, analysis, 7, ragContext, undefined, true)
      for (const chunk of chunks) {
        if (PAUSED.has(chunk.domain ?? '')) paused.push(`${section.id}:${chunk.id}`)
        if (PERSONALITY.has(section.id) && OTHER_SERVICE_DOMAINS.has(chunk.domain ?? '')) personality.push(`${section.id}:${chunk.id}`)
      }
    }
    assert.deepEqual(paused, [])
    assert.deepEqual(personality, [])
  })

  it('관계·일·연애 상대를 다 입력해도 입력 안내 조각이 7칸을 차지하지 않는다(다른 서비스는 그대로 고정)', () => {
    const analysis = analyzeSaju(birth)
    const full = { ...context, orientation: '이성 관계 중심 · 연애 상대 남자', relationship: '솔로예요', work: '직장 다녀요' }
    const sections = buildTemplateSajuReport(analysis, birth, full).sections
    for (const section of sections) {
      const ragContext = cmdgRagContext(cmdgSectionContext(full, section.id), section.id)
      const chunks = retrieveRagChunks(`${section.category} ${section.classification}`, analysis, 7, ragContext, undefined, true)
      assert.equal(chunks.filter((chunk) => chunk.domain === 'input_context_interpretation').length, 0, section.id)
    }
    const love = retrieveRagChunks('올해 연애', analysis, 7, { serviceKey: 'love_this_year', target: '본인', relationship: '솔로예요' }, undefined, true)
    assert.ok(love.some((chunk) => chunk.id === 'ic-008'), '연애운은 기존처럼 관계 안내를 고정')
  })
})
