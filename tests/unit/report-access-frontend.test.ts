import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

const source = readFileSync(new URL('../../사주/js/umsh-report-access.js', import.meta.url), 'utf8')

test('home verified responses use the original page renderer and revoke on owner change', () => {
  const h = harness('/place/home/04-step-4-report/index.html?reportId=home-uuid', [])
  const rendered: any[] = []
  h.context.UMSHHomeReading = { render(payload: any) { rendered.push(payload); return true } }
  h.api.setOwner('owner-a')
  const report = { serviceKey: 'home_fit', sections: [{ id: 'home-fit-overall', status: 'complete', interpretation: '원문' }] }
  h.api.consume({ reportId: 'home-uuid', report }, {})
  assert.equal(rendered.length, 1)
  assert.equal(h.nodes.has('umsh-verified-reading'), false)
  assert.equal(h.api.verifiedReport(), report)
  h.api.setOwner('owner-b')
  assert.equal(h.api.verifiedReport(), null)
  assert.match(h.nodes.get('umsh-verified-reading').innerHTML, /계정이 변경/)
})

test('home preview uses original teaser without authorizing a full report', () => {
  const h = harness('/place/home/04-step-4-report/index.html?reportId=home-uuid', [])
  let called = false
  h.context.UMSHHomeReading = { render() { called = true; return true } }
  h.api.consume({ previewOnly: true, serviceKey: 'home_fit', reportId: 'home-uuid', preview: { summary: '미리보기' } })
  assert.equal(called, true)
  assert.equal(h.api.verifiedReport(), null)
  assert.equal(h.nodes.has('umsh-verified-reading'), false)
})

test('wedding verified responses use the original page renderer and revoke on owner change', () => {
  const h = harness('/day/wedding/04-step-4-report/index.html?reportId=wedding-uuid', [])
  const rendered: any[] = []
  h.context.UMSHWeddingReading = { render(payload: any) { rendered.push(payload); return true } }
  h.api.setOwner('owner-a')
  const report = { serviceKey: 'wedding_day', sections: [{ id: '1-1', status: 'complete', interpretation: '원문' }] }
  h.api.consume({ reportId: 'wedding-uuid', report }, {})
  assert.equal(rendered.length, 1)
  assert.equal(h.nodes.has('umsh-verified-reading'), false)
  assert.equal(h.api.verifiedReport(), report)
  h.api.setOwner('owner-b')
  assert.equal(h.api.verifiedReport(), null)
  assert.match(h.nodes.get('umsh-verified-reading').innerHTML, /계정이 변경/)
})

test('wedding preview uses original teaser without authorizing a full report', () => {
  const h = harness('/day/wedding/04-step-4-report/index.html?reportId=wedding-uuid', [])
  let called = false
  h.context.UMSHWeddingReading = { render() { called = true; return true } }
  h.api.consume({ previewOnly: true, serviceKey: 'wedding_day', reportId: 'wedding-uuid', preview: { summary: '미리보기' } })
  assert.equal(called, true)
  assert.equal(h.api.verifiedReport(), null)
  assert.equal(h.nodes.has('umsh-verified-reading'), false)
})

function harness(path: string, responses: unknown[], cache: Record<string, unknown> = {}) {
  const calls: Array<{path: string; options: any}> = []
  const nodes = new Map<string, any>()
  const items = new Map(Object.entries(cache).map(([key,value])=>[key,JSON.stringify(value)]))
  const location = new URL(path, 'https://umsh.kr')
  const listeners = new Map<string, Array<() => unknown>>()
  function element(tag = 'div'): any {
    const attrs = new Map<string,string>()
    return {id:'',tagName:tag.toUpperCase(),innerHTML:'',children:[],style:{cssText:'',setProperty(){},removeProperty(){}},
      setAttribute(name:string,value:string){attrs.set(name,value)},hasAttribute(name:string){return attrs.has(name)},getAttribute(name:string){return attrs.get(name)},
      addEventListener(){},querySelectorAll(){return []},
      appendChild(node:any){this.children.push(node);node.parentNode=this;if(node.id)nodes.set(node.id,node)},
      insertAdjacentHTML(_where:string,text:string){this.innerHTML+=text}}
  }
  const document = {
    readyState:'loading', addEventListener(name:string,callback:()=>unknown) {listeners.set(name,[...(listeners.get(name)||[]),callback])}, querySelectorAll(){return []},querySelector(){return null},
    getElementById(id: string){return nodes.get(id)},
    createElement:element,documentElement:element('html'),head:element('head'),body:element('body'),
  }
  const timers: Array<()=>void> = []
  const context: any = {
    location, document, URL, URLSearchParams, Response, Set, console,
    history:{replaceState(_state:unknown,_title:string,path:string){location.href=new URL(path,location.origin).href}},
    sessionStorage:{get length(){return items.size},key(index:number){return [...items.keys()][index]},getItem(key:string){return items.get(key)},setItem(key:string,value:string){items.set(key,value)},removeItem(key:string){items.delete(key)}},
    fetch:async (path:string,options:any)=>{calls.push({path,options});const response=responses.shift();const next:any=typeof response==='function' ? await response() : response;return new Response(JSON.stringify(next?.payload || next || {}),{status:next?.status || 200,headers:{'Content-Type':'application/json'}})},
    setTimeout(callback:()=>void){timers.push(callback);return timers.length},clearTimeout(){},
  }
  context.window=context
  runInNewContext(source,context)
  return {api:context.UMSHReportAccess,calls,nodes,items,location,timers,listeners,context}
}

