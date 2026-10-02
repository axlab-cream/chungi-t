import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { it } from 'node:test'
import { fileURLToPath } from 'node:url'

function isolated(script: string, supabase = true) {
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    globalThis.fetch = async () => { throw new Error('Unexpected external request'); };
    ${script}
  `], {
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: '', SUPABASE_URL: supabase ? 'https://consultation-orders.invalid' : '', NEXT_PUBLIC_SUPABASE_URL: '', VITE_SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: supabase ? 'sb_secret_synthetic_test' : '' },
    encoding: 'utf8', timeout: 15000,
  })
  assert.equal(child.status, 0, child.stderr || child.stdout)
}
const fixture = {
  order_id: 'pack', owner_id: 'owner', buyer_email: '', buyer_tel: '', product_key: 'cheonmyeong_consultation', product_title: '질문 5회', amount: 4900, status: 'paid', tid: 'synthetic', created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
}

it('discovers every consultation pack past 100 while storage filters other members/products/statuses first', () => isolated(`
  const base = ${JSON.stringify(fixture)};
  const packs = Array.from({length: 205}, (_, i) => ({...base, order_id: 'pack-' + String(i).padStart(4, '0'), status: i % 2 ? 'viewed' : 'paid'}));
  const unrelated = Array.from({length: 150}, (_, i) => ({...base, order_id: 'newer-' + i, product_key: 'work_job', updated_at: '2026-10-02T00:00:00Z'}));
  const rows = [...packs, ...unrelated, {...base, order_id:'other-owner', owner_id:'other'}, {...base, order_id:'refund', status:'cancelled'}];
  const pages = [];
  globalThis.fetch = async input => {
    const url = new URL(input);
    assert.equal(url.origin, 'https://consultation-orders.invalid');
    assert.equal(url.searchParams.get('owner_id'), 'eq.owner');
    assert.equal(url.searchParams.get('product_key'), 'eq.cheonmyeong_consultation');
    assert.equal(url.searchParams.get('status'), 'in.(paid,viewed)');
    assert.equal(url.searchParams.get('order'), 'order_id.asc');
    assert.equal(url.searchParams.get('limit'), '100');
    const after = (url.searchParams.get('order_id') || '').replace(/^gt\./, '');
    pages.push(after);
    return Response.json(rows.filter(row => row.owner_id === 'owner' && row.product_key === base.product_key && ['paid','viewed'].includes(row.status) && row.order_id > after).sort((a,b) => a.order_id.localeCompare(b.order_id)).slice(0,100));
  };
  const { listConsultationPaymentOrders } = await import('./src/payment/order-store.ts');
  const result = await listConsultationPaymentOrders('owner');
  assert.equal(result.length, 205);
  assert.deepEqual(result.map(order => order.orderId), packs.map(row => row.order_id));
  assert.deepEqual(pages, ['', 'pack-0099', 'pack-0199']);
`))

it('does not return a partial balance when a later payment page fails', () => isolated(`
  const base = ${JSON.stringify(fixture)}; let call = 0;
  globalThis.fetch = async () => ++call === 1 ? Response.json(Array.from({length:100}, (_, i) => ({...base, order_id:'pack-' + String(i).padStart(4,'0')}))) : new Response('', {status:503});
  const { listConsultationPaymentOrders } = await import('./src/payment/order-store.ts');
  await assert.rejects(listConsultationPaymentOrders('owner'));
  assert.equal(call, 2);
`))

it('stops on a nonadvancing payment cursor instead of looping or duplicating grants', () => isolated(`
  const base = ${JSON.stringify(fixture)}; let call = 0;
  globalThis.fetch = async () => { call++; return Response.json(Array.from({length:100}, (_, i) => ({...base, order_id:'pack-' + String(i).padStart(4,'0')}))); };
  const { listConsultationPaymentOrders } = await import('./src/payment/order-store.ts');
  await assert.rejects(listConsultationPaymentOrders('owner'));
  assert.equal(call, 2);
`))

it('memory order discovery also preserves old packs behind more than 100 unrelated orders', () => isolated(`
  const { listConsultationPaymentOrders, savePaymentOrder } = await import('./src/payment/order-store.ts');
  const order = { orderId:'old-pack', ownerId:'owner', buyerEmail:'', buyerTel:'', productKey:'cheonmyeong_consultation', productTitle:'질문5회', amount:4900, status:'paid', tid:'synthetic', createdAt:'2026-10-01T00:00:00Z', updatedAt:'2026-10-01T00:00:00Z' };
  await savePaymentOrder(order);
  for (let i=0;i<150;i++) await savePaymentOrder({...order, orderId:'unrelated-'+i, productKey:'work_job'});
  await savePaymentOrder({...order, orderId:'other', ownerId:'other'});
  await savePaymentOrder({...order, orderId:'cancelled', status:'cancelled'});
  assert.deepEqual((await listConsultationPaymentOrders('owner')).map(o => o.orderId), ['old-pack']);
`, false))

it('historical TEST approval evidence cannot grant production credits even if test mode is requested', () => isolated(`
  process.env.NODE_ENV='production'; process.env.PAYMENT_TEST_MODE='true';
  const { validCreditOrder } = await import('./src/consultation/credits.ts');
  const order = {orderId:'pack', ownerId:'owner', productKey:'cheonmyeong_consultation', amount:4900, status:'paid', tid:'REAL-APPROVAL'};
  assert.equal(validCreditOrder(order, 'owner'), true);
  for (const patch of [{tid:'TEST-pack'}, {approvalCode:'TEST-0000'}, {payMethod:'TEST'}]) assert.equal(validCreditOrder({...order,...patch}, 'owner'), false);
  process.env.NODE_ENV='development';
  assert.equal(validCreditOrder({...order,tid:'TEST-pack'}, 'owner'), true);
  process.env.PAYMENT_TEST_MODE='false';
  assert.equal(validCreditOrder({...order,tid:'TEST-pack'}, 'owner'), false);
`, false))

it('insert-only REST checkout creation preserves approval during concurrent duplicate creation', () => isolated(`
  let row = null; let posts = 0;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input); assert.equal(url.origin, 'https://consultation-orders.invalid');
    if (init.method === 'POST') {
      assert.equal(new Headers(init.headers).get('prefer'), 'resolution=ignore-duplicates,return=representation');
      posts++;
      if (!row) { row = JSON.parse(init.body); return Response.json([row]); }
      // Approval wins while the second checkout creator is still in flight.
      row = {...row, status:'paid', tid:'REAL-APPROVED', revision:2};
      return Response.json([]);
    }
    assert.equal(url.searchParams.get('order_id'), 'eq.reserved');
    return Response.json(row ? [row] : []);
  };
  const store = await import('./src/payment/order-store.ts');
  const order = {orderId:'reserved', ownerId:'owner', buyerEmail:'', buyerTel:'', productKey:'cheonmyeong_consultation', productTitle:'질문5회', amount:4900, status:'ready', createdAt:'2026-10-01T00:00:00Z', updatedAt:'2026-10-01T00:00:00Z'};
  const [first, late] = await Promise.all([store.createConsultationPaymentOrder(order), store.createConsultationPaymentOrder(order)]);
  assert.equal(posts,2); assert.equal(first.status,'ready'); assert.equal(late.status,'paid');
  assert.equal((await store.getPaymentOrder(order.orderId)).tid, 'REAL-APPROVED');
  await assert.rejects(store.createConsultationPaymentOrder({...order,ownerId:'other'}), /CONSULTATION_ORDER_CONFLICT/);
