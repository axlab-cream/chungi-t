import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {test} from 'node:test'
const source=readFileSync(new URL('../../src/server/app.ts',import.meta.url),'utf8')
for(const route of ['/love/this-year','/love/signal','/work/quit','/work/job-choice','/match/marry','/money/save','/match/couple','/match/cat','/me/lucky','/day/wedding','/work/move','/me/pass-angle']){
 test(`광고 랜딩 ${route} 리다이렉트가 유입 정보와 기존 결제 복귀를 보존한다`,()=>{
  const start=source.indexOf(`app.get(['${route}',`)
  assert.ok(start>=0)
  const block=source.slice(start,source.indexOf('\n})',start))
  const body=block.slice(block.indexOf('=> {')+4)
  let target=''
  const run=runInNewContext('(function(req,res){'+body+'})',{URLSearchParams})
  run({query:{utm_source:'google',utm_medium:'cpc',gclid:'test-click',__umsh_path:'internal',returnTo:'https://evil.example',paid:'1',orderId:'order-test',reportId:'report-test'}},{redirect:(_status:number,url:string)=>{target=url}})
  const url=new URL(target,'https://umsh.kr')
  assert.equal(url.searchParams.get('utm_source'),'google')
  assert.equal(url.searchParams.get('utm_medium'),'cpc')
  assert.equal(url.searchParams.get('gclid'),'test-click')
  assert.ok(!target.includes('internal')&&!target.includes('evil.example'))
  if(route!=='/work/move'&&route!=='/me/pass-angle'){
   assert.equal(url.searchParams.get('orderId'),'order-test')
   assert.equal(url.searchParams.get('reportId'),'report-test')
   assert.ok(url.pathname.includes('04-step-4-report'))
  }
 })
}

test('신년운세 리다이렉트도 광고값과 preview 복귀를 보존한다', () => {
  const start=source.indexOf('function newYearFlowUrl(')
  const body=source.slice(source.indexOf('{',start)+1,source.indexOf('\n}',start))
  const run=runInNewContext('(function(req,page){'+body+'})',{URLSearchParams})
  const url=new URL(run({query:{utm_source:'google',utm_medium:'cpc',gclid:'test',preview:'1',reportId:'saved',returnTo:'https://evil.example',__umsh_path:'internal'}},'04-step-4-report/index.html'),'https://umsh.kr')
  assert.equal(url.searchParams.get('utm_source'),'google')
  assert.equal(url.searchParams.get('gclid'),'test')
  assert.equal(url.searchParams.get('preview'),'1')
  assert.equal(url.searchParams.get('reportId'),'saved')
  assert.equal(url.searchParams.has('returnTo'),false)
  assert.equal(url.searchParams.has('__umsh_path'),false)
})