test('newyear analysis creates only an authenticated preview with an owner-scoped UUID hint', async () => {
  const h = harness('/flow/newyear/02-step-2-saju-input/index.html', [{previewOnly:true,serviceKey:'newyear_flow',reportId:'fingerprint',resultId:'newyear-uuid',preview:{headline:'2027년의 기준',summary:'계산된 방향',signals:[]},paymentUrl:'/payment?product=newyear_flow&reportId=newyear-uuid'}])
  h.api.setOwner('owner-a')
  await h.api.fetch('/api/flow/newyear/analyze', {method:'POST',headers:{Authorization:'Bearer test'},body:'{"displayName":"합성 사용자"}'})
  assert.equal(h.calls[0].path, '/api/flow/newyear/analyze')
  assert.equal(JSON.parse(h.calls[0].options.body).preview, true)
  assert.equal(h.items.get('umsh:report-identity:owner-a:newyear_flow'), 'newyear-uuid')
  assert.equal(h.location.searchParams.get('reportId'), 'newyear-uuid')
  assert.equal(h.location.searchParams.get('preview'), '1')
  assert.equal(h.api.verifiedReport(), null)
  assert.match(h.nodes.get('umsh-verified-reading').innerHTML, /2027년의 기준/)
})

test('newyear saved preview stays a preview on every reader route without starting paid sections', async () => {
  for (const page of ['04-step-4-report/index.html','05-step-5-chat/index.html','05-step-5-chat/chat.html','06-step-6_1-report-detail/index.html']) {
    const h = harness('/flow/newyear/'+page+'?reportId=newyear-uuid&preview=1', [{previewOnly:true,serviceKey:'newyear_flow',reportId:'fingerprint',resultId:'newyear-uuid',preview:{headline:'내 2027년 미리보기',signals:[]},paymentUrl:'/payment?product=newyear_flow&reportId=newyear-uuid'}])
    await h.api.fetch('/api/flow/newyear/analyze', {method:'POST',body:'{}',headers:{Authorization:'Bearer test'}})
    assert.equal(h.calls.length, 1)
    assert.equal(h.calls[0].path, '/api/report/newyear-uuid?preview=1')
    assert.equal(h.location.searchParams.get('preview'), '1')
    assert.equal(h.api.verifiedReport(), null)
    assert.match(h.nodes.get('umsh-verified-reading').innerHTML, /내 2027년 미리보기/)
  }
})

test('newyear preview intent propagates to adjacent result links but never to checkout', () => {
  const h = harness('/flow/newyear/04-step-4-report/index.html?reportId=newyear-uuid&preview=1', [])
  h.api.remember({resultId:'newyear-uuid',previewOnly:true})
  const click=h.listeners.get('click')![0] as (event:any)=>void
  const detail={href:'https://umsh.kr/flow/newyear/06-step-6_1-report-detail/index.html?section=6-1'}
  click({target:{closest(){return detail}}})
  const detailUrl=new URL(detail.href,'https://umsh.kr')
  assert.equal(detailUrl.searchParams.get('preview'),'1')
  assert.equal(detailUrl.searchParams.get('reportId'),'newyear-uuid')
  const payment={href:'https://umsh.kr/payment?product=newyear_flow&reportId=newyear-uuid'}
  const original=payment.href
  click({target:{closest(){return payment}}})
  assert.equal(payment.href,original)
  assert.equal(new URL(payment.href).searchParams.has('preview'),false)
})

test('newyear paid returns ignore stale preview flags and full responses clear preview intent', async () => {
  for(const suffix of ['orderId=confirmed-order','paid=1']) {
    const h=harness('/flow/newyear/04-step-4-report/index.html?reportId=newyear-uuid&preview=1&'+suffix,[{reportId:'fingerprint',resultId:'newyear-uuid',report:{reportId:'fingerprint',serviceKey:'newyear_flow',title:'전체 풀이',status:'complete',sections:[]}}])
    await h.api.fetch('/api/flow/newyear/analyze',{method:'POST',body:'{}'})
    assert.equal(h.calls[0].path,'/api/report/newyear-uuid'+(suffix.startsWith('orderId')?'?orderId=confirmed-order':''))
    assert.equal(h.location.searchParams.has('preview'),false)
    assert.match(h.nodes.get('umsh-verified-reading').innerHTML,/전체 풀이/)
  }
})

test('newyear preview URL behavior does not alter another service saved GET', async () => {
  const h=harness('/me/lucky/04-step-4-report/index.html?reportId=lucky-uuid&preview=1',[{previewOnly:true,serviceKey:'lucky_color',reportId:'lucky-uuid',preview:{headline:'기존 서비스'}}])
  await h.api.fetch('/api/me/lucky/analyze',{method:'POST',body:'{}'})
  assert.equal(h.calls[0].path,'/api/report/lucky-uuid')
})

