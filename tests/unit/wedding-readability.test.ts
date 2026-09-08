import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { buildWeddingContext, buildWeddingFrame, buildWeddingReport, parseWeddingRequest } from '../../src/day/wedding-service.js'
import { loadServiceSystemPrompt } from '../../src/prompt/service-system.js'
const read = (p: string) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8')
const birth = {year:1990,month:4,day:12,hour:12,minute:0,gender:'female' as const,calendar:'solar' as const,isLeapMonth:false}
test('wedding layout separates text from images and uses local readable fonts', () => {
  const css = read('사주/day/wedding/assets/style.css')
  assert.match(css, /Pretendard-Medium/)
  assert.match(css, /MaruBuri-Bold/)
  assert.doesNotMatch(css, /position:\s*absolute|margin-top:\s*-|text-shadow/)
  assert.match(css, /\[hidden\]\{display:none!important/)
  const intro = read('사주/day/wedding/01-step-1-story/index.html')
  assert.equal((intro.match(/class="cta"/g) || []).length, 1)
  const input = read('사주/day/wedding/02-step-2-saju-input/index.html')
  assert.doesNotMatch(input, /id="meBirth"|id="meTime"|method="get"/)
  assert.match(input, /aria-live="polite"/)
  const detail = read('사주/day/wedding/06-step-6_1-report-detail/index.html')
  assert.match(detail, /data-section-select/)
  assert.match(detail, /data-retry-section/)
})
test('all 21 wedding questions have distinct multi-paragraph answers and no cut-off corpus excerpts', () => {
  const input = parseWeddingRequest({candidateDate1:'2027-05-15',partnerBirth:'1988-03-11'})
  const report = buildWeddingReport(analyzeSaju(birth),birth,buildWeddingContext('검증',input),input)
  assert.equal(report.sections.length,21)
  assert.equal(new Set(report.sections.map(s=>s.interpretation)).size,21)
  for (const section of report.sections) {
    assert.ok(section.interpretation.split(/\n\s*\n/).length >= 3, section.id)
    assert.doesNotMatch(section.interpretation, /…| \/\/ |writing_guide|만들지 않으세요/)
  }
  assert.match(loadServiceSystemPrompt('wedding_day'), /입력하지 않은 날을 탐색한 것처럼 말하지 않는다/)
})
test('unknown birth time never becomes a confirmed useful-element match', () => {
  const input = parseWeddingRequest({candidateDate1:'2027-05-15',partnerBirth:'1988-03-11'})
  assert.equal(input.partnerBirthTimeKnown,false)
  input.birthTimeKnown=false
  const frame = buildWeddingFrame(analyzeSaju(birth),input)
  assert.ok(frame.candidates[0].sides.every(s=>!s.usefulGodKnown && !s.matchesUsefulGod))
})
