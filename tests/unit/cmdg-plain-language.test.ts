import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { calculateZiwei, ziweiPalaceReading } from '../../src/saju/ziwei.js'
const source=readFileSync('사주/js/umsh-report-access.js','utf8')
const start=source.indexOf('  function cmdgPlainText('), end=source.indexOf('  function cmdgVisualSpec(',start)
const context=vm.createContext({})
vm.runInContext(source.slice(start,end)+';this.plain=cmdgPlainText;this.html=cmdgExplainHtml;',context)
test('천이의 실제 두 별은 쉬운 설명 두 개로 연결되고 위치 이름은 필요하지 않다',()=>{
 const r=ziweiPalaceReading('천이',[{name:'염정'},{name:'천상'}])
 assert.match(r.question,/새로운 모임/)
 assert.equal(r.points.length,2)
 assert.match(r.points[0],/약속/);assert.match(r.points[1],/공평하게 조율/)
 assert.equal(ziweiPalaceReading('명궁',[]).points.length,0)
})
test('다른 출생 정보도 실제 계산 별마다 뜻이 있고 빈 부분에 별을 만들지 않는다',()=>{
 for(const hour of [0,3,9,17,23]){
  const chart=calculateZiwei({year:1994,month:3,day:11,hour,gender:'female',calendar:'solar'})
  assert.ok(chart.available)
  if(!chart.available)continue
  for(const p of chart.palaces){assert.ok(p.reading.question);assert.equal(p.reading.points.length,p.stars.length);assert.ok(p.stars.every(s=>s.meaning))}
 }
})
test('저장된 전문 용어는 뜻과 연결하되 이미 풀이된 말·이름·HTML 속성은 손대지 않는다',()=>{
 assert.match(context.plain('명궁의 파군은 변화를 살핍니다.'),/내 성격을 살피는 부분/)
 assert.match(context.plain('염정과 천상의 조합'),/약속을 중시/)
 assert.equal(context.plain('정재용님과 천상희님'), '정재용님과 천상희님')
 assert.equal(context.plain('용신(균형을 돕는 기운)'), '용신(균형을 돕는 기운)')
 assert.equal(context.html('<a href="/천이">천이</a>'), '<a href="/천이">낯선 곳에서의 행동(천이)</a>')
 assert.equal(context.plain(context.plain('일간과 대운')),context.plain('일간과 대운'))
})