test('all newyear reader routes re-open saved UUIDs and preserve the paid order reference', async () => {
  for (const page of ['04-step-4-report/index.html','05-step-5-chat/index.html','05-step-5-chat/chat.html','06-step-6_1-report-detail/index.html']) {
    const report = {reportId:'fingerprint',resultId:'newyear-uuid',serviceKey:'newyear_flow',status:'complete',title:'저장된 2027년 해석',sections:[{id:'1-1',status:'complete',category:'올해',classification:'방향',interpretation:'저장된 원문 전체입니다.'}]}
    const h = harness('/flow/newyear/'+page+'?reportId=newyear-uuid&orderId=paid-order', [{reportId:'fingerprint',resultId:'newyear-uuid',report,context:{serviceKey:'newyear_flow'}}])
    await h.api.fetch('/api/flow/newyear/analyze', {method:'POST',body:'{}',headers:{Authorization:'Bearer test'}})
    assert.equal(h.calls.length, 1)
    assert.equal(h.calls[0].path, '/api/report/newyear-uuid?orderId=paid-order')
    assert.equal(h.calls[0].options.method, 'GET')
    assert.equal(h.location.searchParams.get('orderId'), 'paid-order')
    assert.match(h.nodes.get('umsh-verified-reading').innerHTML, /저장된 원문 전체입니다/)
  }
})

test('newyear legacy cache is purged and cannot display another owner or service reading', async () => {
  const h = harness('/flow/newyear/06-step-6_1-report-detail/index.html', [{status:403,payload:{error:'권한 없음'}}], {
    umsh_newyear_report_v1:{report:{reportId:'stale-id',sections:[{interpretation:'OLD PRIVATE READING'}]}},
  })
  assert.equal(h.items.has('umsh_newyear_report_v1'), false)
  assert.equal(h.api.verifiedReport(), null)
  await h.api.fetch('/api/flow/newyear/analyze', {method:'POST',body:'{}'})
  assert.equal(h.calls[0].path, '/api/report/stale-id')
  assert.doesNotMatch(h.nodes.get('umsh-verified-reading').innerHTML, /OLD PRIVATE READING/)
  const other = harness('/flow/newyear/04-step-4-report/index.html?reportId=other', [{previewOnly:true,serviceKey:'lucky_color',resultId:'other',preview:{headline:'OTHER SERVICE PRIVATE'}}])
  await other.api.fetch('/api/flow/newyear/analyze', {method:'POST',body:'{}'})
  assert.doesNotMatch(other.nodes.get('umsh-verified-reading').innerHTML, /OTHER SERVICE PRIVATE/)
})

test('newyear section links keep their UUID and order reference through navigation', () => {
  const h = harness('/flow/newyear/05-step-5-chat/chat.html?reportId=newyear-uuid&orderId=paid-order', [])
  h.api.remember({resultId:'newyear-uuid'})
  const link = {href:'https://umsh.kr/flow/newyear/06-step-6_1-report-detail/index.html?section=6-1#step-6_1-report'}
  const click = h.listeners.get('click')![0] as (event:any)=>void
  click({target:{closest(){return link}}})
  const url = new URL(link.href, 'https://umsh.kr')
  assert.equal(url.searchParams.get('reportId'), 'newyear-uuid')
  assert.equal(url.searchParams.get('orderId'), 'paid-order')
  assert.equal(url.searchParams.get('section'), '6-1')
})

test('newyear boot validates a legacy paid return without an ID on the server', async () => {
  const h = harness('/flow/newyear/04-step-4-report/index.html?paid=1&orderId=legacy-order', [
    {enabled:true,url:'https://auth.example',publishableKey:'public-test-key'},
    {status:402,payload:{error:'결제가 확인되지 않았습니다.'}},
  ])
  const session = {access_token:'test-token',user:{id:'owner-a'}}
  h.context.supabase = {}
  h.context.UMSHAuthSession = {createClient(){return {auth:{getSession:async()=>({data:{session}}),onAuthStateChange(){}}}},enforceDeviceAuthSession:async(value:any)=>value}
  await h.listeners.get('DOMContentLoaded')![0]()
  assert.equal(h.calls[1].path, '/api/flow/newyear/analyze')
  assert.deepEqual(JSON.parse(h.calls[1].options.body), {orderId:'legacy-order'})
  assert.equal(h.calls[1].options.headers.Authorization, 'Bearer test-token')
  assert.equal(h.api.verifiedReport(), null)
  assert.match(h.nodes.get('umsh-verified-reading').innerHTML, /결제가 확인되지 않았습니다/)
})

test('a reportId revisits the saved record using GET, never re-analyzes',async()=>{
  const h=harness('/me/lucky/06-step-6_1-report-detail/index.html?reportId=saved-123',[{status:403,payload:{error:'다른 계정의 결과'}}])
  await h.api.fetch('/api/me/lucky/analyze',{method:'POST',body:'{}',headers:{Authorization:'Bearer test'}})
  assert.equal(h.calls[0].path,'/api/report/saved-123')
  assert.equal(h.calls[0].options.method,'GET')
  assert.equal(h.calls[0].options.body,undefined)
  assert.equal(h.api.verifiedReport(),null)
  assert.match(h.nodes.get('umsh-verified-reading').innerHTML,/다른 계정/)
})

