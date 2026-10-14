import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { localizedPages } from '../../src/server/localized-pages.js'
import { formatReferencePrice, replaceVisibleLocaleText } from '../../src/i18n/visible-locale-replacements.js'
import { normalizeLocaleRoot, rebaseSharedVisualPaths, sharedPublicVisualPath } from '../../src/i18n/localized-assets.js'

for (const locale of ['en','ja'] as const) test(`${locale}: visible won variants convert while readonly/machine data stays exact`, () => {
  const price = formatReferencePrice(19900, locale)
  const readonly = '<blockquote title="5,000,000 won">I saved 5,000,000ウォン<div>9,900 won</div></blockquote><p data-customer-quote="true">19,900ウォン</p><textarea>19,900 won</textarea><template><p>19,900ウォン</p></template><p contenteditable>19,900 won</p>'
  const code = '<script>const price=19900; const currency="WON"; const label="19,900ウォン";</script><style>.x:after{content:"19,900 won"}</style><!-- 19,900ウォン -->'
  const output = replaceVisibleLocaleText('<b class="price">19,900 won</b><b class="price">19,900ウォン</b><a data-price="19900" href="/payment?amount=19900" aria-label="19,900ウォン">19,900 KRW</a>'+readonly+code, locale)
  assert.ok(output.includes('<b class="price">'+price+'</b><b class="price">'+price+'</b>'))
  assert.ok(output.includes('aria-label="'+price+'"'))
  assert.ok(output.includes('data-price="19900" href="/payment?amount=19900"'))
  assert.ok(output.includes(readonly))
  assert.ok(output.includes(code))
  assert.equal(replaceVisibleLocaleText(output, locale), output)
})

test('served locale language survives extra root attributes and known shared visual paths rebase only as presentation resources', () => {
  const outputRoot=path.resolve('output');fs.mkdirSync(outputRoot,{recursive:true})
  const base=fs.mkdtempSync(path.join(outputRoot,'ui-display-test-'))
  try {
    for(const locale of ['en','ja']) {
      const folder=path.join(base,'.vercel-localized',locale,'day/wedding/01-step-1-story');fs.mkdirSync(folder,{recursive:true})
      fs.writeFileSync(path.join(folder,'index.html'),'<html lang="ko" data-umsh-verified-inplace><head><link rel="stylesheet" href="../assets/style.css?v=1"><script src="../assets/report.js"></script></head><body><img src="../assets/generated/scene.webp"><a href="../assets/private.json">Data</a><a href="/payment?amount=19900">Pay</a><script>const sample="<html lang=\"ko\">";</script></body></html>')
      let html='';const response:any={type:()=>response,send:(value:string)=>{html=value},status:()=>response,end:()=>{assert.fail('Unexpected rejection')}}
      localizedPages(path.join(base,'.vercel-localized'))({path:`/${locale}/day/wedding/01-step-1-story/index.html`,method:'GET'} as any,response,()=>assert.fail('Unexpected next'))
      assert.ok(html.includes(`<html lang="${locale}" data-umsh-verified-inplace>`))
      assert.ok(html.includes('href="../assets/style.css?v=1"'))
      assert.ok(html.includes('src="/day/wedding/assets/generated/scene.webp"'))
      assert.ok(html.includes('src="../assets/report.js"'))
      assert.ok(html.includes('href="../assets/private.json"'))
      assert.ok(html.includes('amount=19900'))
      assert.ok(html.includes('const sample="<html lang=\"ko\">"'))
      assert.ok(html.includes('id="localized-ui-layout"'))
    }
  } finally {fs.rmSync(base,{recursive:true,force:true})}
})

