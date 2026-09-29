import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { summarizeLoveSpeedRows } from '../../src/analytics/funnel-store.js'
const read = (p: string) => readFileSync(new URL('../../'+p,import.meta.url),'utf8')
const telemetry = read('사주/play/love-speed/telemetry.js')
const collector = read('사주/js/umsh-track.js')
function run(href: string, referrer = '', privacy = false) {
  const url = new URL(href), ga: any[] = [], requests: any[] = [], listeners: Record<string,Function[]> = {}
  const context: any = { URL, Blob, Date, Math, JSON, Number, location:{href,origin:url.origin,pathname:url.pathname}, navigator:{doNotTrack:privacy?'1':'0'}, localStorage:{getItem(){return null},setItem(){}}, crypto:{randomUUID(){return 'qa-session'}}, document:{referrer,readyState:'loading',addEventListener(name:string,fn:Function){(listeners[name] ||= []).push(fn)}},addEventListener(){},setTimeout(){return 1},clearTimeout(){},UMSHAnalytics:{},gtag(...args:any[]){ga.push(args)},fetch(_url:string,opts:any){requests.push(JSON.parse(opts.body));return Promise.resolve({ok:true})} }
  context.window=context
  runInNewContext(collector,context)
  runInNewContext(telemetry,context)
  listeners.DOMContentLoaded.forEach(fn=>fn())
  return {context,ga,requests}
}
test('love-speed source and events use only fixed codes, preserve one pageview, and deduplicate completion',async()=>{
  const {context,ga,requests}=run('https://umsh.kr/play/love-speed/?src=share&type=spark&name=PRIVATE','https://social.example/private?birth=PRIVATE')
  for(const action of ['start','complete','complete','share','copy','details','result_view','PRIVATE'])context.UMSHLoveSpeedTelemetry.track(action)
  await context.UMSHTrack.flush()
  const events=requests.flatMap(r=>r.events)
  assert.equal(events.filter((e:any)=>e.event==='step_view').length,1)
  assert.equal(events[0].serviceKey,'love_speed')
  assert.equal(events[0].target,'love_speed:source:share')
  assert.equal(events.filter((e:any)=>e.target==='love_speed:complete').length,1)
  assert.ok(ga.some(e=>e[1]==='love_speed_result_view'))
  assert.ok(!JSON.stringify({ga,requests}).includes('PRIVATE'))
  assert.ok(!JSON.stringify({ga,requests}).includes('spark'))
  assert.ok(!JSON.stringify({ga,requests}).includes('social.example'))
})
test('source classification honors explicit home and search while refusing arbitrary source names',()=>{
  assert.equal(run('https://umsh.kr/play/love-speed/?src=home').context.UMSHLoveSpeedSource,'home')
  assert.equal(run('https://umsh.kr/play/love-speed/?src=PRIVATE','https://www.google.com/search?q=PRIVATE').context.UMSHLoveSpeedSource,'search')
  assert.equal(run('https://umsh.kr/play/love-speed/','https://umsh.kr/').context.UMSHLoveSpeedSource,'home')
})
test('DNT suppresses love-speed collection and preview never emits game telemetry',async()=>{
  const a=run('https://umsh.kr/play/love-speed/', '',true)
  a.context.UMSHLoveSpeedTelemetry.track('start');await a.context.UMSHTrack.flush()
  assert.equal(a.ga.length,0);assert.equal(a.requests.length,0)
  const b=run('https://umsh.kr/play/love-speed/preview.html')
  await b.context.UMSHTrack.flush();assert.equal(b.ga.length,0);assert.equal(b.requests.length,0)
})
test('admin love-speed summary deduplicates sessions and never returns visitor identifiers',()=>{
  const row=(event:string,target:string,service_key:string|null='love_speed')=>({event,target,service_key,step:'entry',session_id:'PRIVATE-session',user_id:'PRIVATE-user'})
  const result=summarizeLoveSpeedRows([row('step_view','love_speed:source:home'),row('step_view','love_speed:source:home'),row('cta_click','love_speed:start'),row('cta_click','love_speed:start'),row('cta_click','love_speed:home',null),row('cta_click','PRIVATE')])
  assert.equal(result.views,2);assert.equal(result.sessions,1);assert.equal(result.homeClicks,1)
  assert.equal(result.sources[0].sessions,1)
  assert.deepEqual(result.actions.find(a=>a.action==='start'),{action:'start',events:2,sessions:1})
  assert.ok(!JSON.stringify(result).includes('PRIVATE'))
})
test('SEO is readable without JS and the admin CTA and tracker are wired',()=>{
  const page=read('사주/play/love-speed/index.html'),app=read('사주/play/love-speed/app.js')
  assert.ok(page.includes('<h1>금사빠·금사식 무료 테스트</h1>'))
  assert.ok(read('사주/sitemap.xml').includes('<loc>https://umsh.kr/play/love-speed/</loc>'))
  const schema=JSON.parse(page.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1])
  assert.equal(schema.isAccessibleForFree,true)
  assert.ok(page.indexOf('telemetry.js')<page.indexOf('./app.js'))
  assert.ok(app.includes("track('complete')")); assert.ok(app.includes("on('love-details', () => track('details'))"))
  assert.ok(read('admin-ui/index.html').includes('appendLoveSpeed(payload.loveSpeed'))
  assert.ok(read('사주/portal.html').includes('data-track-target="love_speed:home"'))
})