test('first analysis before payment requests only a preview and retains its address',async()=>{
  const h=harness('/me/lucky/04-step-4-report/index.html',[{previewOnly:true,reportId:'r1',resultId:'uuid-1',preview:{headline:'내 방향',summary:'입력 근거',signals:['통찰 하나','통찰 둘'],paidValue:'자세한 판단 기준'},paymentUrl:'/payment?service=lucky_color'}])
  await h.api.fetch('/api/me/lucky/analyze',{method:'POST',body:'{"displayName":"점검"}',headers:{Authorization:'Bearer test'}})
  assert.equal(JSON.parse(h.calls[0].options.body).preview,true)
  assert.equal(h.location.searchParams.get('reportId'),'uuid-1')
  assert.match(h.nodes.get('umsh-verified-reading').innerHTML,/통찰 둘/)
  assert.equal(h.api.verifiedReport(),null)
})

test('a paid return with a saved identity reads and resumes that exact report',async()=>{
  const h=harness('/me/lucky/04-step-4-report/index.html?reportId=r1&paid=1',[{report:{reportId:'r1',status:'complete',title:'풀이',subtitle:'',sections:[]},reportId:'r1'}])
  await h.api.fetch('/api/me/lucky/analyze',{method:'POST',body:'{"orderId":"order-1"}',headers:{Authorization:'Bearer test'}})
  assert.equal(h.calls[0].path,'/api/report/r1?orderId=order-1')
  assert.equal(h.calls[0].options.method,'GET')
  assert.equal(h.calls[0].options.body,undefined)
})

test('a legacy paid return without a saved identity retains its original request',async()=>{
  const h=harness('/me/lucky/04-step-4-report/index.html?paid=1',[])
  await h.api.fetch('/api/me/lucky/analyze',{method:'POST',body:'{"orderId":"order-1","name":"점검"}'})
  assert.equal(h.calls[0].path,'/api/me/lucky/analyze')
  assert.equal(JSON.parse(h.calls[0].options.body).preview,undefined)
  assert.equal(JSON.parse(h.calls[0].options.body).name,'점검')
})

test('legacy cache bodies are not shown and cannot select another service report',async()=>{
  const h=harness('/me/lucky/06-step-6_1-report-detail/index.html',[{status:403,payload:{error:'권한 없음'}}],{
    'umsh:report:lucky_color':{reportId:'mine-hint',sections:[{interpretation:'STALE PRIVATE TEXT'}]},
    'umsh:report:cat_compatibility':{reportId:'wrong-service',sections:[{interpretation:'OTHER PRIVATE TEXT'}]},
  })
  assert.equal(h.items.has('umsh:report:lucky_color'),false)
  assert.equal(h.items.has('umsh:report:cat_compatibility'),true)
  await h.api.fetch('/api/me/lucky/analyze',{method:'POST',body:'{}'})
  assert.equal(h.calls[0].path,'/api/report/mine-hint')
  assert.doesNotMatch(h.nodes.get('umsh-verified-reading').innerHTML,/PRIVATE TEXT/)
})

test('the full reader preserves nine paragraphs and escapes markup',async()=>{
  const paragraphs=Array.from({length:9},(_,i)=>`문단 ${i+1} ${'충분한 설명 '.repeat(40)}`)
  paragraphs[8]+='<script>bad()</script>'
  const report={reportId:'r1',status:'complete',title:'풀이',subtitle:'설명',sections:[{id:'a',status:'complete',category:'첫 장',classification:'질문',hook:'핵심',interpretation:paragraphs.join('\n\n')}]}
  const h=harness('/me/lucky/06-step-6_1-report-detail/index.html?reportId=r1',[{report,context:{serviceKey:'lucky_color'}}])
  await h.api.fetch('/api/me/lucky/analyze',{method:'POST',body:'{}'})
  const html=h.nodes.get('umsh-verified-reading').innerHTML
  assert.match(html,/문단 9/)
  assert.match(html,/&lt;script&gt;/)
  assert.doesNotMatch(html,/<script>/)
  assert.ok(html.length>2000)
})

test('an introductory pause is not selected as the first insight',()=>{
  const h=harness('/work/move/04-step-4-report/index.html',[])
  assert.equal(h.api.firstInsight('흠... 지금은 조건을 먼저 비교합니다. 다음 문장입니다.'),'지금은 조건을 먼저 비교합니다.')
})

test('detail pages without an identity cannot create a fresh interpretation',async()=>{
  const h=harness('/me/lucky/06-step-6_1-report-detail/index.html',[])
  const response=await h.api.fetch('/api/me/lucky/analyze',{method:'POST',body:'{}'})
  assert.equal(response.status,404)
  assert.equal(h.calls.length,0)
})

