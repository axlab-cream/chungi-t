import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

const source = readFileSync(new URL('../../사주/js/umsh-report-access.js', import.meta.url), 'utf8')
const inplaceCss = readFileSync(new URL('../../사주/css/umsh-verified-inplace.css', import.meta.url), 'utf8')

test('in-place detailed readers render the life-flow component with the shared readable hierarchy', () => {
  assert.match(source, /umsh-verified-inplace\.css\?v=\d{8}-[\w-]+/)
  assert.match(inplaceCss, /\[data-umsh-slot="sections"\] \{[\s\S]*grid-template-columns: minmax\(0, 1fr\)/)
  assert.match(inplaceCss, /\[data-umsh-slot="sections"\] \.umsh-summary \{[\s\S]*grid-template-columns: minmax\(0, 1fr\)/)
  assert.match(inplaceCss, /\[data-umsh-slot="sections"\] > \.umsh-life-flow/)
  assert.match(inplaceCss, /\.umsh-flow-line \{ fill: none; stroke: var\(--gold/)
  assert.match(inplaceCss, /\.umsh-life-flow-source > summary::after \{ content: '접기 −'/)
  assert.match(inplaceCss, /\.umsh-life-flow-timeline \{[\s\S]*grid-template-columns: repeat\(5, minmax\(116px, 1fr\)\)/)
})

test('saved reading shares only its canonical URL by copying and never navigates', async () => {
  const h = harness('/r/saved-uuid?reportId=saved-uuid', [])
  const copied: string[] = []
  h.context.navigator = { clipboard: { writeText: async (value: string) => { copied.push(value) } } }
  h.api.consume({ resultId: 'saved-uuid', report: { serviceKey: 'saju_master', title: '개인 제목', subtitle: '개인 내용', sections: [] } })
  const node = h.nodes.get('umsh-verified-reading')
  assert.match(node.innerHTML, /data-umsh-report-share="saved-uuid"[^>]*>링크 공유하기<\/button>/)
  assert.doesNotMatch(node.innerHTML, /이 해석의 고유 주소 열기/)
  const status = { textContent: '' }
  const button = { dataset: { umshReportShare: 'saved-uuid' }, nextElementSibling: status }
  const click = h.listeners.get('click')![2] as (event: any) => Promise<void>
  await click({ target: { closest(selector: string) { return selector === '[data-umsh-report-share]' ? button : null } }, preventDefault() {} })
  assert.deepEqual(copied, ['https://umsh.kr/r/saved-uuid'])
  assert.match(status.textContent, /복사/)
  assert.equal(h.location.href, 'https://umsh.kr/r/saved-uuid?reportId=saved-uuid')
})

test('saved reading share shows a failure without opening another app when clipboard is denied', async () => {
  const h = harness('/r/saved-uuid', [])
  h.context.navigator = { clipboard: { writeText: async () => { throw new Error('denied') } } }
  h.api.consume({ resultId: 'saved-uuid', report: { serviceKey: 'saju_master', title: '제목', subtitle: '', sections: [] } })
  const status = { textContent: '' }
  const button = { dataset: { umshReportShare: 'saved-uuid' }, nextElementSibling: status }
  const click = h.listeners.get('click')![2] as (event: any) => Promise<void>
  await click({ target: { closest(selector: string) { return selector === '[data-umsh-report-share]' ? button : null } }, preventDefault() {} })
  assert.match(status.textContent, /복사하지 못/)
  assert.equal(h.location.pathname, '/r/saved-uuid')
})

test('report sharing metadata uses the public brand JPEG with correct type and dimensions, not private report text', () => {
  const html = readFileSync(new URL('../../사주/report-view.html', import.meta.url), 'utf8')
  assert.match(html, /property="og:image" content="https:\/\/umsh\.kr\/assets\/umsh-kakao-share\.jpg\?v=20260904-wide"/)
  assert.match(html, /property="og:image:type" content="image\/jpeg"/)
  assert.match(html, /property="og:image:width" content="1200"/)
  assert.match(html, /property="og:image:height" content="600"/)
  assert.doesNotMatch(html, /property="og:url" content="https:\/\/umsh\.kr\/r\/"/)
})

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

function harness(path: string, responses: unknown[], cache: Record<string, unknown> = {}, options: { inplace?: boolean } = {}) {
  const calls: Array<{path: string; options: any}> = []
  const nodes = new Map<string, any>()
  const items = new Map(Object.entries(cache).map(([key,value])=>[key,JSON.stringify(value)]))
  const location = new URL(path, 'https://umsh.kr')
  const listeners = new Map<string, Array<() => unknown>>()
  function element(tag = 'div'): any {
    const attrs = new Map<string,string>()
    return {id:'',tagName:tag.toUpperCase(),innerHTML:'',children:[],style:{cssText:'',setProperty(){},removeProperty(){}},
      setAttribute(name:string,value:string){attrs.set(name,value)},hasAttribute(name:string){return attrs.has(name)},getAttribute(name:string){return attrs.get(name)},removeAttribute(name:string){attrs.delete(name)},
      addEventListener(){},querySelectorAll(){return []},
      appendChild(node:any){this.children.push(node);node.parentNode=this;if(node.id)nodes.set(node.id,node)},
      insertAdjacentHTML(_where:string,text:string){this.innerHTML+=text}}
  }
  const documentElement = element('html')
  if (options.inplace) documentElement.setAttribute('data-umsh-verified-inplace', '')
  const document = {
    readyState:'loading', addEventListener(name:string,callback:()=>unknown) {listeners.set(name,[...(listeners.get(name)||[]),callback])}, querySelectorAll(){return []},querySelector(){return null},
    getElementById(id: string){return nodes.get(id)},
    createElement:element,documentElement,head:element('head'),body:element('body'),
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

test('05·06은 preview analyze로 빈 목차를 만들지 않는다', async () => {
  const h = harness('/money/save/05-step-5-chat/chat.html', [{
    reportId: 'save-1',
    report: { sections: [{ id: 'a', category: '장', classification: '항목', interpretation: '본문' }] },
  }])
  const response = await h.api.fetch('/api/money/save/analyze', { method: 'POST', body: '{}' })
  assert.equal(response.status, 200)
  assert.equal(h.calls[0].path, '/api/money/save/analyze')
  assert.equal(JSON.parse(h.calls[0].options.body).preview, undefined)
})

test('detail pages without an identity request the full analyze, not a preview skeleton', async () => {
  const h = harness('/me/lucky/06-step-6_1-report-detail/index.html', [{
    reportId: 'lucky-1',
    report: { sections: [{ id: 'a', interpretation: '본문' }] },
  }])
  const response = await h.api.fetch('/api/me/lucky/analyze', { method: 'POST', body: '{}' })
  assert.equal(response.status, 200)
  assert.equal(JSON.parse(h.calls[0].options.body).preview, undefined)
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

test('only pending sections resume automatically and no more than four at once',async()=>{
  const sections=['a','b','c','d','e'].map(id=>({id,status:'pending',category:'장',classification:id}))
  sections.push({id:'failed',status:'failed',category:'장',classification:'실패'})
  const h=harness('/me/lucky/06-step-6_1-report-detail/index.html?reportId=r1',[{reportId:'r1',report:{reportId:'r1',status:'pending',title:'풀이',sections}}, {}, {}, {}, {}])
  await h.api.fetch('/api/me/lucky/analyze',{method:'POST',body:'{}',headers:{Authorization:'Bearer test'}})
  const resumes=h.calls.filter(call=>call.path==='/api/report/section')
  assert.equal(resumes.length,4)
  assert.deepEqual(resumes.map(call=>JSON.parse(call.options.body).sectionId),['a','b','c','d'])
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

test('a generic permalink boots from its path identity and trusts only the server service key',async()=>{
  const report={reportId:'fingerprint',resultId:'shared-uuid',serviceKey:'saju_master',status:'complete',title:'저장된 공용 리더',sections:[{id:'profile',status:'complete',category:'기본',classification:'현재 기준',interpretation:'서버가 반환한 저장 결과입니다.'}]}
  const h=harness('/r/shared-uuid',[
    {enabled:false,developmentReportAccess:true},
    {reportId:'fingerprint',resultId:'shared-uuid',serviceKey:'saju_master',report,context:{serviceKey:'saju_master'}},
  ])
  await h.listeners.get('DOMContentLoaded')![0]()
  assert.equal(h.calls[0].path,'/api/auth/config')
  assert.equal(h.calls[1].path,'/api/report/shared-uuid')
  assert.equal(h.location.searchParams.get('reportId'),'shared-uuid')
  assert.match(h.nodes.get('umsh-verified-reading').innerHTML,/서버가 반환한 저장 결과입니다/)
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

test('saved today routes converge on the same portal page and result identity', () => {
  for (const path of ['/r/daily-result', '/today/free?reportId=daily-result']) {
    const h = harness(path, [])
    const redirects: string[] = []
    ;(h.location as any).replace = (target: string) => redirects.push(target)
    h.api.consume(dailyFixture)
    assert.deepEqual(redirects, ['/cmdg/?reportId=daily-result#todayResult'])
    assert.equal(h.nodes.has('umsh-verified-reading'), false)
  }
})

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
  assert.match(html,/<nav class="daily-links" aria-label="평생운 보기"><a class="daily-primary-link" href="\/cmdg\/\?entry=lifelong">평생운 확인<\/a><\/nav>/)
  assert.doesNotMatch(html,/새 오늘운 확인|href="\/today\/free\?start=1"/)
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

test('saved report renders only the API-calculated daewoon timeline and shared member context',()=>{
  const h=harness('/r/life-flow-report',[])
  h.api.consume({
    reportId:'life-flow-report',
    context:{serviceKey:'saju_master'},
    analysis:{fortune:{currentYear:2026,currentDaewoon:'庚辰',samjae:{status:'current',phase:'middle',periodStartYear:2025,periodEndYear:2027,branches:['巳','午','未']},daewoon:[
      {age:'22~31세',ageStart:22,ageEnd:31,startYear:2013,pillar:'己卯'},
      {age:'32~41세',ageStart:32,ageEnd:41,startYear:2023,pillar:'庚辰'},
    ]}},
    memberContext:{work:'역할과 평가 기준을 한 문장으로 정리해 두었습니다.',relationship:'약속의 시간과 이동 부담을 먼저 확인합니다.'},
    report:{title:'저장된 풀이',sections:[{id:'profile',order:1,status:'complete',category:'현재',classification:'기준',interpretation:'저장된 원문입니다.'}]},
  })
  const html=h.nodes.get('umsh-verified-reading').innerHTML
  assert.match(html,/나의 대운 흐름/)
  assert.match(html,/32~41세/)
  assert.match(html,/2023년 시작/)
  assert.match(html,/현재/)
  assert.match(html,/aria-current="step"/)
  assert.match(html,/삼재/)
  assert.match(html,/2025~2027년/)
  assert.match(html,/가운데 해/)
  assert.match(html,/\/assets\/cmdg-review\/01-core-strength\.png/)
  assert.match(html,/역할과 평가 기준을 한 문장으로 정리/)
  assert.doesNotMatch(html,/운세 점수|상승 곡선/)
})

test('cmdg report keeps every stored paragraph and supplies the sixteen review visuals from member data',()=>{
  const ids=['profile','day-master-strength','hidden-personality','balance','useful-god-eokbu','concern-loop','career-money','career-transition','wealth-flow','love-loop','destiny-partner','avoid-relationship','love-timing','future-flow','sewoon-detail','action-guide']
  const h=harness('/r/cmdg-review',[])
  h.api.consume({
    reportId:'cmdg-review',context:{serviceKey:'saju_master'},
    analysis:{elements:{wood:3,fire:1,earth:1,metal:1,water:2},dominantElement:'목(木)',usefulGod:'수(水)',fortune:{currentYear:2026,currentDaewoon:'癸未',yearPillar:'丙午',daewoon:[
      {age:'16~25세',ageStart:16,ageEnd:25,startYear:2016,pillar:'甲申'},
      {age:'26~35세',ageStart:26,ageEnd:35,startYear:2026,pillar:'癸未'},
    ]}},
    memberContext:{money:'실제 보상 조건',work:'현재 직장의 역할',relationship:'토요일 약속',planning:'올해의 결정'},
    report:{title:'회원별 풀이',sections:ids.map((id,index)=>({id,order:index+1,status:'complete',category:'기존',classification:'제목',hook:`한 줄 답 ${index+1}`,interpretation:`저장된 전체 풀이 ${index+1}. 첫 근거입니다.\n\n두 번째 근거입니다.\n\n마지막 행동입니다.`}))},
  })
  const html=h.nodes.get('umsh-verified-reading').innerHTML
  assert.equal((html.match(/class="umsh-cmdg-visual"/g)||[]).length,16)
  assert.equal((html.match(/class="umsh-cmdg-lead"/g)||[]).length,16)
  assert.equal((html.match(/>쉬운 풀이·보강</g)||[]).length,16)
  assert.equal((html.match(/>추가로 확인할 것</g)||[]).length,16)
  assert.equal((html.match(/class="reading-card"/g)||[]).length,16)
  for(let index=0;index<ids.length;index+=1) assert.match(html,new RegExp(`저장된 전체 풀이 ${index+1}\\.`))
  assert.match(html,/내 힘이 집중되는 곳/)
  assert.match(html,/실제 보상 조건/)
  assert.match(html,/현재 직장의 역할/)
  assert.match(html,/토요일 약속/)
  assert.match(html,/제안받은 역할·보상·근무 방식은 확인됐나요/)
  assert.match(html,/umsh-flow-line/)
  assert.match(html,/M58 130 L88 35/)
  assert.match(html,/인생의 성공·수입을 예측한 점수는 아닙니다/)
})

test('cmdg without optional real-world notes does not redirect readers to profile registration',()=>{
  const h=harness('/r/cmdg-no-context',[])
  h.api.consume({
    reportId:'cmdg-no-context',context:{serviceKey:'saju_master'},
    analysis:{fortune:{currentYear:2026,currentDaewoon:'癸未',yearPillar:'丙午',daewoon:[
      {age:'26~35세',ageStart:26,ageEnd:35,startYear:2026,pillar:'癸未'},
    ]}},
    report:{title:'검토용 풀이',sections:[{id:'career-transition',order:1,status:'complete',category:'일',classification:'선택',hook:'조건을 비교합니다.',interpretation:'실제 조건은 확인되지 않았습니다.'}]},
  })
  const html=h.nodes.get('umsh-verified-reading').innerHTML
  assert.match(html,/제안받은 역할·보상·근무 방식은 확인됐나요/)
  assert.match(html,/개인의 실제 조건은 이 그래프에 포함되지 않습니다/)
  assert.doesNotMatch(html,/MY에서 한 번 등록|MY에서 실제 조건 확인하기|\/profile/)
  assert.doesNotMatch(html,/내가 저장한 현실 기준/)
})

test('verified summary photo stays inside the narrow report card without cropping',()=>{
  const css=readFileSync(new URL('../../사주/css/umsh-verified-reader.css',import.meta.url),'utf8')
  assert.match(css,/#umsh-verified-reading \.umsh-longform \{ grid-template-columns: minmax\(0, 1fr\); \}/)
  assert.match(css,/#umsh-verified-reading \.umsh-summary \{ grid-template-columns: minmax\(0, 1fr\); \}/)
  assert.match(css,/#umsh-verified-reading \.umsh-summary-figure \{[^}]*width: 100%;[^}]*min-width: 0;[^}]*overflow: hidden;/)
  assert.match(css,/#umsh-verified-reading \.umsh-summary-figure img \{[^}]*width: 100%;[^}]*max-width: 100%;[^}]*height: auto;[^}]*object-fit: contain;/)
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
  assert.match(html,/>전체 보기</)
  assert.doesNotMatch(html,/전체 해석 열어보기/)
})

test('preview separates verdict, representative evidence and exact full-report scope',()=>{
  const h=harness('/work/move/04-step-4-report/index.html',[])
  h.api.showPreview({preview:{headline:'지금은 제안 조건을 비교할 때입니다.',summary:'역할 범위와 통근 조건이 함께 확인됐습니다.',insights:['예를 들어 출근길 이동 시간을 기록해 보세요.'],signals:[],paidValue:'전체 해석에서는 10개 항목의 조건을 비교합니다.'},paymentUrl:'/payment'}, {})
  const html=h.nodes.get('umsh-verified-reading').innerHTML
  assert.match(html,/class="preview-heading"/)
  assert.match(html,/id="preview-evidence-title">지금 먼저 확인할 장면/)
  assert.match(html,/예를 들어 출근길 이동 시간을 기록/)
  assert.match(html,/id="preview-scope-title">이어서 비교할 내용/)
  assert.match(html,/10개 항목/)
  assert.doesNotMatch(html,/전체 본문.*10개 항목.*예를 들어 출근길/s)
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

/**
 * 2026-09-18: 해석 화면 맨 위의 "운명상회 홈 · 내 구매 내역" 줄과 "운명상회 · 저장된 전체 해석"
 * 꼬리표를 걷어냈다. 공용 상단바와 하단 내비게이션이 같은 이동을 이미 제공해서 중복이었고,
 * 해석을 열자마자 읽어야 할 것은 제목과 결론이다. 갈 곳이 꼭 필요한 오류·로그인 화면(gate)
 * 에는 그대로 남긴다.
 */
test('해석 화면은 공용 크롬과 중복되는 상단 링크를 넣지 않는다',()=>{
  const h=harness('/me/lucky/04-step-4-report/index.html',[])
  h.api.consume({previewOnly:true,reportId:'report',preview:{headline:'미리보기',signals:[]}})
  assert.match(h.nodes.get('umsh-verified-reading').style.cssText,/background:#110e0a;color:#f5ead7/)
  assert.doesNotMatch(h.nodes.get('umsh-verified-reading').innerHTML,/운명상회 홈/)
  h.api.consume({reportId:'report',report:{title:'풀이',sections:[]}})
  const reader=h.nodes.get('umsh-verified-reading').innerHTML
  assert.doesNotMatch(reader,/내 구매 내역/)
  assert.doesNotMatch(reader,/저장된 전체 해석/)
  assert.match(reader,/풀이/,'제목은 남아야 한다')
  // 로그인·오류 화면은 갈 곳이 필요하므로 링크를 유지한다.
  const gate=source.slice(source.indexOf('function gate(message)'),source.indexOf('function labelText'))
  assert.match(gate,/navigation\(\)/,'오류 화면에서 갈 곳이 사라졌다')
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
  assert.match(html,/href="\/cmdg\/\?entry=lifelong">평생운 확인/)
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

test('in-place 06 hides unfilled interpretation hosts on https', () => {
  const h = harness('/love/this-year/06-step-6_1-report-detail/index.html?reportId=live-id', [], {}, { inplace: true })
  assert.equal(h.api.allowDesignMockReading(), false)
  const guard = h.context.document.head.children.find((node: any) => node.tagName === 'STYLE')
  assert.match(guard.textContent, /#detail-stack/)
  assert.match(guard.textContent, /#interpretationBlocks/)
  assert.match(guard.textContent, /\[data-umsh-filled\]/)
  const node = h.context.document.createElement('div')
  h.api.markFilled(node)
  assert.equal(node.getAttribute('data-umsh-filled'), '')
})

/**
 * PDF 는 인쇄 대화상자의 "PDF로 저장"으로 받는다. 14개 상세 화면 가운데 버튼이 붙어 있던
 * 것은 저축·퇴사 두 곳뿐이었고, 냥궁합·올해연애는 로드되지 않는 `UMSHReportPdf` 를 부르고
 * 나머지 10곳에는 버튼이 아예 없었다. 본문을 그린 뒤 공용 지점에서 한 번 넣는다.
 */
test('detail pages get a print stylesheet and a PDF button once the saved report is rendered', () => {
  const h = harness('/work/move/06-step-6_1-report-detail/index.html?reportId=live-id', [])
  h.api.consume({
    reportId: 'live-id',
    serviceKey: 'work_move',
    report: { serviceKey: 'work_move', title: '이직운', subtitle: '', sections: [{ id: 'work-move-decision', status: 'complete', interpretation: '본문입니다.' }] },
  }, {})

  const printCss = h.context.document.head.children.find((node: any) => node.id === 'umsh-report-print-css')
  assert.ok(printCss, 'PDF 인쇄 규칙이 없으면 상단바·버튼까지 종이에 찍힌다')
  // 캐시된 옛 규칙이 남으면 PDF 가 화면 배색으로 찍힌다. 버전 없는 주소로 되돌아가지 않게 고정한다.
  assert.match(printCss.href, /^\/css\/umsh-report-print\.css\?v=/)

  const dock = h.context.document.body.children.find((node: any) => node.getAttribute?.('data-umsh-pdf-auto') === '')
  assert.ok(dock, '상세 화면에는 PDF 버튼이 있어야 한다')
  assert.equal(dock.children[0].getAttribute('data-umsh-pdf'), '')
  assert.equal(dock.children[0].textContent, 'PDF 저장')
})

/** 06-1 화면이 없는 서비스는 보관함에서 이 주소로 열린다. 여기에도 PDF 가 있어야 한다. */
test('the shared permalink reader also gets a PDF button', () => {
  const h = harness('/r/967d0551', [])
  h.api.consume({
    reportId: '967d0551',
    serviceKey: 'love_mind',
    report: { serviceKey: 'love_mind', title: '속마음', subtitle: '', sections: [{ id: 'love-mind-1', status: 'complete', interpretation: '본문입니다.' }] },
  }, {})
  const dock = h.context.document.body.children.find((node: any) => node.getAttribute?.('data-umsh-pdf-auto') === '')
  assert.ok(dock, '고유 주소 리더에도 PDF 버튼이 있어야 한다')
})

test('the teaser step never offers a PDF of a report the reader has not unlocked', () => {
  const h = harness('/work/move/04-step-4-report/index.html?reportId=live-id', [])
  h.api.consume({ previewOnly: true, serviceKey: 'work_move', reportId: 'live-id', preview: { summary: '미리보기' } })
  assert.equal(h.context.document.body.children.some((node: any) => node.getAttribute?.('data-umsh-pdf-auto') === ''), false)
})

test('every 06 detail page loads the shared report access script that installs the PDF path', () => {
  const pages = readdirSync(new URL('../../사주', import.meta.url), { recursive: true, encoding: 'utf8' })
    .filter((entry) => /06-step-6_1-report-detail[\\/]index\.html$/.test(entry))
  assert.ok(pages.length >= 14, `상세 화면을 ${pages.length}개만 찾았습니다`)
  for (const page of pages) {
    const html = readFileSync(new URL(`../../사주/${page}`, import.meta.url), 'utf8')
    assert.match(html, /<script src="\/js\/umsh-report-access\.js/, `${page} 에 공용 리포트 스크립트가 없어 PDF 경로가 생기지 않습니다`)
  }
})

/**
 * 2026-09-18: 직장 선택 리포트의 '대운·유년상 변동기' 한 칸이 검수에 막혀 failed 로 굳었다.
 * 그 칸을 막던 검수 규칙을 고쳐 배포한 뒤에도 아무도 다시 돌리지 않아 한 시간 반을 그대로
 * 남아 있었고, 고객 화면에는 "미완성"이 계속 보였다. 한 번 다시 세우자 곧바로 통과했다.
 * 읽는 사람이 화면을 여는 순간이 가장 확실한 재시작 신호다.
 */
test('failed sections are restarted when the reader opens the report', async () => {
  const h = harness('/work/job-choice/06-step-6_1-report-detail/index.html?reportId=job-uuid', [], {}, { inplace: true })
  h.api.setOwner('owner-a')
  await h.api.fetch('/api/report/job-uuid', { headers: { Authorization: 'Bearer test' } })
  h.calls.length = 0
  h.api.consume({
    reportId: 'job-uuid',
    report: { serviceKey: 'job_choice', status: 'failed', sections: [
      { id: 'done', status: 'complete', interpretation: '완료된 본문', hook: '답' },
      { id: 'stuck', status: 'failed', interpretation: '', hook: '' },
    ] },
  }, { Authorization: 'Bearer test' })
  const retries = h.calls.filter((call) => call.path === '/api/report/section').map((call) => JSON.parse(call.options.body))
  assert.deepEqual(retries, [{ reportId: 'job-uuid', sectionId: 'stuck', retry: true }], `실패 칸을 다시 세우지 않았다: ${JSON.stringify(retries)}`)
})

test('the same failed section is not resent twice in one page view', async () => {
  const h = harness('/work/job-choice/06-step-6_1-report-detail/index.html?reportId=job-uuid', [], {}, { inplace: true })
  h.api.setOwner('owner-a')
  await h.api.fetch('/api/report/job-uuid', { headers: { Authorization: 'Bearer test' } })
  const payload = {
    reportId: 'job-uuid',
    report: { serviceKey: 'job_choice', status: 'failed', sections: [{ id: 'stuck', status: 'failed', interpretation: '', hook: '' }] },
  }
  h.api.consume(payload, { Authorization: 'Bearer test' })
  const first = h.calls.filter((call) => call.path === '/api/report/section').length
  h.api.consume(payload, { Authorization: 'Bearer test' })
  const second = h.calls.filter((call) => call.path === '/api/report/section').length
  assert.equal(first, 1)
  assert.equal(second, 1, '같은 화면에서 같은 칸을 두 번 보냈다')
})

test('at most two failed sections are restarted at once', async () => {
  const h = harness('/work/job-choice/06-step-6_1-report-detail/index.html?reportId=job-uuid', [], {}, { inplace: true })
  h.api.setOwner('owner-a')
  await h.api.fetch('/api/report/job-uuid', { headers: { Authorization: 'Bearer test' } })
  h.calls.length = 0
  h.api.consume({
    reportId: 'job-uuid',
    report: { serviceKey: 'job_choice', status: 'failed', sections: ['a', 'b', 'c', 'd'].map((id) => ({ id, status: 'failed', interpretation: '', hook: '' })) },
  }, { Authorization: 'Bearer test' })
  assert.equal(h.calls.filter((call) => call.path === '/api/report/section').length, 2)
})

/**
 * 대표 이미지 한 장 계약이 없는 서비스는 저장된 항목 그림을 본문과 함께 유지한다.
 * 여덟 서비스의 반복 이미지는 별도 계약에서 막고, 이 회귀는 나머지 서비스의 저장 자산
 * 렌더링이 사라지지 않는지 확인한다.
 */
test('대표 이미지 한 장 계약 밖의 항목 그림은 해석과 함께 그려지고 대체 텍스트를 가진다', () => {
  const h = harness('/love/mind/06-step-6_1-report-detail/index.html?reportId=mind-uuid', [], {}, { inplace: true })
  const host = h.context.document.createElement('section')
  host.id = 'detail-stack'
  h.context.document.body.appendChild(host)
  h.api.setOwner('owner-a')
  h.api.consume({
    reportId: 'mind-uuid',
    report: { serviceKey: 'love_mind', status: 'complete', sections: [{
      id: 'flow-1', status: 'complete',
      imageSrc: '/assets/love-ty-char-phone-v2.webp',
      imageAlt: '다음 연락을 고르는 장면',
      hook: '지금은 보류예요.',
      interpretation: '첫 문단이에요.\n\n둘째 문단이에요.',
    }] },
  }, { Authorization: 'Bearer test' })
  const html = String(host.innerHTML || '')
  assert.match(html, /love-ty-char-phone-v2\.webp/, '항목 그림이 그려지지 않았다')
  assert.match(html, /alt="다음 연락을 고르는 장면"/, '대체 텍스트가 빠졌다')
  // 그림이 본문보다 먼저 와야 장면을 보고 글을 읽는다.
  assert.ok(html.indexOf('love-ty-char-phone-v2.webp') < html.indexOf('첫 문단이에요'), '그림이 본문 뒤로 밀렸다')
})

test('그림이 없는 항목은 빈 자리를 만들지 않는다', () => {
  const h = harness('/work/quit/06-step-6_1-report-detail/index.html?reportId=quit-uuid', [], {}, { inplace: true })
  const host = h.context.document.createElement('section')
  host.id = 'detail-stack'
  h.context.document.body.appendChild(host)
  h.api.setOwner('owner-a')
  h.api.consume({
    reportId: 'quit-uuid',
    report: { serviceKey: 'quit_fortune', status: 'complete', sections: [{ id: 'flow-1', status: 'complete', imageSrc: '', hook: '답이에요.', interpretation: '본문이에요.' }] },
  }, { Authorization: 'Bearer test' })
  const html = String(host.innerHTML || '')
  assert.ok(!html.includes('story-image'), '그림이 없는데 빈 figure 를 만들었다')
})
