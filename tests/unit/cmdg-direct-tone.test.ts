import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { loadServiceSystemPrompt } from '../../src/prompt/service-system.js'
import { reviewToneCopy } from '../../src/report/tone-v2-review.js'
const source=readFileSync('사주/js/umsh-report-access.js','utf8')
const start=source.indexOf('  function cmdgDirectVoice(')
const end=source.indexOf('  function withCmdgTemplateImages(',start)
const api=runInNewContext(source.slice(start,end)+';({voice:cmdgDirectVoice,report:withCmdgDirectVoice})')
test('legacy narrator conversion preserves quotes, dates, negations, and uncertainty',()=>{
 const text='“2026년에 돈이 들어옵니다.”라는 말은 확정할 수 없습니다. 권한을 확인하십시오. 구조입니다. 기준입니다. 반드시 성공한다는 뜻은 아닙니다.'
 const actual=api.voice(text)
 assert.equal(actual,'“2026년에 돈이 들어옵니다.”라는 말은 확정할 수 없어. 권한을 확인해. 구조야. 기준이야. 반드시 성공한다는 뜻은 아니야.')
 assert.equal(api.voice(actual),actual)
 assert.equal(api.voice('손해가 생길 수 있습니다.'),'손해가 생길 수 있어.')
 assert.equal(api.voice('https://example.com/합니다. "확인합니다."'), 'https://example.com/합니다. "확인합니다."')
})
test('only narrator report fields change; input, metadata and other services remain untouched',()=>{
 const original={summary:{text:'네 선택의 기준입니다.'},verdict:{statement:'확인하십시오.'},highlights:[{title:'제목',text:'가능성이 있습니다.'}],sections:[{id:'profile',interpretation:'기준을 기록하십시오.',hook:'변화입니다.',userQuestion:'왜 그렇습니까?',imageSrc:'/unchanged.webp'}]}
 const before=JSON.stringify(original)
 assert.equal(api.report(original,'job_choice'),original)
 const changed=api.report(original,'saju_master')
 assert.equal(JSON.stringify(original),before)
 assert.equal(changed.sections[0].interpretation,'기준을 기록해.')
 assert.equal(changed.sections[0].userQuestion,'왜 그렇습니까?')
 assert.equal(changed.sections[0].imageSrc,'/unchanged.webp')
 assert.equal(changed.summary.text,'네 선택의 기준이야.')
})
test('new generation and reviewer agree on saju-only direct informal voice',()=>{
 const prompt=loadServiceSystemPrompt('saju_master')
 assert.match(prompt,/천명사주는 반말체/)
 assert.match(prompt,/예시의 감정·돈·기회를 사용자 사실처럼 복사하지 않는다/)
 assert.equal(reviewToneCopy('야, 너 — 계약서의 권한부터 확인해.','saju_master').passed,true)
 assert.equal(reviewToneCopy('계약서의 권한부터 확인합니다.','saju_master').passed,false)
 assert.equal(reviewToneCopy('너는 기준부터 확인해.','job_choice').passed,false)
})

test('live legacy verb endings stay grammatical',()=>{
 assert.equal(api.voice('근거를 읽으십시오. 결정을 미루십시오. 역할이 살아납니다.'),'근거를 읽어. 결정을 미뤄. 역할이 살아나.')
 assert.equal(api.voice('먼저 움직이십시오. 기록을 남기십시오. 틀리지 않았습니다.'),'먼저 움직여. 기록을 남겨. 틀리지 않았어.')
})

test('opening is added only to legacy formal verdicts and never accumulates',()=>{
 const original={verdict:{statement:'권한을 확인하십시오.'},sections:[]}
 const once=api.report(original,'saju_master')
 assert.equal(once.verdict.statement,'야, 너 — 권한을 확인해.')
 assert.equal(api.report(once,'saju_master').verdict.statement,once.verdict.statement)
 assert.equal(api.report({verdict:{statement:'네 기준부터 봐.'}},'saju_master').verdict.statement,'네 기준부터 봐.')
})