test('identity hints are stored separately for each owner and service',async()=>{
  const h=harness('/me/lucky/04-step-4-report/index.html',[{previewOnly:true,reportId:'owner-a-report',preview:{headline:'미리보기',signals:[]}}])
  h.api.setOwner('owner-a')
  await h.api.fetch('/api/me/lucky/analyze',{method:'POST',body:'{}'})
  assert.equal(h.items.get('umsh:report-identity:owner-a:lucky_color'),'owner-a-report')
  assert.equal(h.items.has('umsh:report-identity:owner-b:lucky_color'),false)
  h.api.setOwner('owner-b')
  assert.equal(h.api.verifiedReport(),null)
})

test('a mismatched service cannot expose even its preview on the current page',async()=>{
  const h=harness('/me/lucky/04-step-4-report/index.html?reportId=other',[{previewOnly:true,serviceKey:'cat_compatibility',reportId:'other',preview:{headline:'PRIVATE OTHER SERVICE',signals:[]}}])
  await h.api.fetch('/api/me/lucky/analyze',{method:'POST',body:'{}'})
  assert.doesNotMatch(h.nodes.get('umsh-verified-reading').innerHTML,/PRIVATE OTHER SERVICE/)
  assert.match(h.nodes.get('umsh-verified-reading').innerHTML,/이 서비스의 해석이 아닙니다/)
})

test('only pending sections resume automatically and no more than two at once',async()=>{
  const sections=['a','b','c'].map(id=>({id,status:'pending',category:'장',classification:id}))
  sections.push({id:'failed',status:'failed',category:'장',classification:'실패'})
  const h=harness('/me/lucky/06-step-6_1-report-detail/index.html?reportId=r1',[{reportId:'r1',report:{reportId:'r1',status:'pending',title:'풀이',sections}}, {}, {}])
  await h.api.fetch('/api/me/lucky/analyze',{method:'POST',body:'{}',headers:{Authorization:'Bearer test'}})
  const resumes=h.calls.filter(call=>call.path==='/api/report/section')
  assert.equal(resumes.length,2)
  assert.deepEqual(resumes.map(call=>JSON.parse(call.options.body).sectionId),['a','b'])
  assert.ok(resumes.every(call=>JSON.parse(call.options.body).retry!==true))
})

test('an account switch removes an already displayed private result on its permalink',()=>{
  const h=harness('/r/private-result',[])
  h.api.setOwner('owner-a')
  h.api.consume({reportId:'r1',report:{reportId:'r1',title:'PRIVATE OWNER A',sections:[{id:'a',status:'complete',category:'장',classification:'질문',interpretation:'PRIVATE OWNER A READING'}]}})
  assert.match(h.nodes.get('umsh-verified-reading').innerHTML,/PRIVATE OWNER A/)
  h.api.setOwner('owner-b')
  assert.equal(h.api.verifiedReport(),null)
  assert.doesNotMatch(h.nodes.get('umsh-verified-reading').innerHTML,/PRIVATE OWNER A/)
})

test('an old account response arriving after logout cannot repopulate private content',async()=>{
  let release!:(value:unknown)=>void
  const waiting=new Promise(resolve=>{release=resolve})
  const h=harness('/me/lucky/04-step-4-report/index.html?reportId=r1',[()=>waiting])
  h.api.setOwner('owner-a')
  const pending=h.api.fetch('/api/me/lucky/analyze',{method:'POST',body:'{}'})
  h.api.setOwner('')
  release({reportId:'r1',report:{reportId:'r1',title:'PRIVATE OWNER A',sections:[]}})
  const response=await pending
  assert.equal(response.status,403)
  assert.equal(h.api.verifiedReport(),null)
  assert.doesNotMatch(h.nodes.get('umsh-verified-reading')?.innerHTML || '',/PRIVATE OWNER A/)
})

const dailyFixture={todayFortune:{date:{label:'합성 날짜'},profile:{name:'점검'},reading:{title:'저장한 오늘의 기준',summary:'이미 잘되는 일을 유지합니다.',work:'일 문단',money:'돈 문단',relationship:'관계 문단',caution:'확인할 조건',action:'행동 기준',score:{total:99}}},reportId:'daily-legacy',resultId:'daily-result',publicUrl:'/r/daily-result'}

