import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import vm from 'node:vm'
import test from 'node:test'
import { listPaymentProducts } from '../../src/payment/catalog.js'
const source = readFileSync('사주/js/cmdg-master-teaser.js','utf8')
function render(state: object) { const ctx: any={};vm.createContext(ctx);vm.runInContext(source,ctx);return ctx.UmshMasterTeaser.render(state) as string }
const state={name:'테스트',birthTimeKnown:true,concern:'일을 바꿀까',analysis:{dayMaster:{ko:'을',element:'목'},pillars:{year:{ko:'갑자'},month:{ko:'정묘'},day:{ko:'을해',hanja:'乙亥'},hour:{ko:'경진'}},elements:{wood:5,fire:0,earth:1,metal:1,water:1},fortune:{currentYear:2026,yearPillar:'丙午',currentDaewoon:'庚辰',daewoon:[{age:'46~55세',pillar:'庚辰',startYear:2021},{age:'56~65세',pillar:'己卯',startYear:2031}]}}}
test('teaser uses member pillars, element counts and actual cycle instead of reference identity',()=>{
 const html=render(state);assert.match(html,/을해/);assert.match(html,/나무 기운이 5개/);assert.match(html,/흙 기운을 전통적으로 재성/)
 // 2026-10-12: 大運 줄은 master 고정 문구(20██년)로 바꿨다. 계산된 대운 구간은 본문(story-copy)에서 확인한다.
 assert.match(html,/56~65세/);assert.doesNotMatch(html,/나혜연|49,900|야, 너|undefined|@@/)
 const other=render({...state,name:'다른 회원',analysis:{...state.analysis,dayMaster:{ko:'경',element:'금'},pillars:{...state.analysis.pillars,day:{ko:'경인',hanja:'庚寅'}},elements:{wood:2,fire:4,earth:1,metal:1,water:0}}});
 assert.match(other,/불 기운이 4개/);assert.match(other,/나무 기운을 전통적으로 재성/);assert.notEqual(html,other)
})
test('missing data does not fabricate a chart or turning year, unknown time does not expose calculated hour',()=>{
 assert.match(render({}),/아직 불러오지 못했어/)
 const html=render({...state,birthTimeKnown:false,analysis:{...state.analysis,fortune:{}}});assert.doesNotMatch(html,/<strong>시간 모름<\/strong>/);assert.equal((html.match(/<ol class="intro-pillars"[\s\S]*?<\/ol>/)||[''])[0].match(/<li>/g)?.length,3);assert.doesNotMatch(html,/<strong>경진<\/strong>시|2031년|2028년/);assert.doesNotMatch(html,/현재 대운의 계산값이 없어|다음 대운 정보가 없어|시간을 확인/)
})
test('server UI element labels include hanja and render without falling into missing-data state',()=>{
 const html=render({...state,analysis:{...state.analysis,dayMaster:{ko:'을',element:'목(木)'}}});assert.match(html,/나무 기운이 5개/);assert.doesNotMatch(html,/일간 계산값을 확인하지 못했어/)
})
test('member input is escaped and paid report sections are not consumed',()=>{
 const html=render({...state,name:'<img onerror=alert(1)>',concern:'<script>alert(2)</script>',analysis:{...state.analysis,report:{sections:[{interpretation:'PAID_SECRET'}]}}});assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<script>alert|PAID_SECRET/)
})
test('no price before the PG window; catalog amount and existing checkout action remain',()=>{
 // 2026-10-15: 금액은 결제창(이니시스·구글플레이)에서 처음 보인다. 복채 카드(기본·할인·지금 열기)를 뺐다.
 const html=render(state);assert.equal(listPaymentProducts().find(p=>p.key==='cmdg')?.amount,29000);assert.doesNotMatch(html,/\d{1,3}(?:,\d{3})+원|price-slate|약 54%/);assert.match(html,/data-action="open-chat"/)
 assert.match(html,/class="cta-label">운명 거래하기/)
})
test('every imported artwork URL exists; no embedded binary or desktop path ships',()=>{
 const css=readFileSync('사주/css/cmdg-master-teaser.css','utf8');const urls=[...css.matchAll(/url\("(\/assets\/[^\"]+)"\)/g)];assert.ok(urls.length>=18);for(const [,url] of urls)assert.ok(existsSync(join('사주',url)),url);assert.doesNotMatch(css,/base64|C:\\Users/)
})
