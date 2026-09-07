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
  assert.match(page,/<script src="\/js\/umsh-chrome.js"><\/script>/)
  assert.match(page,/<script src="\/js\/umsh-report-access.js"><\/script>/)
  assert.doesNotMatch(stylesheet,/#umsh-verified-layout|#umsh-verified-reading/)
})

test('opening the story or a saved daily URL does not initiate a new fortune request',()=>{
  for(const path of ['/today/free#step-1-story','/today/free?reportId=saved-daily','/today/free?start=1&reportId=saved-daily']) {
    const location=new URL(path,'https://umsh.kr')
    const calls:string[]=[]
    const context:any={location,URL,URLSearchParams,document:{
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
