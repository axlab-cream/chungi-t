import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'
class Element {
  children: Element[] = []
  attributes: Record<string, string> = {}
  handlers: Record<string, (event: unknown) => unknown> = {}
  style = {}; dataset = {}; type = ''; id = ''; required = false; readOnly = false; max = ''; value: unknown = ''; name = ''; textContent = ''; disabled = false
  constructor(public tag: string) {}
  append(...children: Element[]) { this.children.push(...children) }
  appendChild(child: Element) { this.append(child); return child }
  replaceChildren(...children: Element[]) { this.children = children }
  setAttribute(key: string, value: string) { this.attributes[key] = value }
  addEventListener(key: string, handler: (event: unknown) => unknown) { this.handlers[key] = handler }
  reportValidity() { return true }
  reset() {}
  get options() { return this.children }
  async emit(key: string) { await this.handlers[key]?.({ preventDefault() {} }) }
  get all(): Element[] { return this.children.flatMap(child => [child, ...child.all]) }
  get elements() {
    const controls = this.all.filter(child => ['input', 'textarea', 'select', 'button'].includes(child.tag)) as Element[] & Record<string, Element>
    for (const control of controls) if (control.name) controls[control.name] = control
    return controls
  }
  set innerHTML(html: string) {
    this.children = []
    for (const match of html.matchAll(/<(input|select|button|p)\b([^>]*)>/g)) {
      const child = new Element(match[1])
      for (const attribute of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) child.attributes[attribute[1]] = attribute[2] ?? ''
      child.name = child.attributes.name ?? ''; this.append(child)
    }
  }
  querySelector(selector: string): Element | undefined {
    const match = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/)
    return this.all.find(child => match ? match[1] in child.attributes && (match[2] === undefined || child.attributes[match[1]] === match[2]) : child.tag === selector)
  }
}

const html = readFileSync(new URL('../../admin-ui/index.html', import.meta.url), 'utf8')
const source = html.slice(html.indexOf('async function loadCouponManager(body)'), html.indexOf('async function loadConsultationManager(body)'))
async function harness(fail = false) {
  const calls: any[] = []; let seq = 0
  const ctx = vm.createContext({document:{createElement:(tag:string)=>new Element(tag)},crypto:{randomUUID:()=>`synthetic-${++seq}`},window:{confirm:()=>true},adminConfirm:async()=>true,adminToast:()=>{},adminPageAction:()=>null,memberTable:()=>new Element('div'),memberEmpty:(text:string)=>Object.assign(new Element('p'),{textContent:text}),memberChip:()=>new Element('span'),memberDay:()=>'',copyChip:()=>new Element('span'),navigator:{clipboard:{writeText:async()=>{}}},fetch:async(url:string,init:any)=>{
    calls.push({url,...init}); if(init.method==='GET')return {ok:true,json:async()=>({items:[],products:[{key:'cmdg',title:'천명사주'}]})}
    return {ok:!fail,status:fail?503:201,json:async()=>({item:{}})}
  }})
  vm.runInContext(source,ctx); const body = new Element('body');await ctx.loadCouponManager(body)
  const form=body.querySelector('form')!
  Object.assign(form.elements.title,{value:'Synthetic coupon'})
  Object.assign(form.elements.code,{value:'QA-ONLY'})
  Object.assign(form.elements.kind,{value:'service_free'})
  Object.assign(form.elements.productKey,{value:'cmdg'})
  Object.assign(form.elements.value,{value:'1'})
  Object.assign(form.elements.maxClaims,{value:'100'})
  Object.assign(form.elements.startsAt,{value:'2026-10-01T09:00'})
  Object.assign(form.elements.expiresAt,{value:'2026-11-01T09:00'})
  return {form,body,calls}
}
test('admin failed issue preserves input and idempotency key; request uses ISO dates and cookie',async()=>{
  const h=await harness(true);await h.form.emit('submit');await h.form.emit('submit');assert.equal(h.form.elements.title.value,'Synthetic coupon');assert.equal(h.calls[1].headers['Idempotency-Key'],h.calls[2].headers['Idempotency-Key']);assert.equal(h.calls[1].credentials,'same-origin');const data=JSON.parse(h.calls[1].body);assert.match(data.startsAt,/Z$/);assert.equal(data.value,1);assert.equal(h.form.elements.title.disabled,false)
})
test('admin rejects invalid dates, claim limits and consultation/percent bounds before POST',async()=>{
  const h=await harness();h.form.elements.expiresAt.value='invalid';await h.form.emit('submit');assert.equal(h.calls.length,1);h.form.elements.expiresAt.value='2026-11-01T09:00';h.form.elements.maxClaims.value='20001';await h.form.emit('submit');assert.equal(h.calls.length,1);h.form.elements.maxClaims.value='100';h.form.elements.kind.value='percent_off';h.form.elements.value.value='101';await h.form.emit('submit');assert.equal(h.calls.length,1)
})
test('editing failed issue rotates key while success refreshes campaign history',async()=>{
  const h=await harness(true);await h.form.emit('submit');await h.form.emit('input');await h.form.emit('submit');assert.notEqual(h.calls[1].headers['Idempotency-Key'],h.calls[2].headers['Idempotency-Key']);const ok=await harness();await ok.form.emit('submit');assert.equal(ok.calls.at(-1).method,'GET')
})
