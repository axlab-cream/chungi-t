import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

const page=readFileSync(new URL('../../사주/today/free/index.html',import.meta.url),'utf8')
const stylesheet=page.match(/<style>([\s\S]*?)<\/style>/)![1]
const pageScript=page.match(/<script>\s*(const state[\s\S]*?)<\/script>/)![1]

function cssRule(selector:string) {
  const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
  return stylesheet.match(new RegExp(escaped+'\\s*\\{([^}]*)\\}'))?.[1] || ''
}

test('today landing lets the whole story grow beyond the viewport without clipping',()=>{
  assert.match(page,/<main class="stage" data-today-landing>/)
  const stage=cssRule('.stage')
  assert.match(stage,/overflow:\s*visible;/)
  assert.doesNotMatch(stage,/(?:^|\n)\s*(?:overflow:\s*hidden|height:\s*(?:100vh|100dvh);)/)
  const scroller=cssRule('body.umsh-has-chrome main.stage[data-today-landing] > .scroll')
  assert.match(scroller,/height:\s*auto\s*!important;/)
  assert.match(scroller,/min-height:\s*0;/)
  assert.match(scroller,/overflow:\s*visible;/)
  assert.doesNotMatch(page,/touch-action:\s*none|addEventListener\(['"](?:wheel|touchmove)/)
})

test('today landing reserves the live bottom-menu height and pins its GNB host',()=>{
  const scroller=cssRule('body.umsh-has-chrome main.stage[data-today-landing] > .scroll')
  assert.match(scroller,/padding-bottom:\s*calc\(var\(--umsh-chrome-bottom-h,\s*74px\)\s*\+\s*env\(safe-area-inset-bottom,\s*0px\)\s*\+\s*32px\)\s*!important;/)
  const top=cssRule('main.stage[data-today-landing] > [data-umsh-service-top]')
  assert.match(top,/position:\s*sticky;/)
  assert.match(top,/top:\s*0;/)
  assert.match(top,/z-index:\s*60;/)
  assert.match(page,/<script src="\/js\/umsh-chrome\.js(?:\?v=[^"]+)?"(?: defer)?><\/script>/)
  assert.match(page,/<script src="\/js\/umsh-report-access\.js(?:\?v=[^"]+)?"(?: defer)?><\/script>/)
  assert.doesNotMatch(stylesheet,/#umsh-verified-layout|#umsh-verified-reading/)
})

test('a saved daily URL renders the story without any request',()=>{
  for(const path of ['/today/free?reportId=saved-daily','/today/free?start=1&reportId=saved-daily','/today/free?intro=1']) {
    const location=new URL(path,'https://umsh.kr')
    const calls:string[]=[]
    const context:any={location,URL,URLSearchParams,setTimeout,clearTimeout,document:{
      addEventListener(){},
      querySelector(){return {classList:{remove(){}}}},
    },fetch:()=>{throw new Error('No new authentication or generation request expected')}}
    context.window=context
    context.UMSHServiceDetail={render:()=>calls.push('render-story')}
    context.UMSHServiceSteps={markStory:()=>calls.push('mark-story')}
    context.UMSHReportAccess={fetch:()=>{throw new Error('Saved daily IDs must use the existing reader')}}
    runInNewContext(pageScript,context)
    assert.deepEqual(calls,['render-story','mark-story'])
    assert.equal(location.href,new URL(path,'https://umsh.kr').href)
  }
})

/**
 * 2026-09-18: 이미 로그인한 사람에게 이 소개 화면은 "로그인 후 오늘운 확인하기"를 한 번 더
 * 누르게 하는 관문일 뿐이었다. 매일 들어오는 무료 입구라 그 한 번이 크다. 세션이 있으면
 * 건너뛰고 바로 부르고, 없으면 예전처럼 소개를 보여준다.
 */
function bootTodayWith(session:{access_token:string}|null,path='/today/free') {
  const location=new URL(path,'https://umsh.kr')
  const calls:string[]=[]
  const requests:string[]=[]
  const context:any={location,URL,URLSearchParams,setTimeout,clearTimeout,document:{
    addEventListener(){},
    // 로그인 흐름이 끝나면 본문이 그려진다. 그 자리는 있다고 답한다.
    querySelector(selector:string){calls.push(`query:${selector}`);return {classList:{remove(){}},appendChild(){}}},
    createElement(){return {dataset:{},setAttribute(){},style:{}}},
  },fetch:async(url:string)=>{requests.push(String(url));return {json:async()=>({enabled:true,url:'https://x.supabase.co',publishableKey:'pk'})}}}
  context.window=context
  context.UMSHServiceDetail={render:()=>calls.push('render-story')}
  context.UMSHServiceSteps={markStory:()=>calls.push('mark-story'),markAuth:()=>calls.push('mark-auth')}
  context.UMSHLoading={show:()=>calls.push('loading-show'),hide:()=>calls.push('loading-hide')}
  context.supabase={}
  context.UMSHAuthSession={
    createClient:()=>({auth:{onAuthStateChange(){},getSession:async()=>({data:{session}})}}),
    enforceDeviceAuthSession:async(current:unknown)=>current,
  }
  context.UMSHReportAccess={
    setOwner(){},
    fetch:async(url:string)=>{requests.push(`POST ${url}`);return {ok:true,status:200,json:async()=>({todayFortune:{}})}},
  }
  runInNewContext(pageScript,context)
  return {calls,requests,location}
}

test('로그인 상태면 소개를 건너뛰고 바로 오늘운을 부른다',async()=>{
  const {calls,requests}=bootTodayWith({access_token:'live-token'})
  await new Promise((resolve)=>setTimeout(resolve,50))
  assert.ok(requests.includes('POST /api/today/fortune'),`오늘운을 부르지 않았다: ${requests.join(', ')}`)
  assert.ok(!calls.includes('render-story'),'로그인 상태인데 소개 화면을 그렸다')
  assert.ok(calls.includes('loading-hide'),'로딩을 닫지 않았다')
})

test('로그인 전이면 소개 화면을 보여주고 오늘운을 부르지 않는다',async()=>{
  const {calls,requests}=bootTodayWith(null)
  await new Promise((resolve)=>setTimeout(resolve,50))
  assert.ok(calls.includes('render-story'),'소개 화면을 그리지 않았다')
  assert.ok(calls.includes('mark-story'))
  assert.ok(!requests.some((item)=>item.startsWith('POST')),`로그인 전에 생성을 불렀다: ${requests.join(', ')}`)
  assert.ok(calls.includes('loading-hide'))
})
