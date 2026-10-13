import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

for(const locale of ['en','ja'])test(`${locale} runtime converts product display only, preserving raw price and report/quote facts`,()=>{
 const attrs:Record<string,string>={'data-price':'9,900 KRW','data-category':'연애','aria-label':'Fortune Shop'}
 const el={getAttribute:(k:string)=>attrs[k],setAttribute:(k:string,v:string)=>{attrs[k]=v}}
 const nodes=[
  {nodeValue:'9,900 KRW',parentElement:{closest:(s:string)=>s.includes('.price-line')?el:null}},
  {nodeValue:'My savings goal is 5,000,000 KRW',parentElement:{closest:(s:string)=>s.includes('[data-price]')?el:null}},
  {nodeValue:'I asked Fortune Shop about 5,000,000 KRW',parentElement:{closest:(s:string)=>s.includes('blockquote')?el:null}},
 ]
 let i=0
 const document={body:{},documentElement:{lang:locale},querySelector:()=>null,querySelectorAll:(s:string)=>s==='[aria-label]'?[el]:[],createTreeWalker:()=>{i=0;return {nextNode:()=>nodes[i++]||null}}}
 const source=fs.readFileSync(new URL(`../../.vercel-localized/${locale}/js/locale-runtime.js`,import.meta.url),'utf8')
 const context=vm.createContext({document,window:{fetch:async()=>new Response('{}')},NodeFilter:{SHOW_TEXT:4},MutationObserver:class{observe(){}},requestAnimationFrame:()=>{},location:{origin:'https://umsh.kr',href:`https://umsh.kr/${locale}/`},URL,Headers,Request,Response,Intl})
 new vm.Script(source).runInContext(context)
 assert.equal(nodes[0].nodeValue,locale==='en'?'$7.39 USD':'¥1,168 JPY')
 assert.equal(nodes[1].nodeValue,'My savings goal is 5,000,000 KRW')
 assert.equal(nodes[2].nodeValue,'I asked Fortune Shop about 5,000,000 KRW')
 assert.equal(attrs['data-price'],'9,900 KRW')
 assert.equal(attrs['data-category'],'연애')
})

for (const locale of ['en','ja']) test(`${locale} preformatted product prices lose retired billing suffix and remain stable through observer refreshes`,()=>{
 const base=locale==='en'?'Approx. $37.24 USD':'約 ¥5,888 JPY'
 const clean=locale==='en'?'$37.24 USD':'¥5,888 JPY'
 const note=locale==='en'?' (charged in KRW)':'（韓国ウォン決済）'
 const attrs:Record<string,string>={'data-price':'49,900 KRW','aria-label':'Original price attribute'}
 const el={getAttribute:(key:string)=>attrs[key],setAttribute:(key:string,value:string)=>{attrs[key]=value}}
 const priceParent={closest:(selector:string)=>selector.includes('.price-line')?el:null}
 const quoteParent={closest:(selector:string)=>selector.includes('blockquote')?el:null}
 const customerQuoteParent={closest:(selector:string)=>selector.includes('[data-customer-quote]')||selector.includes('.price-line')?el:null}
 const nodes=[
  {nodeValue:base+note,parentElement:priceParent},
  {nodeValue:base,parentElement:priceParent},
  {nodeValue:base+note,parentElement:quoteParent},
  {nodeValue:'Saved report '+base+note,parentElement:{closest:()=>null}},
  {nodeValue:base+note,parentElement:customerQuoteParent},
  {nodeValue:clean,parentElement:priceParent},
  {nodeValue:'Approx. timing / 約1分 / 約束',parentElement:priceParent},
  {nodeValue:locale==='en'?'Approx. −$0.75 USD':'約 −¥30 JPY',parentElement:priceParent},
 ]
 const pending:Array<()=>void>=[]
 let observed:(()=>void)|undefined
 const document={body:{},documentElement:{lang:locale},querySelector:()=>null,querySelectorAll:(selector:string)=>selector==='[aria-label]'?[el]:[],createTreeWalker:()=>{let i=0;return {nextNode:()=>nodes[i++]||null}}}
 const source=fs.readFileSync(new URL(`../../.vercel-localized/${locale}/js/locale-runtime.js`,import.meta.url),'utf8')
 const context=vm.createContext({document,window:{fetch:()=>assert.fail('Display refresh must not request an endpoint')},NodeFilter:{SHOW_TEXT:4},MutationObserver:class{constructor(callback:()=>void){observed=callback}observe(){}},requestAnimationFrame:(callback:()=>void)=>{pending.push(callback)},location:{origin:'https://umsh.kr',href:`https://umsh.kr/${locale}/`},URL,Headers,Request,Response,Intl})
 new vm.Script(source).runInContext(context)
 for(let pass=0;pass<3;pass++){
  assert.equal(nodes[0].nodeValue,clean)
  assert.equal(nodes[1].nodeValue,clean)
  assert.equal(nodes[2].nodeValue,base+note)
  assert.equal(nodes[3].nodeValue,'Saved report '+base+note)
  assert.equal(nodes[4].nodeValue,base+note)
  assert.equal(nodes[5].nodeValue,clean)
  assert.equal(nodes[6].nodeValue,'Approx. timing / 約1分 / 約束')
  assert.equal(nodes[7].nodeValue,locale==='en'?'−$0.75 USD':'−¥30 JPY')
  assert.deepEqual(attrs,{'data-price':'49,900 KRW','aria-label':'Original price attribute'})
  assert.ok(observed)
  observed()
  assert.equal(pending.length,1)
  pending.shift()!()
 }
})

test('customer pages request the bumped runtime version rather than the cached billing-suffix script',()=>{
 const server=fs.readFileSync(new URL('../../src/server/localized-pages.ts',import.meta.url),'utf8')
 assert.ok(server.includes('/js/locale-runtime.js?v=20261013-price-copy1'))
})
