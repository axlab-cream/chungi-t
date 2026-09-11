import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const fakeUrl = 'https://payment-order-test.invalid'
const secretKey = 'sb_secret_synthetic_payment_test'
const legacyKey = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"role":"service_role","ref":"synthetic-project"}').toString('base64url')}.synthetic_signature`

/** Fresh imports choose only fake configuration; no .env or real fetch is used. */
function isolatedStoreCheck(key: string, script: string): void {
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    globalThis.fetch = async () => { throw new Error('Unexpected external request'); };
    ${script}
  `], {
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    env: {
      ...process.env,
      NODE_ENV: 'test', DATABASE_URL: '', SUPABASE_URL: fakeUrl,
      NEXT_PUBLIC_SUPABASE_URL: '', VITE_SUPABASE_URL: '',
      SUPABASE_SERVICE_ROLE_KEY: key, SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_payment_test',
    },
    encoding: 'utf8', timeout: 15_000,
  })
  assert.equal(child.status, 0, child.stderr || child.stdout)
}

const fixture = {
  orderId: 'synthetic-order-a', ownerId: 'synthetic-owner-a', ownerEmail: 'a@example.invalid',
  buyerEmail: 'a@example.invalid', buyerTel: '010-0000-0000', productKey: 'work_job',
  productTitle: '합성 주문 검증', amount: 1, status: 'ready', reportId: 'synthetic-report-a',
  createdAt: '2026-09-07T00:00:00.000Z', updatedAt: '2026-09-07T00:00:00.000Z',
}

describe('payment order REST key-format compatibility (mock network only)', () => {
  for (const [name, key, bearer] of [['opaque secret', secretKey, false], ['legacy JWT', legacyKey, true]] as const) {
    it(`preserves insert/read/list/update behavior using ${name} headers`, () => {
      isolatedStoreCheck(key, `
        const rows = new Map(); const calls = [];
        globalThis.fetch = async (input, init = {}) => {
          const url = new URL(input);
          assert.equal(url.origin, ${JSON.stringify(fakeUrl)});
          assert.equal(url.pathname, '/rest/v1/cheongi_payment_orders');
          const headers = new Headers(init.headers);
          assert.equal(headers.get('apikey'), process.env.SUPABASE_SERVICE_ROLE_KEY);
          assert.equal(headers.get('authorization'), ${bearer} ? 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY : null);
          const method = init.method || 'GET';
          calls.push({ method, url });
          if (method === 'POST') {
            assert.equal(headers.get('prefer'), 'resolution=merge-duplicates,return=representation');
            const row = JSON.parse(init.body); rows.set(row.order_id, row);
            return Response.json([row]);
          }
          if (method === 'PATCH') {
            // 갱신은 CAS 다. PostgREST 는 필터에 맞는 행에만 적용하고, 맞는 행이 없으면
            // 빈 배열을 준다 — 그것이 "내가 읽은 판이 낡았다"는 신호다 (U17).
            assert.equal(headers.get('prefer'), 'return=representation');
            const orderFilter = url.searchParams.get('order_id');
            const revisionFilter = url.searchParams.get('revision');
            assert.ok(orderFilter && orderFilter.startsWith('eq.'), '주문 필터가 없다');
            assert.ok(revisionFilter && revisionFilter.startsWith('eq.'), 'revision 필터가 없다');
            const current = rows.get(orderFilter.slice(3));
            if (!current || String(current.revision ?? 0) !== revisionFilter.slice(3)) return Response.json([]);
            const row = JSON.parse(init.body); rows.set(row.order_id, row);
            return Response.json([row]);
          }
          assert.equal(method, 'GET'); assert.equal(url.searchParams.get('select'), '*');
          let found = [...rows.values()];
          for (const field of ['order_id', 'owner_id', 'report_id']) {
            const value = url.searchParams.get(field);
            if (value) { assert.ok(value.startsWith('eq.')); found = found.filter(row => row[field] === value.slice(3)); }
          }
          const limit = url.searchParams.get('limit');
          if (limit) found = found.slice(0, Number(limit));
          return Response.json(found);
        };
        const store = await import('./src/payment/order-store.ts');
        assert.equal(store.getPaymentStorageMode(), 'supabase');
        const original = ${JSON.stringify(fixture)};
        const saved = await store.savePaymentOrder(original);
        assert.equal(saved.orderId, original.orderId); assert.equal(saved.status, 'ready');
        assert.equal(original.updatedAt, '2026-09-07T00:00:00.000Z');
        assert.deepEqual(await store.getPaymentOrder(saved.orderId), saved);
        await store.savePaymentOrder({ ...original, orderId: 'synthetic-order-b', ownerId: 'synthetic-owner-b' });
        await store.savePaymentOrder({ ...original, orderId: 'synthetic-order-c', reportId: 'synthetic-report-c' });
        const listed = await store.listPaymentOrders(original.ownerId, 500, original.reportId);
        assert.deepEqual(listed.map(order => order.orderId), [original.orderId]);
        const listCall = calls.at(-1);
        assert.equal(listCall.url.searchParams.get('owner_id'), 'eq.' + original.ownerId);
        assert.equal(listCall.url.searchParams.get('report_id'), 'eq.' + original.reportId);
        assert.equal(listCall.url.searchParams.get('limit'), '100');
        assert.equal(listCall.url.searchParams.get('order'), 'updated_at.desc');
        const updated = await store.updatePaymentOrder(original.orderId, { status: 'paid', tid: 'synthetic-tid', ownerId: 'must-not-change', orderId: 'must-not-change' });
        assert.equal(updated.status, 'paid'); assert.equal(updated.tid, 'synthetic-tid');
        assert.equal(updated.ownerId, original.ownerId); assert.equal(updated.orderId, original.orderId);
        assert.equal(updated.createdAt, original.createdAt);
        assert.equal(await store.getPaymentOrder('missing-synthetic-order'), null);
        const count = calls.length;
        assert.equal(await store.updatePaymentOrder('missing-synthetic-order', { status: 'failed' }), null);
        assert.equal(calls.length, count + 1);
        assert.deepEqual([...new Set(calls.map(call => call.method))].sort(), ['GET', 'PATCH', 'POST']);
        // 갱신은 자기가 읽은 판에만 적용된다. revision 이 올라갔는지 확인한다.
        assert.equal(updated.revision, 1);
        const patchCall = calls.filter(call => call.method === 'PATCH').at(-1);
        assert.equal(patchCall.url.searchParams.get('revision'), 'eq.0');
      `)
    })

    it(`does not retry rejected ${name} credentials with a different key or user JWT`, () => {
      isolatedStoreCheck(key, `
        let calls = 0;
        globalThis.fetch = async (input, init = {}) => {
          assert.equal(new URL(input).origin, ${JSON.stringify(fakeUrl)});
          const headers = new Headers(init.headers);
          assert.equal(headers.get('apikey'), process.env.SUPABASE_SERVICE_ROLE_KEY);
          assert.equal(headers.get('authorization'), ${bearer} ? 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY : null);
          calls += 1;
          return new Response('PRIVATE synthetic server error', { status: 401 });
        };
        const store = await import('./src/payment/order-store.ts');
        await assert.rejects(store.getPaymentOrder('synthetic-order'), /^Error: 결제 주문 조회에 실패했습니다\.$/);
        await assert.rejects(store.listPaymentOrders('synthetic-owner'), /^Error: 결제 내역 조회에 실패했습니다\.$/);
        await assert.rejects(store.savePaymentOrder(${JSON.stringify(fixture)}), /^Error: 결제 주문 저장에 실패했습니다\.$/);
        assert.equal(calls, 3);
      `)
    })
  }

  it('does not send an unknown non-JWT key as Bearer', () => {
    isolatedStoreCheck('synthetic-unknown-key', `
      globalThis.fetch = async (input, init) => {
        assert.equal(new URL(input).origin, ${JSON.stringify(fakeUrl)});
        const headers = new Headers(init.headers);
        assert.equal(headers.get('apikey'), 'synthetic-unknown-key'); assert.equal(headers.has('authorization'), false);
        return Response.json([]);
      };
      const store = await import('./src/payment/order-store.ts');
      assert.equal(await store.getPaymentOrder('missing-synthetic-order'), null);
    `)
  })
})
