import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { loadServiceSystemPrompt } from '../../src/prompt/service-system.js'
import { reviewToneCopy } from '../../src/report/tone-v2-review.js'
import { CMDG_READING_CONTRACT } from '../../src/report/cmdg-reading-contract.js'
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

test('generated period and guide HTML use direct voice while user evidence is preserved',()=>{
 const plain=source.slice(source.indexOf('  function cmdgPlainText('),source.indexOf('  function cmdgVisualSpec('))
 const period=source.slice(source.indexOf('  function cmdgElementText('),source.indexOf('  function cmdgVisualHtml('))
 const functions=runInNewContext(source.slice(start,end)+plain+period+';({html:cmdgExplainHtml,period:cmdgPeriodMeaning,stages:cmdgLifeStagesHtml})')
 for(const pillar of ['계미','임오','신사','경진','갑자','갑인']) {
  const text=functions.period(pillar,{analysis:{dayMaster:{element:'wood'}}})
  assert.match(text,/네가 살필 건/)
  assert.doesNotMatch(text,/니다|세요|어요|아요/)
 }
 const html=functions.html('<p>기운을 뜻합니다. <strong>확인하세요.</strong></p><span data-cmdg-user>저는 이직하고 싶어요.</span><td data-cmdg-user>질문입니다.</td>')
 assert.match(html,/<p>기운을 뜻해/)
 assert.match(html,/<strong>확인해\.<\/strong>/)
 assert.match(html,/<span data-cmdg-user>저는 이직하고 싶어요\.<\/span>/)
 assert.match(html,/<td data-cmdg-user>질문입니다\.<\/td>/)
 assert.doesNotMatch(functions.html(functions.stages({analysis:{fortune:{daewoon:[]}}})),/습니다|입니다/)
})

test('additional readings use informal answer and follow-up while keeping the original question',()=>{
 const reader=readFileSync('사주/js/umsh-cmdg-reader-tools.js','utf8')
 const render=runInNewContext(reader.slice(reader.indexOf('  function esc('),reader.indexOf('  function styles('))+reader.slice(reader.indexOf('  function answerHtml('),reader.indexOf('  function historyHtml('))+';answerHtml')
 const html=render({input:'왜 그런가요?',answer:{answer:'당신이 확인해야 합니다.',basis:'근거입니다.',turn:'확정은 아닙니다.',action:'적으십시오.',question:'무엇인가요?'}},api.voice,api.voice)
 assert.match(html,/왜 그런가요\?/)
 assert.match(html,/네가 확인해야 해/)
 assert.match(html,/무엇이야\?/)
 assert.doesNotMatch(html,/합니다|입니다|아닙니다|십시오/)
 assert.match(CMDG_READING_CONTRACT,/추가 풀이와 자미두수에도 같은 말투/)
})
