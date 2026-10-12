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
 const document={body:{},documentElement:{lang:locale},querySelector:()=>null,querySelectorAll:(s:string)=>s==='[aria-label]'?[el]:[],createTreeWalker:()=>({nextNode:()=>nodes[i++]||null})}
 const source=fs.readFileSync(new URL(`../../.vercel-localized/${locale}/js/locale-runtime.js`,import.meta.url),'utf8')
 const context=vm.createContext({document,window:{fetch:async()=>new Response('{}')},NodeFilter:{SHOW_TEXT:4},MutationObserver:class{observe(){}},requestAnimationFrame:()=>{},location:{origin:'https://umsh.kr',href:`https://umsh.kr/${locale}/`},URL,Headers,Request,Response,Intl})
 new vm.Script(source).runInContext(context)
 assert.equal(nodes[0].nodeValue,locale==='en'?'Approx. $7.39 USD (charged in KRW)':'約 ¥1,168 JPY（韓国ウォン決済）')
 assert.equal(nodes[1].nodeValue,'My savings goal is 5,000,000 KRW')
 assert.equal(nodes[2].nodeValue,'I asked Fortune Shop about 5,000,000 KRW')
 assert.equal(attrs['data-price'],'9,900 KRW')
 assert.equal(attrs['data-category'],'연애')
})