test('today fortune stores its result address without requesting a paid preview',async()=>{
  const h=harness('/today/free',[dailyFixture])
  h.api.setOwner('owner-a')
  await h.api.fetch('/api/today/fortune',{method:'POST',body:'{}'})
  assert.equal(h.calls[0].path,'/api/today/fortune')
  assert.equal(JSON.parse(h.calls[0].options.body).preview,undefined)
  assert.equal(h.location.searchParams.get('reportId'),'daily-result')
  assert.equal(h.items.get('umsh:report-identity:owner-a:today_fortune'),'daily-result')
  const html=h.nodes.get('umsh-verified-reading').innerHTML
  assert.match(html,/저장한 오늘의 기준/)
  assert.match(html,/돈 문단/)
  assert.doesNotMatch(html,/같은 해석 다시 열기|href="\/r\//)
  assert.match(html,/새 오늘운 확인/)
  assert.match(html,/aria-label="오늘의 운 점수 99점, 100점 만점"/)
  assert.doesNotMatch(html,/전체 해석 열어보기/)
})

test('daily scores preserve saved total and map each detail score to its own section',()=>{
  const fixture=structuredClone(dailyFixture) as any
  fixture.todayFortune.reading.score={total:64,work:1,money:2,relationship:3,caution:4}
  fixture.todayFortune.reading.details={work:{score:72.5},money:{score:81},relationship:{score:63},caution:{score:58}}
  fixture.todayFortune.reading.zodiac={birthYear:1995,animal:'돼지',title:'나의 띠별 풀이',text:'저장한 띠별 문단'}
  const snapshot=structuredClone(fixture)
  const h=harness('/today/free?reportId=daily-result',[])
  h.api.setOwner('owner-a')
  h.api.consume(fixture)
  const html=h.nodes.get('umsh-verified-reading').innerHTML
  for(const [label,score] of [['오늘의 운',64],['일과 활동',72.5],['돈과 선택',81],['관계와 대화',63],['오늘 챙길 것',58]]) {
    assert.ok(html.includes(`aria-label="${label} 점수 ${score}점, 100점 만점"`))
  }
  assert.equal((html.match(/class="daily-score-total"/g)||[]).length,1)
  assert.equal((html.match(/class="daily-score-badge"/g)||[]).length,4)
  assert.match(html,/100점 기준 · 오늘의 흐름 지표/)
  assert.doesNotMatch(html,/위험 확률|성공 확률|같은 해석 다시 열기|href="\/r\//)
  for(const text of ['이미 잘되는 일을 유지합니다.','저장한 띠별 문단','일 문단','돈 문단','관계 문단','확인할 조건','행동 기준']) assert.ok(html.includes(text))
  assert.deepEqual(fixture,snapshot)
  assert.equal(h.location.searchParams.get('reportId'),'daily-result')
  assert.equal(h.items.get('umsh:report-identity:owner-a:today_fortune'),'daily-result')
  assert.equal(h.calls.length,0)
})

test('daily score badges accept zero and 100 without replacing saved boundary values',()=>{
  for(const total of [0,100]) {
    const fixture=structuredClone(dailyFixture) as any
    fixture.todayFortune.reading.score={total,work:100,money:0,relationship:100,caution:0}
    fixture.todayFortune.reading.details={work:{score:0},money:{score:100}}
    const h=harness('/r/daily-result',[])
    h.api.consume(fixture)
    const html=h.nodes.get('umsh-verified-reading').innerHTML
    for(const [label,score] of [['오늘의 운',total],['일과 활동',0],['돈과 선택',100],['관계와 대화',100],['오늘 챙길 것',0]]) {
      assert.ok(html.includes(`aria-label="${label} 점수 ${score}점, 100점 만점"`))
    }
  }
})

test('daily score badges use a valid legacy score only when a detail score is missing or invalid',()=>{
  for(const invalid of [undefined,null,'80',true,NaN,Infinity,-Infinity,-1,101,{},[]]) {
    const fixture=structuredClone(dailyFixture) as any
    fixture.todayFortune.reading.score={total:64,work:71,money:82,relationship:63,caution:54}
    fixture.todayFortune.reading.details=Object.fromEntries(['work','money','relationship','caution'].map(key=>[key,{score:invalid}]))
    const h=harness('/r/daily-result',[])
    h.api.consume(fixture)
    const html=h.nodes.get('umsh-verified-reading').innerHTML
    for(const [label,score] of [['일과 활동',71],['돈과 선택',82],['관계와 대화',63],['오늘 챙길 것',54]]) {
      assert.ok(html.includes(`aria-label="${label} 점수 ${score}점, 100점 만점"`))
    }
  }
})

test('daily reader omits invalid or absent score badges instead of inventing or clamping values',()=>{
  for(const invalid of [undefined,null,'80',true,NaN,Infinity,-Infinity,-1,101,{},[]]) {
    const fixture=structuredClone(dailyFixture) as any
    fixture.todayFortune.reading.score={total:invalid,work:invalid,money:invalid,relationship:invalid,caution:invalid}
    fixture.todayFortune.reading.details={work:{score:invalid}}
    const h=harness('/r/daily-result',[])
    h.api.consume(fixture)
    const html=h.nodes.get('umsh-verified-reading').innerHTML
    assert.doesNotMatch(html,/class="daily-score-total"|class="daily-score-badge"|100점 기준/)
    assert.match(html,/일 문단/)
  }
  const fixture=structuredClone(dailyFixture) as any
  delete fixture.todayFortune.reading.score
  const h=harness('/r/daily-result',[])
  h.api.consume(fixture)
  assert.doesNotMatch(h.nodes.get('umsh-verified-reading').innerHTML,/class="daily-score-total"|class="daily-score-badge"|100점 기준/)
})

test('reopening a daily result uses GET and does not call fortune generation again',async()=>{
  const h=harness('/today/free?reportId=daily-result',[dailyFixture])
  await h.api.fetch('/api/today/fortune',{method:'POST',body:'{"year":2000}'})
  assert.equal(h.calls.length,1)
  assert.equal(h.calls[0].path,'/api/report/daily-result')
  assert.equal(h.calls[0].options.method,'GET')
  assert.equal(h.calls[0].options.body,undefined)
  assert.match(h.nodes.get('umsh-verified-reading').innerHTML,/합성 날짜/)
})

test('a direct portal todayResult link restores its explicit daily ID without generating',async()=>{
  const h=harness('/cmdg/?reportId=daily-result#todayResult',[dailyFixture])
  await h.api.fetch('/api/today/fortune',{method:'POST',body:'{}'})
  assert.equal(h.calls[0].path,'/api/report/daily-result')
  assert.equal(h.calls[0].options.method,'GET')
  assert.equal(h.location.searchParams.get('entry'),'today')
  assert.equal(h.location.hash,'#todayResult')
})

test('a saved daily page clears stale signup/input step fragments',()=>{
  const h=harness('/today/free?start=1#step-2-saju-input',[])
  h.api.consume(dailyFixture)
  assert.equal(h.location.hash,'')
  assert.equal(h.location.searchParams.has('start'),false)
})

test('daily permalink payloads render without paid-section generation',()=>{
  const h=harness('/r/daily-result',[])
  h.api.setOwner('owner-a')
  h.api.consume({...dailyFixture,report:{serviceKey:'today',sections:[]}}, {Authorization:'Bearer synthetic'})
  assert.match(h.nodes.get('umsh-verified-reading').innerHTML,/저장한 오늘의 기준/)
  assert.equal(h.calls.length,0)
  h.api.setOwner('owner-b')
  assert.doesNotMatch(h.nodes.get('umsh-verified-reading').innerHTML,/저장한 오늘의 기준/)
})

test('signal service grouping uses the same neutral title as the backend',()=>{
  const signal=readFileSync(new URL('../../사주/js/signal-service.js',import.meta.url),'utf8')
  assert.match(signal,/관계 밖 활동과 합의한 경계/)
  assert.doesNotMatch(signal,/애인의 바람기 레이더/)
  for(const page of ['01-step-1-story/index.html','02-step-2-saju-input/index.html','04-step-4-report/index.html','05-step-5-chat/chat.html','06-step-6_1-report-detail/index.html']) {
    const html=readFileSync(new URL('../../사주/love/signal/'+page,import.meta.url),'utf8')
    assert.match(html,/관계 밖 활동과 합의한 경계/)
    assert.match(html,/새 접점과 관계 의향/)
    assert.doesNotMatch(html,/관계의 경계와 약속|관계 변화 확인|선을 넘기 쉬운 환경운/)
  }
})

test('a permalink selects the same item by section slug or immutable generation ID',()=>{
  for(const selected of ['second','generation-second']) {
    const h=harness('/r/report?section='+selected,[])
    h.api.consume({reportId:'report',report:{title:'풀이',sections:[
      {id:'first',generationId:'generation-first',status:'complete',category:'장',classification:'처음',interpretation:'첫 항목'},
      {id:'second',generationId:'generation-second',status:'complete',category:'장',classification:'둘째',interpretation:'같은 저장 항목'},
    ]}})
    const html=h.nodes.get('umsh-verified-reading').innerHTML
    assert.match(html,/<details data-section="second"[^>]* open>/)
    assert.doesNotMatch(html,/<details data-section="first"[^>]* open>/)
  }
})

test('saved report cards distinguish answer, evidence, and action without repeating the hook',()=>{
  const h=harness('/r/readable-report',[])
  h.api.consume({reportId:'readable-report',report:{title:'저장된 풀이',sections:[{
    id:'first',status:'complete',category:'돈',classification:'지금의 선택.',hook:'지금은 보류가 맞습니다.',
    interpretation:'지금은 보류가 맞습니다. 자동이체 뒤에 남는 금액이 판단 기준입니다.\n\n실제 결제 내역을 주 단위로 묶으면 반복 지출이 보입니다. 아직 쓰지 않은 돈은 수입처럼 세지 않습니다.\n\n이번 주에는 선택 지출 합계를 적습니다. 다음 결제 전에 남은 한도와 비교합니다.'
  }]}})
  const html=h.nodes.get('umsh-verified-reading').innerHTML
  assert.match(html,/class="reading-block reading-answer"/)
  assert.match(html,/>한 줄 답</)
  assert.match(html,/class="reading-block reading-evidence"/)
  assert.match(html,/>근거</)
  assert.match(html,/class="reading-block reading-action"/)
  assert.match(html,/>행동</)
  assert.equal((html.match(/지금은 보류가 맞습니다\./g)||[]).length,1)
  assert.match(html,/>돈 · 지금의 선택</)
})

test('legacy one-paragraph reports use a truthful combined role instead of inventing an action split',()=>{
  const h=harness('/r/legacy-report',[])
  h.api.consume({reportId:'legacy-report',report:{title:'예전 풀이',sections:[{
    id:'legacy',status:'complete',category:'관계',classification:'현재 흐름',hook:'약속을 먼저 봅니다.',
    interpretation:'답장의 속도만으로 마음을 정할 수 없습니다. 실제로 지켜진 약속을 확인합니다. 다음 대화에서 일정이 바뀐 이유를 묻습니다.'
  }]}})
  const html=h.nodes.get('umsh-verified-reading').innerHTML
  assert.match(html,/>근거와 행동</)
  assert.doesNotMatch(html,/class="reading-block reading-action"/)
})

test('preview CTA names the result the reader will open',()=>{
  const h=harness('/work/move/04-step-4-report/index.html',[])
  h.api.showPreview({preview:{headline:'먼저 본 방향',summary:'조건을 비교합니다.',signals:[]},paymentUrl:'/payment'}, {})
  const html=h.nodes.get('umsh-verified-reading').innerHTML
  assert.match(html,/>전체 해석 목차 보기</)
  assert.doesNotMatch(html,/전체 해석 열어보기/)
})

test('reader auth events replace refreshed credentials and clear content immediately on logout',async()=>{
  const report={reportId:'report',report:{title:'OWNER_READING',sections:[{id:'a',status:'complete',category:'장',classification:'항목',interpretation:'PRIVATE_READING'}]}}
  const h=harness('/me/lucky/04-step-4-report/index.html?reportId=report',[{enabled:true,url:'https://unused.invalid',publishableKey:'synthetic'},report,{}])
  let onAuth!:(event:string,session:any)=>void
  const session={user:{id:'owner-a'},access_token:'original-token'}
  const client={auth:{getSession:async()=>({data:{session}}),onAuthStateChange(callback:typeof onAuth){onAuth=callback}}}
  h.context.supabase={}
  h.context.UMSHAuthSession={createClient:()=>client,enforceDeviceAuthSession:async(value:any)=>value}
  await h.listeners.get('DOMContentLoaded')![0]()
  onAuth('TOKEN_REFRESHED',{user:{id:'owner-a'},access_token:'refreshed-token'})
  h.api.consume({reportId:'report',report:{title:'OWNER_READING',sections:[{id:'pending',status:'pending',category:'장',classification:'항목'}]}})
  const call=h.calls.find(item=>item.path==='/api/report/section')!
  assert.equal(call.options.headers.Authorization,'Bearer refreshed-token')
  const epoch=h.api.ownerEpoch()
  onAuth('SIGNED_OUT',null)
  assert.ok(h.api.ownerEpoch()>epoch)
  assert.doesNotMatch(h.nodes.get('umsh-verified-reading').innerHTML,/OWNER_READING|PRIVATE_READING/)
})

test('preview and full reader keep branded navigation available',()=>{
  const h=harness('/me/lucky/04-step-4-report/index.html',[])
  h.api.consume({previewOnly:true,reportId:'report',preview:{headline:'미리보기',signals:[]}})
  assert.match(h.nodes.get('umsh-verified-reading').style.cssText,/background:#110e0a;color:#f5ead7/)
  assert.match(h.nodes.get('umsh-verified-reading').innerHTML,/운명상회 홈/)
  h.api.consume({reportId:'report',report:{title:'풀이',sections:[]}})
  assert.match(h.nodes.get('umsh-verified-reading').innerHTML,/내 구매 내역/)
})

test('saved daily uses the shared shell layout and keeps legacy body private',()=>{
  const h=harness('/today/free?reportId=daily-result',[])
  const legacy=h.context.document.createElement('div');legacy.id='legacy-private-app'
  h.context.document.body.appendChild(legacy)
  const mounts:any[]=[]
  h.context.UMSHChrome={mount:(options:any)=>mounts.push(options)}
  h.api.consume(dailyFixture)
  assert.equal(h.nodes.get('umsh-verified-reading').parentNode.id,'umsh-verified-layout')
  assert.equal(legacy.hidden,true)
  assert.equal(mounts[0].root,'#umsh-verified-layout')
  const guard=h.context.document.head.children.find((node:any)=>node.tagName==='STYLE')
  assert.match(guard.textContent,/:not\(\[data-umsh-service-bottom\]\)/)
  assert.match(guard.textContent,/:not\(#umsh-verified-layout\)/)
  const html=h.nodes.get('umsh-verified-reading').innerHTML
  assert.match(html,/오늘의 결론/)
  assert.doesNotMatch(html,/실제 사건·성과|점수로 측정/)
  assert.match(html,/href="\/today\/free\?start=1"/)
})

test('year-based daily copy is escaped and does not mutate a saved snapshot',()=>{
  const fixture=structuredClone(dailyFixture) as any
  fixture.todayFortune.reading.zodiac={birthYear:1995,animal:'돼지',title:'1995년생 · 돼지띠',text:'<img src=x onerror=alert(1)> 함께할 시간을 정하세요.'}
  const before=JSON.stringify(fixture)
  const h=harness('/r/daily-result',[])
  h.api.consume(fixture)
  const html=h.nodes.get('umsh-verified-reading').innerHTML
  assert.match(html,/1995년생 · 돼지띠/)
  assert.match(html,/출생연도 기준/)
  assert.match(html,/&lt;img/)
  assert.doesNotMatch(html,/<img src=x/)
  assert.equal(JSON.stringify(fixture),before)
})