function runRuntime(locale:'en'|'ja', pathname:string, nodes:Array<{nodeValue:string,parentElement:any}>, attrsElements:any[]=[]){
  let observer:(()=>void)|undefined;const pending:Array<()=>void>=[]
  const document={body:{},documentElement:{lang:locale},querySelector:()=>null,querySelectorAll:(s:string)=>s==='[aria-label]'?attrsElements:[],createTreeWalker:()=>{let i=0;return{nextNode:()=>nodes[i++]||null}}}
  const source=fs.readFileSync(new URL(`../../.vercel-localized/${locale}/js/locale-runtime.js`,import.meta.url),'utf8')
  new vm.Script(source).runInNewContext({document,window:{fetch:()=>assert.fail('Display must not call API')},NodeFilter:{SHOW_TEXT:4},MutationObserver:class{constructor(callback:()=>void){observer=callback}observe(){}},requestAnimationFrame:(callback:()=>void)=>pending.push(callback),location:{origin:'https://umsh.kr',href:'https://umsh.kr/'+locale+pathname},URL,Headers,Request,Response,Intl})
  return ()=>{observer!();pending.shift()!()}
}
for(const locale of ['en','ja'] as const) test(`${locale}: only fixed-price CTA contexts convert; financial summary and non-purchase rows survive refresh`,()=>{
  const element={};const parent=(needle:string)=>({closest:(s:string)=>s.includes(needle)?element:null})
  const nodes=[
    {nodeValue:'Full reading 12,900ウォン',parentElement:parent('[data-state-primary]')},
    {nodeValue:'My savings goal is 5,000,000ウォン',parentElement:parent('[data-state-body]')},
    {nodeValue:'I won 7 awards; Team 7 won',parentElement:parent('[data-state-body]')},
    {nodeValue:'My report: 5,000,000 KRW',parentElement:parent('.result-item')},
    {nodeValue:'KRW -250',parentElement:parent('.price-line')},
    {nodeValue:'0–9,900 won',parentElement:parent('.price-line')},
    {nodeValue:'19,900ウォン',parentElement:{closest:(s:string)=>s.includes('[data-state-primary]')||s.includes('blockquote')?element:null}},
  ]
  const replay=runRuntime(locale,'/money/save/04-step-4-report/index.html',nodes)
  for(let pass=0;pass<3;pass++){
    assert.equal(nodes[0].nodeValue,'Full reading '+formatReferencePrice(12900,locale))
    assert.equal(nodes[1].nodeValue,'My savings goal is 5,000,000ウォン')
    assert.equal(nodes[2].nodeValue,'I won 7 awards; Team 7 won')
    assert.equal(nodes[3].nodeValue,'My report: 5,000,000 KRW')
    assert.equal(nodes[4].nodeValue,formatReferencePrice(-250,locale))
    assert.equal(nodes[5].nodeValue,formatReferencePrice(0,locale)+' – '+formatReferencePrice(9900,locale))
    assert.equal(nodes[6].nodeValue,'19,900ウォン')
    replay()
  }
})
for(const locale of ['en','ja'] as const) test(`${locale}: late shared shell translation is exact, owned and idempotent`,()=>{
 const element={};const owned={closest:(s:string)=>s.includes('[data-umsh-service-bottom]')?element:null}
 const nodes=[{nodeValue:'홈',parentElement:owned},{nodeValue:'운명록',parentElement:owned},{nodeValue:'보관함',parentElement:owned},{nodeValue:'홈',parentElement:{closest:()=>null}}]
 const attrs:Record<string,string>={'aria-label':'주요 메뉴','data-shell-nav':'home'}
 const aria={...owned,matches:(s:string)=>s.includes("[data-umsh-service-bottom]"),getAttribute:(k:string)=>attrs[k],setAttribute:(k:string,v:string)=>{attrs[k]=v}}
 const replay=runRuntime(locale,'/day/wedding/01-step-1-story/index.html',nodes,[aria])
 for(let pass=0;pass<3;pass++){
  assert.deepEqual(nodes.map(n=>n.nodeValue),locale==='en'?['Home','Fate log','Saved','홈']:['ホーム','運命録','保管庫','홈'])
  assert.equal(attrs['aria-label'],locale==='en'?'Main menu':'主なメニュー')
  assert.equal(attrs['data-shell-nav'],'home');replay()
 }
})

