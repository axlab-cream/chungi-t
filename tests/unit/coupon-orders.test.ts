import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
test('coupon order insertion cannot reset a paid order or change its report, amount or owner', () => {
  const child=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',`
    import assert from 'node:assert/strict';
    const store=await import('./src/coupons/store.ts');
    const orders=await import('./src/payment/order-store.ts');
    await store.createCampaign({code:'ORDERTEST',title:'테스트',kind:'amount_off',productKey:'cmdg',value:1000,maxClaims:1,startsAt:'2020-01-01T00:00:00Z',expiresAt:'2099-01-01T00:00:00Z'},'qa@example.invalid','request-001');
    const coupon=await store.claimCoupon('owner','ORDERTEST');
    await store.reserveDiscount('owner',coupon.id,'cmdg',49900,'reserved-order');
    const order={orderId:'reserved-order',ownerId:'owner',buyerEmail:'qa@example.invalid',buyerTel:'010-0000-0000',productKey:'cmdg',productTitle:'천명사주',amount:48900,status:'ready',reportId:'report-one',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    await assert.rejects(orders.createCouponPaymentOrder({...order,amount:1}),/COUPON_ORDER_INVALID/);
    await assert.rejects(orders.createCouponPaymentOrder({...order,ownerId:'other'}),/COUPON_ORDER_INVALID/);
    await assert.rejects(orders.createCouponPaymentOrder({...order,orderId:'unreserved'}),/COUPON_ORDER_INVALID/);
    await Promise.all(Array.from({length:5},()=>orders.createCouponPaymentOrder(order)));
    await assert.rejects(orders.createCouponPaymentOrder({...order,reportId:'report-two'}),/COUPON_ORDER_CONFLICT/);
    await orders.updatePaymentOrder(order.orderId,{status:'paid',tid:'verified-fixture'});
    const replay=await orders.createCouponPaymentOrder(order);
    assert.equal(replay.status,'paid'); assert.equal(replay.tid,'verified-fixture'); assert.equal(replay.amount,48900);
    assert.equal((await orders.listPaymentOrders('owner')).length,1);
  `],{cwd:fileURLToPath(new URL('../..',import.meta.url)),env:{...process.env,NODE_ENV:'test',DATABASE_URL:'',SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_URL:'',VITE_SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:''},encoding:'utf8',timeout:15000})
  assert.equal(child.status,0,child.stderr||child.stdout)
})
