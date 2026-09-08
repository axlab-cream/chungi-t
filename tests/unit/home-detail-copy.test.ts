import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const html = readFileSync('사주/place/home/06-step-6_1-report-detail/index.html', 'utf8')
test('home detail preserves every paragraph without inventing repetitive headings', () => {
  const code = html.slice(html.indexOf('function dynamicBlocks('), html.indexOf('function dynamicActions('))
  const blocks = runInNewContext(code + '; dynamicBlocks({status:"complete",interpretation:"[공간 신호] 첫 문단\\n\\n둘째 문단\\n\\n셋째 문단"})')
  assert.equal(blocks.length, 3)
  assert.equal(blocks[0].heading, '공간 신호')
  assert.equal(blocks[1].heading, '둘째 문단')
  assert.equal(blocks[2].heading, '셋째 문단')
  assert.equal(blocks[2].body, '')
  const sentences = runInNewContext(code + '; dynamicBlocks({status:"complete",interpretation:"경사 2.82도로 완만한 편이에요. 입구를 확인해 주세요."})')
  assert.equal(sentences[0].heading, '경사 2.82도로 완만한 편이에요.')
  assert.equal(sentences[0].body, '입구를 확인해 주세요.')
})
test('home detail omits authoring instructions and retrieval topic chips', () => {
  assert.doesNotMatch(html, /겁주기보다 확인 방법|숫자나 확률이 없는 항목은|에서 보는 핵심|headings\[index\]/)
  assert.doesNotMatch(html.slice(html.indexOf('const SECTION_ALIASES'), html.indexOf('function neighbors(')), /section\.ragTopics/)
})
test('home detail derives section evidence scores without inventing compatibility', () => {
  const code = html.slice(html.indexOf('const SECTION_ALIASES'), html.indexOf('function neighbors('))
  const report = {context:{home:{mainPurpose:'잠·회복',buildingType:'아파트',bedroomFeel:'quiet'}},sections:[{id:'sleep-recovery',category:'잠',hook:'잠',status:'complete',interpretation:'[잠] 본문'}]}
  const sections = runInNewContext(code + '; dynamicSectionsFromReport(report, {sections:[]})', { report })
  assert.match(sections[0].evidence[0], /해석 신뢰도/)
  assert.ok(sections.some((section: any) => section.section_id === 'terrain-support' && /터 유사도/.test(section.evidence[0])))
  assert.ok(sections.every((section: any) => section.evidence.every((item: string) => !/측정 전|DEM|자료 없음/.test(item))))
})
