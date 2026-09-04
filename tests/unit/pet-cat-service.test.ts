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
    const bodies = owned.map((section) => section.interpretation.split('\n\n')[1])
    assert.equal(new Set(bodies).size, owned.length, `${group.id} 의 항목들이 서로 다르게 읽혀야 합니다`)
  })

  // 06 상세 lays five authored blocks over the reading; a shorter one would leave the
  // design's own sample copy in place.
  report.sections.forEach((section) => {
    assert.ok(section.interpretation.split('\n\n').length >= 6, `${section.id} 문단이 6개보다 적습니다`)
  })

  // The reading has to reach the guardian's own 원국 and this cat, not a template.
  const opening = report.sections[0].interpretation
  assert.match(opening, /나비/)
  assert.match(opening, /1묘 가정/)
  assert.match(opening, /낯가림/)
  assert.match(opening, /밤에 자꾸 깨워서 잠을 못 자요/)

  // 건강·수명은 이 서비스가 답할 자리가 아니라는 고지가 매 항목에 있어야 한다.
  report.sections.forEach((section) => {
    assert.match(section.interpretation, /수의사/, `${section.id} 안전 고지 누락`)
  })

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

test('고양이 궁합 reads each 대분류 from its own seat', () => {
  const input = parseCatCompatRequest({ ...answers })
  const analysis = analyzeSaju(birth)
  const context = buildCatCompatContext('지민', input)
  const report = buildCatCompatReport(analysis, birth, context, input, 'seat-check')

  const distance = report.sections.find((section) => section.category === '거리감 궁합')
  const elements = report.sections.find((section) => section.category === '오행 밸런스 케어')
  const burnout = report.sections.find((section) => section.category === '집사 번아웃 방지')
  assert.ok(distance && elements && burnout)
  assert.match(distance.interpretation.split('\n\n')[1], /일지/)
  assert.match(elements.interpretation.split('\n\n')[1], /오행/)
  assert.match(burnout.interpretation.split('\n\n')[1], /인성/)
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

test('모든 항목이 반려묘 코퍼스를 근거로 인용한다', () => {
  const input = parseCatCompatRequest({ ...answers })
  const analysis = analyzeSaju(birth)
  const context = buildCatCompatContext('지민', input)
  const report = buildCatCompatReport(analysis, birth, context, input, 'corpus-coverage')

  // 코퍼스에서 쓸 문장을 찾지 못하면 서비스 자체 문장으로 떨어진다. 반려묘 팩이 들어온
  // 뒤로는 50항목 전부가 실제 근거를 인용해야 한다.
  const fallback = report.sections.filter((section) =>
    section.interpretation.includes('함께 사는 궁합은 애정의 크기보다'))
  assert.equal(fallback.length, 0, `${fallback.length}개 항목이 근거 없이 기본 문장을 씁니다`)

  // 한 블록만 반복 인용하면 리포트가 같은 말을 50번 하게 된다.
  const cited = report.sections.map((section) =>
    section.interpretation.split('\n\n')[4]
      .replace(/^참고할 결은 이렇네\. /, '')
      .replace(/ 그러니 결론을.*$/, ''))
  assert.ok(new Set(cited).size >= 20, `인용 문장이 ${new Set(cited).size}종류뿐입니다`)
})