`))

it('memory checkout creation preserves paid status and rejects mismatched or nonready creation', () => isolated(`
  const store = await import('./src/payment/order-store.ts');
  const order = {orderId:'reserved', ownerId:'owner', buyerEmail:'', buyerTel:'', productKey:'cheonmyeong_consultation', productTitle:'질문5회', amount:4900, status:'ready', createdAt:'2026-10-01T00:00:00Z', updatedAt:'2026-10-01T00:00:00Z'};
  const [first, second] = await Promise.all([store.createConsultationPaymentOrder(order), store.createConsultationPaymentOrder(order)]);
  assert.equal(first.orderId,second.orderId);
  await store.updatePaymentOrder(order.orderId,{status:'paid',tid:'REAL-APPROVED'});
  const late = await Promise.all([store.createConsultationPaymentOrder(order), store.createConsultationPaymentOrder(order)]);
  assert.ok(late.every(item => item.status === 'paid' && item.tid === 'REAL-APPROVED'));
  assert.equal((await store.getPaymentOrder(order.orderId)).status,'paid');
  await assert.rejects(store.createConsultationPaymentOrder({...order,ownerId:'other'}), /CONSULTATION_ORDER_CONFLICT/);
  for (const patch of [{amount:1}, {productKey:'other'}, {status:'paid'}, {tid:'TEST-fake'}]) await assert.rejects(store.createConsultationPaymentOrder({...order,...patch}), /CONSULTATION_ORDER_INVALID/);
`, false))
