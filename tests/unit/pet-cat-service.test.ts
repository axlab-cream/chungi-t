import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildCatCompatContext,
  buildCatCompatReport,
  CAT_COMPAT_TOC,
  createCatCompatReportId,
  parseCatCompatRequest,
} from '../../src/pet/cat-service.js'
import type { BirthInput } from '../../src/types/index.js'

const birth: BirthInput = {
  year: 1994,
  month: 3,
  day: 11,
  hour: 9,
  minute: 0,
  gender: 'female',
  calendar: 'solar',
}

const answers = {
  cat_nickname: '나비',
  cat_household: 'single_cat',
  cat_age_band: 'adult',
  cat_behavior_tags: ['shy', 'sensitive', 'night_runner'],
  cat_touch_style: 'short_touch',
  cat_play_energy: 'night',
  routine_flags: ['sleep_conflict', 'food_rhythm'],
  focus_area: 'distance',
  upcoming_event: 'clinic',
  free_note: '밤에 자꾸 깨워서 잠을 못 자요.',
}

test('고양이 궁합 builds a dedicated cat report', () => {
  const input = parseCatCompatRequest({ ...answers })
  const analysis = analyzeSaju(birth)
  const context = buildCatCompatContext('지민', input)
  const reportId = createCatCompatReportId('user-1', birth, input)
  const report = buildCatCompatReport(analysis, birth, context, input, reportId)

  assert.equal(report.reportId, reportId)
  assert.equal(report.title, '반려묘 생활 궁합 해석문')
  assert.equal(report.sections.length, 50)
  assert.equal(new Set(report.sections.map((section) => section.category)).size, 10)

  // 05 목차 and 06 상세 route on the design's own section ids.
  assert.equal(report.sections[0].id, 'guardian-dna')
  CAT_COMPAT_TOC.forEach((group) => {
    const owned = report.sections.filter((section) => group.items.some((item) => item.id === section.id))
    assert.equal(owned.length, group.items.length, `${group.id} 의 중분류 수가 목차와 다릅니다`)

    // Items inside one 대분류 must read differently, or the 05 목차 and 06 상세 would
    // show the same paragraph several times in a row.
    const bodies = owned.map((section) => section.interpretation.split('\n\n').find((paragraph) => paragraph.startsWith('[확인할 장면]')))
    assert.equal(new Set(bodies).size, owned.length, `${group.id} 의 항목들이 서로 다르게 읽혀야 합니다`)
  })

  // 06 상세 lays five authored blocks over the reading; a shorter one would leave the
  // design's own sample copy in place.
  report.sections.forEach((section) => {
    assert.ok(section.interpretation.split('\n\n').length >= 5, `${section.id} 문단이 5개보다 적습니다`)
  })

  // The reading has to reach the guardian's own 원국 and this cat, not a template.
  const opening = report.sections[0].interpretation
  assert.match(opening, /나비/)
  assert.match(opening, /1묘 가정/)
  assert.match(opening, /낯가림/)
  assert.match(opening, /밤에 자꾸 깨워서 잠을 못 자요/)

  // Health escalation belongs in relevant sections, not a repeated filler paragraph.
  assert.match(report.sections.find((section) => section.id === 'vet-grooming-timing')!.interpretation, /수의사/)
  assert.match(report.sections.find((section) => section.id === 'quiet-watch-timing')!.interpretation, /수의사/)

  // Korean particles: a label must never be followed by the wrong 조사.
  report.sections.forEach((section) => {
    assert.doesNotMatch(section.interpretation, /리듬라|\)라 |수준라/, `${section.id} 조사 오류`)
  })

  // Corpus scaffolding must never reach the page, and neither may advice written for a
  // different domain — the corpus has no 반려묘 material to quote.
  report.sections.forEach((section) => {
    assert.doesNotMatch(section.interpretation, /concept:|condition:|Feature JSON|출력하지|사용자/)
    assert.doesNotMatch(section.interpretation, /이직|퇴사|연봉|오퍼|배우자|합격/, `${section.id} 타 도메인 문장 유입`)
  })
})

