import { test } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { couponRouter, adminCouponRouter } from '../../src/coupons/router.js'
import { configureCouponStorageForTests, createMemoryCouponStorageForTests } from '../../src/coupons/store.js'
process.env.NODE_ENV = 'test'
test('admin issuance → own MY claim → report use is authenticated, idempotent and product-bound', async () => {
  configureCouponStorageForTests(createMemoryCouponStorageForTests())
  const queued: string[] = []
  const app = express(); app.use(express.json())
  const deps = {
    authenticate: async (req: express.Request,res:express.Response) => { const id=req.header('x-member'); if (!id) {res.sendStatus(401);return null} return {id} },
    staff: async (req:express.Request,res:express.Response,scope:string) => { if(req.header('x-scope')!==scope) {res.sendStatus(403);return null} return {email:'operator@example.invalid'} },
    resolveReport: async (owner:{id:string},id:string) => [ `${owner.id}-report`, `${owner.id}-public` ].includes(id) ? {productKey:'cmdg', reportId:`${owner.id}-report`} : null,
    queueReport: (id:string) => {queued.push(id)}, available: async () => true,
    couponUsage: async () => ({}),
  }
  app.use('/admin',adminCouponRouter(deps)); app.use('/coupons',couponRouter(deps))
  const server=app.listen(0,'127.0.0.1'); await new Promise<void>(r=>server.once('listening',r))
  const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`
  const call=(path:string,body?:object,headers:Record<string,string>={})=>fetch(base+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...headers},body:body?JSON.stringify(body):undefined})
  const campaign={code:'QA-ONLY1',title:'격리 검증',kind:'service_free',productKey:'cmdg',value:1,maxClaims:2,startsAt:'2020-01-01T00:00:00Z',expiresAt:'2099-01-01T00:00:00Z'}
  try {
    assert.equal((await call('/coupons')).status,401)
    assert.equal((await call('/admin',campaign,{'x-scope':'content:write'})).status,403)
    const issued=await call('/admin',campaign,{'x-scope':'content:publish','idempotency-key':'qa-issue-001'})
    assert.equal(issued.status,201)
    const {item:created}=await issued.json()
    const item=(await (await call('/coupons/claim',{code:'qa-only1'},{'x-member':'alice'})).json()).item
    assert.ok(item.id)
    assert.equal((await (await call('/coupons',undefined,{'x-member':'bob'})).json()).items.length,0)
    assert.equal((await call('/coupons/use',{couponId:item.id,reportId:'bob-report'},{'x-member':'bob'})).status,404)
    assert.equal((await call('/coupons/use',{couponId:item.id,reportId:'bob-report'},{'x-member':'alice'})).status,400)
    for (const reportId of ['alice-public','alice-report']) assert.equal((await call('/coupons/use',{couponId:item.id,reportId},{'x-member':'alice'})).status,200)
    assert.deepEqual(queued,['alice-report','alice-report'])
    const list=await call('/coupons',undefined,{'x-member':'alice'}); assert.equal(list.headers.get('cache-control'),'private, no-store')
    assert.equal((await list.json()).items[0].reportId,'alice-report')
    assert.equal((await call(`/admin/${created.id}/disable`,{}, {'x-scope':'content:publish'})).status,200)
    assert.equal((await call('/coupons/claim',{code:'QA-ONLY1'},{'x-member':'bob'})).status,409)
  } finally { await new Promise<void>(r=>server.close(()=>r())); configureCouponStorageForTests(null) }
})
