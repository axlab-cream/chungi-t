import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

const read = (path:string) => readFileSync(new URL('../../'+path, import.meta.url), 'utf8')
const source = read('사주/js/newyear-service.js')
const pages = ['01-step-1-story/index.html','02-step-2-saju-input/index.html','04-step-4-report/index.html','05-step-5-chat/index.html','05-step-5-chat/chat.html','06-step-6_1-report-detail/index.html']

test('newyear keeps the marketing shell and loads the shared access guard before page content', () => {
  for (const page of pages) {
    const html = read('사주/flow/newyear/'+page)
    assert.match(html, /data-umsh-chrome/)
    assert.match(html, /내 2027년, 풀릴 각이야\?/)
    assert.ok(html.indexOf('/js/umsh-report-access.js') < html.indexOf('<body>'))
    assert.match(html, /\/js\/newyear-service\.js/)
  }
  assert.match(read('사주/flow/newyear/'+pages[0]), /newyear-01-scene-01-hook\.webp/)
})

test('newyear output pages contain no sample interpretation or lossy redirect', () => {
  for (const page of pages.slice(2)) {
    const html = read('사주/flow/newyear/'+page)
    assert.match(html, /저장된 해석과 열람 권한을 확인하고 있습니다/)
    assert.doesNotMatch(html, /http-equiv="refresh"|assets\/app\.js|data-detail-bars|data-detail-cards/)
    assert.doesNotMatch(html, /새해 초반은 계획을 넓히기보다|올해 당신의 흐름에는|감정 구간/)
  }
  assert.doesNotMatch(source, /sessionStorage|localStorage|renderTeaser|renderIndex|renderDetail/)
})

test('newyear form clearly uses the saved profile and exposes no ignored editable options', () => {
  const html = read('사주/flow/newyear/02-step-2-saju-input/index.html')
  assert.match(html, /data-newyear-profile-note/)
  assert.match(html, /사주 등록·수정/)
  for (const name of ['birth-date','birth-time','calendar','target-year']) {
    assert.match(html, new RegExp('<input[^>]+name="'+name+'"[^>]+readonly'))
  }
  assert.match(html, /name="target-year"[^>]+value="2027"/)
  assert.doesNotMatch(html, /2028|2029|name="birth-place"|name="focus-one"|name="focus-two"/)
})

function harness(options: {signedIn?:boolean; payload?:unknown; path?:string} = {}) {
  const calls:Array<{path:string;options:any;shared:boolean}> = []
  const assigned:string[] = []
  const fields:Record<string,any> = Object.fromEntries(['display-name','birth-date','birth-time','calendar'].map(name=>[name,{value:''}]))
  const note = {textContent:''}
  const edit = {href:''}
  const button = {disabled:false,setAttribute(){},removeAttribute(){}}
  let status:any
  let submit:((event:any)=>Promise<void>) | undefined
  let authChange:((event:string,session:any)=>void) | undefined
  const form = {
    parentNode:{insertBefore(node:any){status=node}},
    addEventListener(event:string,handler:any){if(event==='submit')submit=handler},
    querySelector(selector:string) {
      if(selector==='[data-newyear-profile-note]')return note
      if(selector==='[data-newyear-edit-profile]')return edit
      if(selector==='button[type="submit"]')return button
      return fields[selector.match(/name="([^"]+)"/)?.[1] || ''] || null
    },
  }
  const root={querySelector(){return form}}
  const location = new URL(options.path || '/flow/newyear/02-step-2-saju-input/index.html', 'https://umsh.kr') as URL & {assign:(path:string)=>void}
  location.assign=(path:string)=>{assigned.push(path)}
  const session=options.signedIn===false?null:{user:{id:'synthetic-owner'},access_token:'synthetic-token'}
  let owner=''
  let epoch=0
  const context:any = {
    URL,URLSearchParams,Response,console,location,
    document:{readyState:'complete',
      querySelector(selector:string){if(selector==='#step-2-saju-input')return location.pathname.includes('02-step')?root:null;if(selector==='[data-newyear-profile-note]')return note;if(selector==='[name="display-name"]')return fields['display-name'];return null},
      querySelectorAll(){return Object.entries(fields).filter(([name])=>name!=='display-name').map(([,field])=>field)},
      createElement(){return {textContent:'',style:{cssText:''},setAttribute(){}}},
    },
    fetch:async(path:string,init:any)=>{calls.push({path,options:init,shared:false});return new Response(JSON.stringify(path==='/api/auth/config'?{enabled:true,url:'https://auth.example',publishableKey:'public-test-key'}:{profile:{name:'합성 사용자',birthTimeKnown:false,birth:{year:2000,month:1,day:2,hour:0,calendar:'solar'}}}))},
    supabase:{},
    UMSHAuthSession:{createClient(){return {auth:{getSession:async()=>({data:{session}}),onAuthStateChange(callback:any){authChange=callback}}}},enforceDeviceAuthSession:async(value:any)=>value},
    UMSHReportAccess:{
      setOwner(next:string){if(next!==owner)epoch++;owner=next},ownerEpoch(){return epoch},identity(payload:any){return payload.resultId || payload.reportId || ''},
      fetch:async(path:string,init:any)=>{calls.push({path,options:init,shared:true});return new Response(JSON.stringify(options.payload || {previewOnly:true,serviceKey:'newyear_flow',resultId:'saved-newyear-uuid',preview:{headline:'2027년 흐름'}}))},
    },
  }
  context.window=context
  runInNewContext(source,context)
  return {calls,assigned,fields,note,edit,button,get status(){return status},context,
    submit:()=>submit!({preventDefault(){},stopImmediatePropagation(){}}),
    switchOwner:()=>authChange!('SIGNED_OUT',null),
  }
}

