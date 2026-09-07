import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

const source = readFileSync(new URL('../../사주/js/umsh-report-access.js', import.meta.url), 'utf8')

function harness(path: string, responses: unknown[], cache: Record<string, unknown> = {}) {
  const calls: Array<{path: string; options: any}> = []
  const nodes = new Map<string, any>()
  const items = new Map(Object.entries(cache).map(([key,value])=>[key,JSON.stringify(value)]))
  const location = new URL(path, 'https://umsh.kr')
  const listeners = new Map<string, Array<() => unknown>>()
  const document = {
    readyState:'loading', addEventListener(name:string,callback:()=>unknown) {listeners.set(name,[...(listeners.get(name)||[]),callback])}, querySelectorAll(){return []},
    getElementById(id: string){return nodes.get(id)},
    createElement(){return {id:'',innerHTML:'',style:{cssText:''},querySelectorAll(){return []},insertAdjacentHTML(_where:string,text:string){this.innerHTML+=text}}},
    body:{appendChild(node:any){nodes.set(node.id,node)}},
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
  assert.match(html,/\/r\/daily-result/)
  assert.doesNotMatch(html,/99|전체 해석 열어보기/)
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