test('unquoted display attrs serialize whole price and quoted machine fragments remain exact',()=>{
 const raw='<img alt=19900KRW src=x data-note="fake aria-label=19900KRW"><p>Team 7 won</p>'
 const out=replaceVisibleLocaleText(raw,'en')
 assert.ok(out.includes('alt="$14.85 USD"'))
 assert.ok(out.includes('data-note="fake aria-label=19900KRW"'))
 assert.ok(out.includes('<p>Team 7 won</p>'))
 assert.equal(normalizeLocaleRoot('<html lang=ko data-note="lang=ko">','ja'),'<html lang=ja data-note="lang=ko">')
 assert.equal(normalizeLocaleRoot('<html data-note=" lang " lang>','ja'),'<html data-note=" lang " lang="ja">')
})
test('visual URL rebasing keeps encoded quote/space names and skips readonly, scripts, private types and CSS',()=>{
 const input='<img src="../assets/a%22b%20c.png"><img src=../assets/a%27b.png><script>const img="<img src=\"../assets/a.png\">";</script><blockquote><img src="../assets/a.png"></blockquote><link rel="stylesheet" href="../assets/style.css"><video src="../assets/a.webm"></video>'
 const out=rebaseSharedVisualPaths(input,'ja','/day/wedding/01-step-1-story/index.html')
 assert.ok(out.includes('src="/day/wedding/assets/a%22b%20c.png"'))
 assert.ok(out.includes('src=/day/wedding/assets/a%27b.png'))
 assert.ok(out.includes('<blockquote><img src="../assets/a.png"></blockquote>'))
 assert.ok(out.includes('href="../assets/style.css"'))
 assert.ok(out.includes('src="/day/wedding/assets/a.webm"'))
 const foreign='<img src="https://example.com/a.png"><img src="//example.com/a.png"><img src="../assets/a%2Fb.png"><img data-src="../assets/a.png"><source src="../assets/a.json">'
 assert.equal(rebaseSharedVisualPaths(foreign,'ja','/day/wedding/01-step-1-story/index.html'),foreign)
 assert.equal(rebaseSharedVisualPaths('<img src="../assets/a.png">','ja','/day/wedding/01-step-1-story/index.html',()=>true),'<img src="../assets/a.png">')
})
test('paused services use byte-identical locale-only CSS copies, not nonlocale gate fallback',()=>{
 for(const rel of ['day/wedding/assets/style.css','flow/newyear/assets/style.css','work/job-choice/shared/job-choice.css']){
  const original=fs.readFileSync(new URL('../../사주/'+rel,import.meta.url))
  for(const locale of ['en','ja'])assert.deepEqual(fs.readFileSync(new URL('../../.vercel-localized/'+locale+'/'+rel,import.meta.url)),original)
 }
 const server=fs.readFileSync(new URL('../../src/server/localized-pages.ts',import.meta.url),'utf8')
 assert.ok(server.includes("'/match/marry/01-step-1-story/index.html': '.price-line{align-items:baseline}.price-line>strong"))
 assert.ok(!server.includes('.price-row>strong{min-width:0;text-align:right;overflow-wrap:anywhere}'))
})
test('fixed save UI state copy uses canonical 9900 display; financial summary writer is untouched',()=>{
 for(const locale of ['en','ja'] as const){
  const source=fs.readFileSync(new URL('../../.vercel-localized/'+locale+'/money/save/04-step-4-report/index.html',import.meta.url),'utf8')
  const line=source.split('\n').find(l=>/"body"\s*:/.test(l)&&l.includes(locale==='en'?'After paying':'05の一覧と06の詳細'))!
  assert.ok(line.includes(formatReferencePrice(9900,locale)))
  assert.ok(!line.includes('KRW')&&!line.includes('ウォン'))
 }
 const shared=fs.readFileSync(new URL('../../사주/js/save-service.js',import.meta.url),'utf8')
 assert.ok(shared.includes('body.textContent = outcome.preview.summary || GATE_COPY.payment'))
})
test('owned English emphasis boundaries never concatenate unchanged words',()=>{
 const cases:Record<string,Array<[string,string]>>={
  'love/this-year/01-step-1-story/index.html':[['beginning','could'],['how','because']],
  'love/signal/01-step-1-story/index.html':[['sequence','there'],['relationship','that'],['us','start']],
  'match/marry/01-step-1-story/index.html':[['marriage','is'],['clashes','Let']],
  'work/job-choice/01-step-1-story/index.html':[['People','Look'],['sign','start']],
  'cmdg/index.html':[['timing','is'],['destiny','ahead'],['real flow','is'],['Flow','changes'],['destiny','is'],['Choices','accumulate'],['people','gather']],
 }
 for(const [rel,pairs] of Object.entries(cases)){
  const source=fs.readFileSync(new URL('../../.vercel-localized/en/'+rel,import.meta.url),'utf8')
  for(const [from,to]of pairs)assert.ok(source.includes(from+'</span> '+to)||source.includes(from+'\\x3c/span> '+to),rel+' '+from)
 }
})

