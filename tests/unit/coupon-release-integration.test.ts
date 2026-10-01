import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

test('consultation purchases do not crowd readings or grant reading depth; coupon rights survive in vault and recovery', () => {
  const child=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',`
    import assert from 'node:assert/strict';
    const orders=await import('./src/payment/order-store.ts');
    const {selectPurchasedReadings}=await import('./src/report/vault-list.ts');
    const {selectBackfillReports}=await import('./src/report/report-completion-job.ts');
    const base={ownerId:'release-owner',buyerEmail:'qa@example.invalid',buyerTel:'01000000000',productKey:'cheonmyeong_consultation',productTitle:'질문권',amount:4900,status:'paid',createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z'};
    for(let i=0;i<110;i++) await orders.savePaymentOrder({...base,orderId:'question-'+i});
    assert.equal(await orders.hasSettledPaymentOrder(base.ownerId),false);
    await orders.savePaymentOrder({...base,orderId:'old-reading',productKey:'cmdg',reportId:'paid-reading',createdAt:'2026-09-01T00:00:00Z',updatedAt:'2026-09-01T00:00:00Z'});
    assert.equal(await orders.hasSettledPaymentOrder(base.ownerId),true);
    await new Promise(resolve=>setTimeout(resolve,5));
    for(let i=0;i<110;i++) await orders.savePaymentOrder({...base,orderId:'question-'+i});
    assert.equal((await orders.listPaymentOrders(base.ownerId,100)).some(o=>o.orderId==='old-reading'),false);
    assert.deepEqual((await orders.listPaymentOrders(base.ownerId,100,undefined,true)).map(o=>o.orderId),['old-reading']);
    const report={reportId:'coupon-reading',lineageId:'lineage',owner:{id:base.ownerId},birth:{year:1990,month:1,day:1,calendar:'solar'},context:{serviceKey:'cmdg'},report:{sections:[]},createdAt:base.createdAt,updatedAt:base.updatedAt};
    const coupon={id:'coupon',ownerId:base.ownerId,kind:'service_free',productKey:'cmdg',reportId:report.reportId,claimedAt:base.createdAt,enabled:false,expiresAt:'2020-01-01T00:00:00Z'};
    assert.equal(selectPurchasedReadings([report],[],[coupon]).length,1);
    for(const bad of [{ownerId:'other'},{productKey:'work_job'},{reportId:'other'}]) assert.equal(selectPurchasedReadings([report],[],[{...coupon,...bad}]).length,0);
    const ref={reportId:report.reportId,ownerId:base.ownerId,serviceKey:'cmdg',updatedAt:base.updatedAt};
    assert.equal(selectBackfillReports([ref],new Set(),[coupon])[0].paid,true);
    assert.equal(selectBackfillReports([ref],new Set(),[{...coupon,ownerId:'other'}])[0].paid,false);
  `],{cwd:fileURLToPath(new URL('../..',import.meta.url)),env:{...process.env,NODE_ENV:'test',DATABASE_URL:'',SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_URL:'',VITE_SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:''},encoding:'utf8',timeout:15000})
  assert.equal(child.status,0,child.stderr||child.stdout)
})