test('고양이 궁합 separates reported behavior from guardian chart symbols', () => {
  const input = parseCatCompatRequest({ ...answers })
  const analysis = analyzeSaju(birth)
  const context = buildCatCompatContext('지민', input)
  const report = buildCatCompatReport(analysis, birth, context, input, 'seat-check')

  const distance = report.sections.find((section) => section.category === '거리감 궁합')
  const elements = report.sections.find((section) => section.category === '오행 밸런스 케어')
  const burnout = report.sections.find((section) => section.category === '집사 번아웃 방지')
  assert.ok(distance && elements && burnout)
  assert.match(distance.interpretation, /손길 반응.*짧게만/)
  assert.match(elements.interpretation, /보호자의 사주/)
  assert.doesNotMatch(burnout.interpretation, /인성이 얇아|소모가 빨리/)
})

test('고양이 궁합 request validates its required answers', () => {
  assert.throws(() => parseCatCompatRequest({}), /이름 또는 애칭/)
  assert.throws(() => parseCatCompatRequest({ cat_nickname: '나비' }), /가정 형태/)
  assert.throws(
    () => parseCatCompatRequest({ cat_nickname: '나비', cat_household: 'single_cat' }),
    /손길/,
  )
  assert.throws(
    () => parseCatCompatRequest({ cat_nickname: '나비', cat_household: 'single_cat', cat_touch_style: 'short_touch' }),
    /놀이 에너지/,
  )

  // 고양이 생일은 모를 수 있고, 그때는 행동 태그만으로 읽는다.
  const parsed = parseCatCompatRequest({ ...answers, cat_age_band: '' })
  assert.equal(parsed.ageBand, 'unknown')
  assert.deepEqual(parsed.behaviorTags, ['낯가림', '예민함', '밤 우다다'])
})

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const readJson = (rel: string) => JSON.parse(readFileSync(join(ROOT, rel), 'utf-8'))

test('반려묘 코퍼스 팩이 등록되어 있고 형식이 맞다', () => {
  const registry = readJson('data/corpus/registry.json')
  const pack = registry.packs.find((entry: { id: string }) => entry.id === 'cat-compatibility-service')
  assert.ok(pack, '코퍼스 레지스트리에 반려묘 팩이 없습니다')
  assert.equal(pack.status, 'active')
  assert.equal(pack.domain, 'cat_compatibility_service')

  const corpus = readJson(pack.path.startsWith('corpus/') ? `data/${pack.path}` : pack.path)
  assert.equal(corpus.domain, 'cat_compatibility_service')
  assert.ok(corpus.knowledgeBlocks.length >= 30, '판단 블록이 너무 적습니다')
  assert.ok(corpus.sources?.length, '출처가 비어 있습니다')

  const ids = corpus.knowledgeBlocks.map((block: { id: string }) => block.id)
  assert.equal(new Set(ids).size, ids.length, '중복된 블록 id가 있습니다')

  const required = ['id', 'topic', 'keywords', 'concept', 'condition', 'interpretation',
    'real_world_pattern', 'risk', 'opportunity', 'advice', 'confidence', 'forbidden_generalization']
  corpus.knowledgeBlocks.forEach((block: Record<string, unknown>) => {
    required.forEach((field) => assert.ok(field in block, `${block.id} 에 ${field} 없음`))
  })

  // 이 서비스는 질병·수명을 다루지 않는다. 코퍼스 문장도 같은 선을 지켜야 한다.
  corpus.knowledgeBlocks.forEach((block: { id: string; interpretation: string; advice: string }) => {
    const prose = `${block.interpretation} ${block.advice}`
    assert.doesNotMatch(prose, /진단|처방|투약|완치|수명/, `${block.id} 가 의료 판단에 들어갑니다`)
  })
})

test('고양이 항목마다 고유한 관찰과 대응이 있고 지시문을 복사하지 않는다', () => {
  const input = parseCatCompatRequest({ ...answers })
  const analysis = analyzeSaju(birth)
  const context = buildCatCompatContext('지민', input)
  const report = buildCatCompatReport(analysis, birth, context, input, 'specificity')
  const scenes = report.sections.map((section) => section.interpretation.split('\n\n').find((p) => p.startsWith('[확인할 장면]')))
  const actions = report.sections.map((section) => section.interpretation.split('\n\n').find((p) => p.startsWith('[해법]')))
  assert.equal(new Set(scenes).size, 50)
  assert.equal(new Set(actions).size, 50)
  report.sections.forEach((section) => assert.doesNotMatch(section.interpretation, /concept:|condition:|Feature JSON/))
})