test('real customer visual directories include step assets, campaign videos and neutral font pointers only',()=>{
 const allowed=['/day/wedding/01-step-1-story/assets/generated/wedding-day/wedding-day-01-scene-01-hook.webp','/flow/newyear/01-step-1-story/assets/generated/newyear/newyear-01-scene-01-hook.webp','/work/job-choice/assets/job-choice/01-hero.mp4','/love/signal/assets/signal/videos/01-scene-01-hero-poster.webp','/cmdg/assets/fonts/Pretendard-Medium.woff2','/me/lucky/assets/lucky/01-scene-01-hook.webp','/place/home/IMAGE/safe.webp']
 for(const value of allowed)assert.equal(sharedPublicVisualPath(value),value)
 const denied=['/api/private.png','/data/private.webp','/admin/assets/a.webp','/work/job-choice/private/customer.png','/cmdg/assets/a.js','/cmdg/assets/a.html','/cmdg/assets/a.json','/cmdg/assets/a.css','//evil.test/a.png','/cmdg/assets/../a.png','/cmdg/assets/%2e%2e/a.png','/cmdg/assets/a%2fb.png','/cmdg/assets/a%5cb.png','/cmdg/assets/a%00.png','/cmdg/assets/a%3f.png']
 for(const value of denied)assert.equal(sharedPublicVisualPath(value),undefined,value)
 for(const [rel,url] of [['/day/wedding/01-step-1-story/index.html','assets/generated/wedding-day/wedding-day-01-scene-01-hook.webp'],['/flow/newyear/01-step-1-story/index.html','assets/generated/newyear/newyear-01-scene-01-hook.webp'],['/work/job-choice/01-step-1-story/index.html','../assets/job-choice/01-hero.mp4']] as const){
  const canonical=new URL(url,'https://umsh.kr'+rel).pathname
  for(const locale of ['en','ja'] as const)assert.equal(rebaseSharedVisualPaths('<img src="'+url+'">',locale,rel),'<img src="'+canonical+'">')
  assert.ok(fs.existsSync(new URL('../../public'+canonical,import.meta.url))||fs.existsSync(new URL('../../사주'+canonical,import.meta.url)),canonical)
 }
})
test('missing localized binary pointers redirect only within public media roots; code and HTML still fail closed',()=>{
 const parent=path.resolve('output');fs.mkdirSync(parent,{recursive:true});const root=fs.mkdtempSync(path.join(parent,'ui-binary-test-'))
 try{
  fs.mkdirSync(path.join(root,'en/assets'),{recursive:true});fs.writeFileSync(path.join(root,'en/assets/local.png'),'local')
  for(const [requested,expected]of [['/en/cmdg/assets/fonts/Pretendard-Medium.woff2','/cmdg/assets/fonts/Pretendard-Medium.woff2'],['/ja/love/signal/assets/signal/videos/01-scene-01-hero-poster.webp','/love/signal/assets/signal/videos/01-scene-01-hero-poster.webp'],['/en/cmdg/assets/a.css',undefined],['/ja/cmdg/assets/a.js',undefined],['/en/cmdg/assets/a.html',undefined],['/ja/data/private.png',undefined]] as const){
   let status=200,target:string|undefined;const response:any={redirect:(s:number,url:string)=>{status=s;target=url},status:(s:number)=>{status=s;return response},type:()=>response,send:()=>{},end:()=>{}}
   localizedPages(root)({path:requested,method:'GET'} as any,response,()=>assert.fail('Unexpected next'))
   assert.equal(target,expected);assert.equal(status,expected?302:404)
  }
  let served='';const response:any={sendFile:(file:string)=>{served=file},redirect:()=>assert.fail('Locale counterpart must win')}
  localizedPages(root)({path:'/en/assets/local.png',method:'GET'} as any,response,()=>assert.fail('Unexpected next'))
  assert.equal(served,path.join(root,'en/assets/local.png'))
 }finally{fs.rmSync(root,{recursive:true,force:true})}
})