const settle = () => new Promise<void>(resolve=>setImmediate(resolve))

test('newyear input shows the authenticated saved profile without writing or guessing birth time', async () => {
  const h=harness()
  await settle()
  assert.deepEqual(h.calls.map(call=>call.path), ['/api/auth/config','/api/user/profile'])
  assert.equal(h.fields['birth-date'].value, '2000년 1월 2일')
  assert.equal(h.fields['birth-time'].value, '시간 모름')
  assert.equal(h.fields.calendar.value, '양력')
  assert.equal(h.fields['display-name'].value, '합성 사용자')
  assert.match(h.edit.href, /^\/profile\?returnTo=/)
  assert.ok(h.calls.every(call=>!call.options.method || call.options.method==='GET'))
  h.switchOwner()
  assert.equal(h.fields['birth-date'].value, '')
  assert.equal(h.fields['display-name'].value, '')
})

test('newyear submit creates a preview through shared access and navigates only with the saved UUID', async () => {
  const h=harness({path:'/flow/newyear/02-step-2-saju-input/index.html?orderId=existing-order'})
  await settle()
  h.fields['display-name'].value='새 호칭'
  await h.submit()
  const call=h.calls.find(call=>call.shared)!
  assert.equal(call.path, '/api/flow/newyear/analyze')
  assert.equal(call.options.headers.Authorization, 'Bearer synthetic-token')
  assert.deepEqual(JSON.parse(call.options.body), {displayName:'새 호칭',orderId:'existing-order'})
  const url=new URL(h.assigned[0], 'https://umsh.kr')
  assert.equal(url.pathname, '/flow/newyear/04-step-4-report/index.html')
  assert.equal(url.searchParams.get('reportId'), 'saved-newyear-uuid')
  assert.equal(url.searchParams.get('orderId'), 'existing-order')
  assert.equal(url.searchParams.has('displayName'), false)
  assert.equal(h.button.disabled, false)
})

test('newyear signed-out submission redirects to login without an analysis request', async () => {
  const h=harness({signedIn:false})
  await settle()
  await h.submit()
  assert.equal(h.calls.some(call=>call.shared), false)
  assert.match(h.assigned[0], /^\/signup\?entry=newyear&returnTo=/)
})

test('newyear refuses a successful response without a saved identity', async () => {
  const h=harness({payload:{previewOnly:true,preview:{headline:'missing identity'}}})
  await settle()
  await h.submit()
  assert.equal(h.assigned.length, 0)
  assert.match(h.status.textContent, /저장된 해석 주소를 받지 못했습니다/)
})

test('newyear output bridge never generates or fetches independently of the shared reader', () => {
  for(const path of pages.slice(2)) {
    const h=harness({path:'/flow/newyear/'+path+'?reportId=existing'})
    assert.equal(h.calls.length, 0)
    assert.equal(h.assigned.length, 0)
  }
})
