import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
const source = readFileSync(new URL('../../사주/js/coupons.js', import.meta.url), 'utf8')
class Element {
  children: Element[] = []; value = ''; textContent = ''; disabled = false; hidden = false; href = ''; dataset: any = {}; className = ''; handlers: any = {}
  append(...nodes: Element[]) { this.children.push(...nodes) }
  replaceChildren(...nodes: Element[]) { this.children = nodes }
  addEventListener(event: string, handler: Function) { this.handlers[event] = handler }
  emit(event: string) { return this.handlers[event]?.({ preventDefault() {} }) }
}
const tick = () => new Promise(resolve => setImmediate(resolve))
function harness(options: {guest?: boolean; items?: any[]; claim?: Function; list?: Function} = {}) {
  const nodes = Object.fromEntries(['coupons-app','coupon-form','coupon-code','coupon-submit','coupon-list','coupon-state','coupon-message','coupon-login','coupon-refresh'].map(x => [x, new Element()]))
  const calls: any[] = []; let change: Function = () => {}
  const client = {auth: {onAuthStateChange(fn: Function) {change = fn}}}
  const ctx: any = {document: {getElementById: (id: string) => nodes[id], createElement: () => new Element()},
    fetch: async (url: string, init: any) => { calls.push({url, init}); if(url === '/api/auth/config') return {ok:true,json:async()=>({enabled:true})}; if(url.endsWith('/claim') && options.claim) return options.claim(); if(url === '/api/coupons' && options.list) return options.list(); return {ok:true,json:async()=>({items:options.items || [],products:[{key:'cmdg',title:'천명사주',returnPath:'/cmdg/'}]})} },
    UMSHAuthSession:{resolveLiveSession:async()=>({session:options.guest ? null : {access_token:'synthetic',user:{id:'synthetic-owner'}},client})},supabase:{}}
  ctx.window=ctx; runInNewContext(source,ctx)
  return {nodes,calls,signout:()=>change('SIGNED_OUT'),switchOwner:()=>change('SIGNED_IN',{user:{id:'another'}})}
}
test('guest cannot claim and sees explicit login; no wallet request',async()=>{
  const h=harness({guest:true});await tick();assert.equal(h.nodes['coupon-submit'].disabled,true);assert.equal(h.nodes['coupon-login'].hidden,false);assert.equal(h.calls.some(x=>x.url==='/api/coupons'),false)
})
test('failed claim preserves code and never announces success',async()=>{
  const h=harness({claim:()=>({ok:false,status:503,json:async()=>({code:'COUPON_STORE_UNAVAILABLE'})})});await tick();h.nodes['coupon-code'].value='SYNTHETIC';await h.nodes['coupon-form'].emit('submit');assert.equal(h.nodes['coupon-code'].value,'SYNTHETIC');assert.doesNotMatch(h.nodes['coupon-message'].textContent,/등록되었/);assert.equal(h.nodes['coupon-submit'].disabled,false)
})
test('duplicate click blocked; owner switch clears input and rejects late claim',async()=>{
  let resolve:Function=()=>{};const h=harness({claim:()=>new Promise(r=>resolve=r)});await tick();h.nodes['coupon-code'].value='SYNTHETIC';const first=h.nodes['coupon-form'].emit('submit');await tick();await h.nodes['coupon-form'].emit('submit');assert.equal(h.calls.filter(x=>x.url.endsWith('/claim')).length,1);h.switchOwner();resolve({ok:true,json:async()=>({item:{}})});await first;assert.equal(h.nodes['coupon-code'].value,'');assert.equal(h.nodes['coupon-list'].children.length,0);assert.doesNotMatch(h.nodes['coupon-message'].textContent,/등록되었/);assert.equal(h.nodes['coupon-submit'].disabled,true)
})
test('wallet uses safe text and distinguishes used, reserved, disabled, expired and consultation remaining',async()=>{
  const base={id:'synthetic',title:'<img onerror=alert(1)>',kind:'service_free',productKey:'cmdg',value:1,enabled:true,expiresAt:'2099-01-01T00:00:00Z'};
  const h=harness({items:[base,{...base,reportId:'report',expiresAt:'2000-01-01'},{...base,kind:'amount_off',orderId:'order'},{...base,enabled:false},{...base,expiresAt:'2000-01-01'},{...base,kind:'consultation_questions',remaining:0}]});await tick();const cards=h.nodes['coupon-list'].children;assert.deepEqual(cards.map(c=>c.dataset.state),['usable','used','reserved','disabled','expired','used']);assert.equal(cards[0].children[0].children[0].textContent,base.title);assert.equal(cards[0].children.at(-1)?.href,'/cmdg/');assert.match(cards[1].children.at(-1)?.href || '',/\/r\/report/)
})
test('signout rejects an in-flight wallet list and clears stale coupons',async()=>{
  let resolve:Function=()=>{};const h=harness({list:()=>new Promise(r=>resolve=r)});await tick();h.signout();resolve({ok:true,json:async()=>({items:[{title:'private'}],products:[]})});await tick();assert.equal(h.nodes['coupon-list'].children.length,0);assert.equal(h.nodes['coupon-submit'].disabled,true)
})
test('primary MY page exposes the coupon wallet',()=>{
  const my=readFileSync(new URL('../../사주/my.html',import.meta.url),'utf8')
  assert.match(my,/href="\/coupons\.html"><span><b>내 쿠폰/)
})
test('reserved ready coupon resumes only its bound checkout',async()=>{
  const item={id:'wallet',title:'Reserved',kind:'amount_off',productKey:'cmdg',value:1000,enabled:true,expiresAt:'2099-01-01',orderId:'order',orderStatus:'ready',orderReportId:'owned-report'}
  const h=harness({items:[item]});await tick();
  const link=h.nodes['coupon-list'].children[0].children.at(-1)
  assert.ok(link)
  assert.match(link.href,/product=cmdg&couponId=wallet&reportId=owned-report/)
})
